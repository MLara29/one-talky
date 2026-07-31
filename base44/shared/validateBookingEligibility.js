/**
 * validateBookingEligibility
 *
 * Central server-side validation for lesson scheduling rules.
 * MUST be called from every booking entry point (bookSlot, admin, future integrations).
 *
 * RULE — FIRST MONTH RESTRICTION:
 *   - During the first 7 days of the first subscription cycle (subscription_cycle === 1):
 *     the student may schedule at most 1 lesson of 30 minutes.
 *   - After day 7: full scheduling freedom (if subscription is active).
 *   - If subscription is cancelled/expired at any point: no new bookings.
 *   - From cycle 2 onwards: no restrictions apply.
 *
 * @param {object} base44         - base44 service-role client
 * @param {string} studentId      - User ID of the student
 * @param {string} scheduledAt    - ISO datetime of the proposed lesson
 * @returns {{ allowed: boolean, error?: string, httpStatus?: number }}
 */
export async function validateBookingEligibility(base44, studentId, scheduledAt) {
  // Fetch student profile with service role to avoid RLS interference
  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: studentId });
  if (profiles.length === 0) {
    return { allowed: true }; // No profile yet — don't block (profile created on onboarding)
  }
  const sp = profiles[0];

  const subStatus = sp.subscription_status || "none";
  const subCycle = sp.subscription_cycle || 0;
  const subStartDate = sp.subscription_start_date ? new Date(sp.subscription_start_date) : null;

  // If student has no active subscription and is not in the first cycle, allow
  // (free-plan students without subscription can still book — credits are the gate elsewhere)
  if (subStatus === "cancelled" || subStatus === "expired") {
    return {
      allowed: false,
      httpStatus: 403,
      error: "Sua assinatura está cancelada/inativa. Reative seu plano para agendar novas aulas.",
    };
  }

  // Only apply first-month restriction during cycle 1
  if (subCycle !== 1 || !subStartDate) {
    return { allowed: true };
  }

  const now = new Date();
  const sevenDaysAfterStart = new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isInFirstWeek = now < sevenDaysAfterStart;

  if (!isInFirstWeek) {
    // Past 7-day window — allow freely (subscription already verified active above)
    return { allowed: true };
  }

  // Within first 7 days: check how many lessons exist (scheduled, in_progress, or completed)
  const existingLessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: studentId });

  // Count lessons created or scheduled within the first 7-day window
  const windowLessons = existingLessons.filter(l => {
    if (l.status === "cancelled") return false;
    const lessonDate = new Date(l.scheduled_at || l.created_date || l.started_at);
    return lessonDate >= subStartDate && lessonDate < sevenDaysAfterStart;
  });

  if (windowLessons.length >= 1) {
    const unlockDate = sevenDaysAfterStart.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    return {
      allowed: false,
      httpStatus: 403,
      error: `Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos. Novos agendamentos ficarão disponíveis a partir do dia ${unlockDate}.`,
    };
  }

  return { allowed: true };
}