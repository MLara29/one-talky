import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { getBonusExpiryDays, getDiscountCycles } from "../../shared/studentCredits.js";

const VALID_LEVELS = ["beginner", "intermediate", "advanced"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { profile, coupon_code } = await req.json();
    if (!profile) return Response.json({ error: "profile required" }, { status: 400 });

    // Validate level
    if (!VALID_LEVELS.includes(profile.level)) {
      return Response.json({ error: "Invalid level" }, { status: 400 });
    }

    // Prevent creating a duplicate profile
    const existing = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (existing.length > 0) {
      return Response.json({ error: "Profile already exists" }, { status: 409 });
    }

    // Resolve coupon bonus server-side — never trust client-supplied credits
    let freeCredits = 0;
    let couponRecord = null;
    if (coupon_code) {
      const coupons = await base44.asServiceRole.entities.Coupon.filter({
        code: String(coupon_code).toUpperCase(),
        is_active: true,
      });
      const coupon = coupons[0];
      // Validade geral do cupom — mesma checagem usada nas compras (Stripe e
      // Mercado Pago, via couponDiscount.js). Sem ela, um cupom vencido ainda
      // funcionaria pra sempre se usado no cadastro, mesmo já esgotado por data.
      const isExpired = coupon?.expires_at && new Date() > new Date(coupon.expires_at + "T23:59:59");
      if (coupon && !isExpired && (coupon.used_count || 0) < (coupon.max_uses || 100)) {
        // Reserva a vaga ATOMICAMENTE (CAS) antes de conceder qualquer bônus —
        // evita que vários cadastros simultâneos usando o mesmo cupom
        // ultrapassem o limite de usos configurado. Mesma técnica já usada
        // em stripeWebhook.js e mpProcessPayment.js pro mesmo contador.
        const cas = await base44.asServiceRole.entities.Coupon.updateMany(
          { id: coupon.id, used_count: coupon.used_count },
          { $set: { used_count: (coupon.used_count || 0) + 1 } }
        );
        if (cas.updated > 0) {
          couponRecord = coupon;

          // Limite separado de bônus (max_bonus_uses): mesmo dentro do limite
          // geral do cupom, pode existir um teto MENOR só pra quantos
          // cadastros ganham os minutos grátis. Atingido esse teto, o cupom
          // continua válido normalmente (desconto em compras futuras, se
          // tiver), só não concede minutos nesse cadastro. Mesma proteção
          // atômica (CAS) usada acima pro used_count geral.
          const hasBonusToGrant = (coupon.credits_minutes || 0) > 0;
          let bonusAllowed = hasBonusToGrant;
          if (hasBonusToGrant && coupon.max_bonus_uses) {
            const currentBonusCount = coupon.bonus_used_count || 0;
            if (currentBonusCount >= coupon.max_bonus_uses) {
              bonusAllowed = false;
            } else {
              const bonusCas = await base44.asServiceRole.entities.Coupon.updateMany(
                { id: coupon.id, bonus_used_count: currentBonusCount },
                { $set: { bonus_used_count: currentBonusCount + 1 } }
              );
              bonusAllowed = bonusCas.updated > 0;
              if (!bonusAllowed) {
                console.warn(`[createStudentProfile] CAS mismatch on Coupon.bonus_used_count for ${coupon.code} — concurrent redemption, bonus not granted for this signup.`);
              }
            }
          } else if (hasBonusToGrant) {
            // Sem limite separado configurado — ainda assim conta pro histórico.
            await base44.asServiceRole.entities.Coupon.update(coupon.id, {
              bonus_used_count: (coupon.bonus_used_count || 0) + 1,
            });
          }

          freeCredits = bonusAllowed ? (coupon.credits_minutes ?? 0) : 0;
        } else {
          console.warn(`[createStudentProfile] CAS mismatch on Coupon.used_count for ${coupon.code} — concurrent redemption, bonus not granted for this signup.`);
        }
      }
    }

    // Route coupon bonus minutes to prepaid_credits_minutes with the coupon's
    // specific expiry (based on discount_type). Create a CouponUsage record to
    // track the discount cycles + bonus expiry.
    const bonusExpiryDays = couponRecord ? getBonusExpiryDays(couponRecord.discount_type || "none") : 30;
    const prepaidExpiresAt = freeCredits > 0
      ? new Date(Date.now() + bonusExpiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const created = await base44.asServiceRole.entities.StudentProfile.create({
      user_id: user.id,
      full_name: String(profile.full_name || "").slice(0, 200),
      nationality: String(profile.nationality || "").slice(0, 100),
      native_language: String(profile.native_language || "").slice(0, 50),
      target_language: String(profile.target_language || "").slice(0, 50),
      level: profile.level,
      objective: String(profile.objective || "").slice(0, 200),
      accent_preference: String(profile.accent_preference || "").slice(0, 100),
      conversation_topics: Array.isArray(profile.conversation_topics) ? profile.conversation_topics.slice(0, 30) : [],
      plan_credits_minutes: 0,
      prepaid_credits_minutes: freeCredits,
      // Teto de referência (100%) da barra visual — precisa ser gravado aqui
      // também, não só nas compras (computeCreditUpdate). Sem isso, a tela
      // cai no modo de segurança que usa o saldo ATUAL como teto, fazendo o
      // 100% "andar junto" com o saldo a cada minuto gasto — exatamente o
      // bug reportado.
      prepaid_credits_ceiling: freeCredits,
      prepaid_expires_at: prepaidExpiresAt,
      credits_minutes: freeCredits,
      plan: "free",
      ...(couponRecord ? { coupon_code: couponRecord.code } : {}),
    });

    // Create CouponUsage record for the onboarding coupon (tracks discount cycles + bonus expiry).
    if (couponRecord && freeCredits > 0) {
      await base44.asServiceRole.entities.CouponUsage.create({
        student_id: user.id,
        coupon_code: couponRecord.code,
        discount_cycles_remaining: getDiscountCycles(couponRecord.discount_type || "none"),
        bonus_minutes_expires_at: prepaidExpiresAt,
        created_at: new Date().toISOString(),
      });
    }

    // Record affiliate earning if applicable — o incremento de used_count já
    // aconteceu de forma atômica (CAS) lá em cima, antes do bônus ser concedido.
    if (couponRecord) {
      if (couponRecord.affiliate_id) {
        // Guard: one use per student
        const alreadyUsed = await base44.asServiceRole.entities.AffiliateEarning.filter({
          student_id: user.id,
          coupon_code: couponRecord.code,
        });
        if (alreadyUsed.length === 0) {
          await base44.asServiceRole.entities.AffiliateEarning.create({
            affiliate_id: couponRecord.affiliate_id,
            student_id: user.id,
            student_name: profile.full_name || user.email,
            coupon_code: couponRecord.code,
            plan_id: "onboarding_bonus",
            sale_amount: 0,
            commission_percent: 0,
            commission_amount: 0,
            payment_id: `onboarding_${user.id}`,
            sale_date: new Date().toISOString(),
            status: "liberado",
          });
        }
      }
    }

    return Response.json({ success: true, profile_id: created.id, credits_minutes: freeCredits });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});