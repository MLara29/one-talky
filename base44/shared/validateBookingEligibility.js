/**
 * validateBookingEligibility
 *
 * Central server-side validation for lesson scheduling rules.
 * MUST be called from every booking entry point (bookSlot, admin, future integrations).
 *
 * RULES:
 *
 * 1. subscription_status = "none" → BLOCKED (no active subscription)
 * 2. subscription_status = "cancelled" or "expired":
 *    - If subscription_valid_until is set and still in the future → ALLOWED (paid period not over)
 *    - Otherwise → BLOCKED
 * 3. subscription_status = "active", cycle = 1, within first 7 days:
 *    - Max 1 lesson, max 30 minutes. Beyond that → BLOCKED.
 * 4. All other active cases → ALLOWED.
 *
 * Cancellation policy (set by payment webhook / admin):
 *   - Cancelled within 7 days of first cycle → immediate block (subscription_valid_until = null)
 *   - Cancelled after 7 days → access until subscription_valid_until (end of paid billing period)
 *
 * @param {object} base44           - base44 service-role client
 * @param {string} studentId        - User ID of the student
 * @param {string} scheduledAt      - ISO datetime of the proposed lesson
 * @param {number} [durationMinutes] - Duration of the lesson in minutes (required for cycle-1 window check)
 * @returns {{ allowed: boolean, error?: string, httpStatus?: number }}
 */
export async function validateBookingEligibility(base44, studentId, scheduledAt, durationMinutes) {
  // Fetch student profile with service role to avoid RLS interference
  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: studentId });
  if (profiles.length === 0) {
    // No profile yet — don't block (profile created on onboarding)
    return { allowed: true };
  }
  const sp = profiles[0];

  const subStatus = sp.subscription_status || "none";
  const subCycle = sp.subscription_cycle || 0;
  const subStartDate = sp.subscription_start_date ? new Date(sp.subscription_start_date) : null;
  const subValidUntil = sp.subscription_valid_until ? new Date(sp.subscription_valid_until) : null;

  // ── RULE 1: No subscription at all — but allow if the student has standalone credits ──
  if (subStatus === "none" || subCycle === 0) {
    const credits = (sp.plan_credits_minutes || 0) + (sp.prepaid_credits_minutes || 0);
    if (credits <= 0) {
      console.log(`[validateBookingEligibility] BLOCKED student=${studentId} reason=no_active_subscription status=${subStatus}`);
      return {
        allowed: false,
        httpStatus: 403,
        error_code: "insufficient_credits",
        error: "Você não possui minutos disponíveis. Assine um plano ou adicione créditos para agendar aulas.",
      };
    }
    // Fall through to RULE 1.5 and remaining checks — don't early-return.
  }

  // ── RULE 2: Cancelled or expired — check if still within paid period ──
  if (subStatus === "cancelled" || subStatus === "expired") {
    if (subValidUntil && new Date() < subValidUntil) {
      // Still within paid billing period — allow scheduling (credits are the gate)
      // Fall through to further checks below
    } else {
      console.log(`[validateBookingEligibility] BLOCKED student=${studentId} reason=subscription_${subStatus} valid_until=${subValidUntil?.toISOString() || "none"}`);
      return {
        allowed: false,
        httpStatus: 403,
        error_code: "subscription_inactive",
        error: "Sua assinatura está cancelada/inativa. Reative seu plano para agendar novas aulas.",
      };
    }
  }

  // ── RULE 3: First-month (cycle 1) restriction within first 7 days ──
  if (subCycle === 1 && subStartDate) {
    const now = new Date();
    const sevenDaysAfterStart = new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isInFirstWeek = now < sevenDaysAfterStart;

    if (isInFirstWeek) {
      // Check duration: must be exactly 30 minutes in the first week.
      // Treat missing/null/0 as a violation — no silent pass-through.
      if (durationMinutes !== 30) {
        console.log(`[validateBookingEligibility] BLOCKED student=${studentId} reason=first_week_wrong_duration duration=${durationMinutes ?? "undefined"}`);
        return {
          allowed: false,
          httpStatus: 403,
          error_code: "first_week_wrong_duration",
          error: "Durante os primeiros 7 dias da sua assinatura, a aula deve ter 30 minutos.",
        };
      }

      const unlockDate = sevenDaysAfterStart.toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric"
      });
      const blockedError = {
        allowed: false,
        httpStatus: 403,
        error_code: "first_week_limit",
        error: `Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos. Novos agendamentos ficarão disponíveis a partir do dia ${unlockDate}.`,
      };

      // Fast-path: CAS lock field already set
      if (sp.first_week_lesson_id) {
        const isPending = sp.first_week_lesson_id.startsWith('__pending__:');

        if (!isPending) {
          // A real lesson ID is committed — hard block.
          console.log(`[validateBookingEligibility] BLOCKED student=${studentId} reason=first_week_lock_committed lesson_id=${sp.first_week_lesson_id}`);
          return blockedError;
        }

        // Pending token: check TTL — stale = orphan, let bookSlot overwrite via exact-token CAS.
        const CAS_LOCK_TTL_MS = 90_000;
        const lockAge = sp.first_week_lock_at
          ? Date.now() - new Date(sp.first_week_lock_at).getTime()
          : CAS_LOCK_TTL_MS + 1;
        if (lockAge < CAS_LOCK_TTL_MS) {
          console.log(`[validateBookingEligibility] BLOCKED student=${studentId} reason=first_week_lock_pending age_ms=${lockAge}`);
          return blockedError;
        }
        // Stale pending lock — fall through to count check; bookSlot will overwrite it.
        console.log(`[validateBookingEligibility] INFO student=${studentId} stale pending lock (age_ms=${lockAge}) — passing through`);
      }

      // Fallback count check (catches records created before this field existed)
      const existingLessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: studentId });
      const windowLessons = existingLessons.filter(l => {
        if (l.status === "cancelled") return false;
        const lessonDate = new Date(l.scheduled_at || l.created_date || l.started_at);
        return lessonDate >= subStartDate && lessonDate < sevenDaysAfterStart;
      });

      if (windowLessons.length >= 1) {
        console.log(`[validateBookingEligibility] BLOCKED student=${studentId} reason=first_week_lesson_limit count=${windowLessons.length}`);
        return blockedError;
      }
    }
  }

  // ── RULE 1.5: Não permitir agendar além do saldo disponível ──
  // Conta os minutos já comprometidos em aulas ativas (scheduled/in_progress)
  // contra o saldo atual. Sem isso, o aluno pode agendar mais aulas do que o
  // plano cobre, já que o débito só acontece quando a aula termina.
  const activeLessons = await base44.asServiceRole.entities.Lesson.filter({
    student_id: studentId,
    status: { $in: ["scheduled", "in_progress"] },
  });
  const alreadyReservedMinutes = activeLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
  const availableCredits = (sp.plan_credits_minutes || 0) + (sp.prepaid_credits_minutes || 0);
  const newTotal = alreadyReservedMinutes + (durationMinutes || 30);

  if (newTotal > availableCredits) {
    console.log(`[validateBookingEligibility] BLOCKED student=${studentId} reason=insufficient_credits_for_booking reserved=${alreadyReservedMinutes} available=${availableCredits}`);
    return {
      allowed: false,
      httpStatus: 403,
      error_code: "insufficient_credits_for_booking",
      error: `Você já tem aulas agendadas usando todo o seu saldo disponível (${availableCredits} minutos). Cancele uma aula existente ou adicione mais créditos para agendar outra.`,
    };
  }

  return { allowed: true };
}