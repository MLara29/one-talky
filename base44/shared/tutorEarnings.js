// Server-side, tamper-proof calculation of a tutor's unpaid earnings.
// Mirrors the logic previously duplicated in AdminEarnings.jsx / TutorEarnings.jsx,
// now computed exclusively from DB state (never trusts a client-supplied amount).
export async function computeTutorEarned(base44, tutorUserId, ratePerMinute) {
  const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ tutor_id: tutorUserId }, "-created_date", 200);
  const confirmed = withdrawals.filter(w => w.tutor_confirmed);
  const last = confirmed.sort((a, b) => new Date(b.confirmed_at || b.created_date) - new Date(a.confirmed_at || a.created_date))[0];
  const cutoff = last ? new Date(last.confirmed_at || last.created_date) : null;

  const lessons = await base44.asServiceRole.entities.Lesson.filter({ tutor_id: tutorUserId, status: "completed" }, "-created_date", 500);
  const unpaid = lessons.filter(l => {
    if (!cutoff) return true;
    const d = new Date(l.ended_at || l.updated_date || l.created_date);
    return d > cutoff;
  });

  const earned = unpaid.reduce((sum, l) => sum + (l.duration_minutes || 0) * (ratePerMinute || 0), 0);
  return { earned, withdrawals };
}

export function parsePioneerEmail(bankInfo) {
  try { return JSON.parse(bankInfo || "{}").pioneer_email || null; } catch { return null; }
}