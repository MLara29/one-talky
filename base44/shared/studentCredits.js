// Shared student credit logic: routing (plan vs prepaid) on purchase, and
// debiting (plan first, prepaid last) on lesson consumption.
//
// Used by all payment confirmation points (mpProcessPayment, mpConfirmPayment,
// mpCheckPixStatus, stripeWebhook) and all lesson consumption points
// (completeLesson, processNoShow).

// ── Constants ──────────────────────────────────────────────────────────────

const PREPAID_EXPIRY_DAYS = 30;
const PLAN_GRACE_EXPIRY_DAYS = 30;

// Round to 2 decimal places (centi-minutes). Used after every credit
// addition/subtraction so floating-point artifacts (e.g. 159.42000000000002)
// never accumulate in the database. The stored value is always a clean
// multiple of 0.01 — effectively an integer number of centi-minutes.
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Discount type → number of billing cycles the discount applies for.
const DISCOUNT_CYCLES_BY_TYPE = {
  none: 0,
  first_month: 1,
  period: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

// Discount type → how many days the coupon's bonus minutes stay valid.
const BONUS_EXPIRY_DAYS_BY_TYPE = {
  none: 30,
  first_month: 30,
  period: 30,
  bimestral: 60,
  trimestral: 90,
  semestral: 180,
  anual: 365,
};

export function getDiscountCycles(discountType) {
  return DISCOUNT_CYCLES_BY_TYPE[discountType] ?? 0;
}

export function getBonusExpiryDays(discountType) {
  return BONUS_EXPIRY_DAYS_BY_TYPE[discountType] ?? 30;
}

export function getPrepaidExpiryDays() {
  return PREPAID_EXPIRY_DAYS;
}

export function getPlanGraceExpiryDays() {
  return PLAN_GRACE_EXPIRY_DAYS;
}

// ── Credit routing on purchase ────────────────────────────────────────────

// Computes the StudentProfile update data for a confirmed payment, routing
// minutes to plan_credits_minutes or prepaid_credits_minutes based on the
// external_reference prefix, and handling coupon bonus minutes with their
// own expiry via CouponUsage tracking.
//
// Does NOT apply the update — the caller does that. Returns the updateData
// object to merge with any other fields the caller needs to set.
//
// @param {object} base44            - base44 service-role client
// @param {object} opts
// @param {object} opts.profile       - current StudentProfile record
// @param {string} opts.externalReference - "plan:standard" | "pack:pp_60" | ...
// @param {object} opts.item          - catalog item { minutes, plan, ... }
// @param {string} opts.couponCode    - coupon code (or "")
// @param {number} opts.bonusMinutes  - bonus minutes from validateAndApplyCoupon
// @param {object} opts.appliedCoupon - Coupon record (null if no coupon)
// @param {boolean} opts.isRenewal    - true for Stripe invoice.paid cycle 2+
// @returns {Promise<object>} updateData for StudentProfile.update
export async function computeCreditUpdate(base44, {
  profile,
  externalReference,
  item,
  couponCode,
  bonusMinutes,
  appliedCoupon,
  isRenewal = false,
}) {
  const isPlan = externalReference.startsWith("plan:");
  const isPack = externalReference.startsWith("pack:");
  const now = new Date();
  const updateData = {};

  // ── Route purchased minutes ──
  if (isPlan) {
    updateData.plan_credits_minutes = round2((profile.plan_credits_minutes ?? 0) + item.minutes);
    // plan_credits_grace_expires_at stays null while subscription is active.
  } else if (isPack) {
    updateData.prepaid_credits_minutes = round2((profile.prepaid_credits_minutes ?? 0) + item.minutes);
    // Reset prepaid expiry to now + 60 days, always (reinicia o prazo para todo o saldo).
    updateData.prepaid_expires_at = new Date(
      now.getTime() + PREPAID_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  // ── Coupon bonus minutes + discount cycle tracking ──
  const hasCoupon = couponCode && appliedCoupon;
  const hasBonus = bonusMinutes > 0;
  const hasDiscount = appliedCoupon && (appliedCoupon.discount_percent || 0) > 0;

  if (hasCoupon && (hasBonus || hasDiscount)) {
    const code = String(couponCode).toUpperCase();
    const usageRecords = await base44.asServiceRole.entities.CouponUsage.filter({
      student_id: profile.user_id,
      coupon_code: code,
    });
    let usage = usageRecords[0];
    // Captura ANTES de criar o registro — é essa flag que decide se os
    // minutos de bônus podem ser concedidos (só na primeira vez de verdade).
    // Cobre tanto "cupom já usado no cadastro" quanto "cupom já usado numa
    // compra anterior" — qualquer registro de uso pré-existente bloqueia um
    // novo bônus, evitando a duplicação de minutos grátis.
    const isFirstUseOfCoupon = !usage;

    if (!usage) {
      // First time — create with cycles + bonus expiry based on discount_type.
      const discountType = appliedCoupon.discount_type || "none";
      const cycles = getDiscountCycles(discountType);
      const bonusExpiryDays = getBonusExpiryDays(discountType);
      const bonusExpiresAt = new Date(
        now.getTime() + bonusExpiryDays * 24 * 60 * 60 * 1000
      ).toISOString();

      usage = await base44.asServiceRole.entities.CouponUsage.create({
        student_id: profile.user_id,
        coupon_code: code,
        discount_cycles_remaining: cycles,
        bonus_minutes_expires_at: bonusExpiresAt,
        created_at: now.toISOString(),
      });
    }

    // Decrement discount_cycles_remaining on a charge where the discount was
    // applied (first purchase or renewal within the discount window). On
    // renewals where the discount is no longer active (cycles=0), skip.
    if (!isRenewal && usage.discount_cycles_remaining > 0) {
      await base44.asServiceRole.entities.CouponUsage.update(usage.id, {
        discount_cycles_remaining: usage.discount_cycles_remaining - 1,
      });
    }

    // Add bonus minutes to prepaid with the coupon's specific expiry — só na
    // primeira vez que esse cupom é usado por esse aluno (cadastro OU compra,
    // o que vier primeiro). Sem essa checagem, um aluno que já ganhou o bônus
    // no cadastro ganhava ele de novo ao usar o mesmo cupom numa assinatura.
    //
    // Limite separado de bônus (max_bonus_uses): mesmo dentro do limite geral
    // de usos do cupom (max_uses), pode existir um teto MENOR só pra quantos
    // ganham os minutos — atingido esse teto, o cupom continua válido pro
    // desconto normalmente, só para de conceder minutos. Reserva a vaga do
    // bônus de forma atômica (CAS), mesma técnica já usada pro used_count —
    // evita conceder bônus além do limite configurado em caso de simultaneidade.
    let bonusAllowed = hasBonus && isFirstUseOfCoupon;
    if (bonusAllowed && appliedCoupon.max_bonus_uses) {
      const currentBonusCount = appliedCoupon.bonus_used_count || 0;
      if (currentBonusCount >= appliedCoupon.max_bonus_uses) {
        bonusAllowed = false;
      } else {
        const bonusCas = await base44.asServiceRole.entities.Coupon.updateMany(
          { id: appliedCoupon.id, bonus_used_count: currentBonusCount },
          { $set: { bonus_used_count: currentBonusCount + 1 } }
        );
        if (bonusCas.updated === 0) {
          console.warn(`[computeCreditUpdate] CAS mismatch on Coupon.bonus_used_count for ${code} — concurrent redemption, bonus not granted this time.`);
          bonusAllowed = false;
        }
      }
    } else if (bonusAllowed) {
      // Sem limite separado configurado — ainda assim conta pro histórico,
      // sem CAS (não há teto pra proteger aqui).
      await base44.asServiceRole.entities.Coupon.update(appliedCoupon.id, {
        bonus_used_count: (appliedCoupon.bonus_used_count || 0) + 1,
      });
    }

    if (bonusAllowed) {
      const bonusExpiry = usage.bonus_minutes_expires_at
        ? new Date(usage.bonus_minutes_expires_at)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const currentPrepaidInUpdate = updateData.prepaid_credits_minutes ?? null;
      const newPrepaidTotal = round2((currentPrepaidInUpdate ?? profile.prepaid_credits_minutes ?? 0) + bonusMinutes);
      updateData.prepaid_credits_minutes = newPrepaidTotal;

      // Set prepaid_expires_at to the LATER of (current/new pack expiry, bonus
      // expiry) so neither set of minutes is prematurely expired. With a single
      // prepaid_expires_at field we can't track per-lot expiry, so we take the
      // most generous (latest) date.
      const packExpiryCandidate = updateData.prepaid_expires_at
        ? new Date(updateData.prepaid_expires_at)
        : (profile.prepaid_expires_at ? new Date(profile.prepaid_expires_at) : null);

      const laterExpiry = packExpiryCandidate && packExpiryCandidate > bonusExpiry
        ? packExpiryCandidate
        : bonusExpiry;
      updateData.prepaid_expires_at = laterExpiry.toISOString();
    }
  }

  // ── Keep deprecated credits_minutes in sync as the sum during transition ──
  const finalPlan = updateData.plan_credits_minutes ?? (profile.plan_credits_minutes ?? 0);
  const finalPrepaid = updateData.prepaid_credits_minutes ?? (profile.prepaid_credits_minutes ?? 0);
  const finalAdminGift = profile.admin_gift_minutes ?? 0; // purchases never modify admin_gift
  updateData.credits_minutes = Math.round((finalPlan + finalPrepaid + finalAdminGift) * 100) / 100;

  // Teto de referência (100%) da barra visual de minutos avulsos no dashboard
  // do aluno. Sempre que o saldo avulso aumenta (pacote novo ou bônus de
  // cupom), o teto sobe junto — fica fixo enquanto o aluno só usa, e sobe de
  // novo na próxima compra. Só atualiza aqui, nunca no débito de aula.
  if (updateData.prepaid_credits_minutes !== undefined) {
    updateData.prepaid_credits_ceiling = Math.round(updateData.prepaid_credits_minutes * 100) / 100;
  }

  return updateData;
}

// ── Credit debit on lesson consumption ─────────────────────────────────────

// Debits student credits: plan credits first, prepaid credits last.
// Returns the new values for plan_credits_minutes and prepaid_credits_minutes
// (rounded to 2 decimals), suitable for a StudentProfile.update call.
//
// @param {object} sp               - StudentProfile record
// @param {number} durationMinutes  - minutes to debit
// @returns {{ plan_credits_minutes: number, prepaid_credits_minutes: number }}
export function debitStudentCredits(sp, durationMinutes) {
  let remaining = durationMinutes;
  // Admin gift is consumed first (shortest expiry, incentive to use ASAP),
  // then plan credits, then prepaid credits last.
  const fromAdminGift = Math.min(sp.admin_gift_minutes || 0, remaining);
  remaining -= fromAdminGift;
  const fromPlan = Math.min(sp.plan_credits_minutes || 0, remaining);
  remaining -= fromPlan;
  const fromPrepaid = Math.min(sp.prepaid_credits_minutes || 0, remaining);
  remaining -= fromPrepaid;

  const newAdminGift = Math.max(0, Math.round(((sp.admin_gift_minutes || 0) - fromAdminGift) * 100) / 100);
  const newPlan = Math.max(0, Math.round(((sp.plan_credits_minutes || 0) - fromPlan) * 100) / 100);
  const newPrepaid = Math.max(0, Math.round(((sp.prepaid_credits_minutes || 0) - fromPrepaid) * 100) / 100);

  return {
    admin_gift_minutes: newAdminGift,
    plan_credits_minutes: newPlan,
    prepaid_credits_minutes: newPrepaid,
    // Keep deprecated credits_minutes in sync during transition.
    credits_minutes: Math.round((newAdminGift + newPlan + newPrepaid) * 100) / 100,
  };
}