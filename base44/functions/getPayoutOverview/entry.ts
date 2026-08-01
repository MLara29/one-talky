import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from "../../shared/requireOtp.js";
import { computeTutorEarned } from "../../shared/tutorEarnings.js";
import { isDueForPayout } from "../../shared/payoutDue.js";

// Admin-only: groups approved tutors with an outstanding, due balance into
// three lists by their chosen payout_frequency (weekly/biweekly/monthly).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const tutors = await base44.asServiceRole.entities.TutorProfile.filter({ status: "approved" }, "-total_earnings", 500);

    const groups = { weekly: [], biweekly: [], monthly: [] };

    for (const tutor of tutors) {
      const { earned, withdrawals } = await computeTutorEarned(base44, tutor.user_id);
      if (earned <= 0) continue;

      const confirmed = withdrawals.filter(w => w.tutor_confirmed);
      const last = confirmed.sort((a, b) => new Date(b.confirmed_at || b.created_date) - new Date(a.confirmed_at || a.created_date))[0];
      const lastConfirmedAt = last ? (last.confirmed_at || last.created_date) : null;

      const frequency = tutor.payout_frequency || "weekly";
      if (!isDueForPayout(frequency, lastConfirmedAt)) continue;

      const daysSincePaid = lastConfirmedAt
        ? Math.floor((Date.now() - new Date(lastConfirmedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const entry = {
        user_id: tutor.user_id,
        full_name: tutor.full_name,
        photo_url: tutor.photo_url,
        contract_type: tutor.contract_type,
        earned,
        days_since_paid: daysSincePaid,
      };

      if (groups[frequency]) groups[frequency].push(entry);
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => b.earned - a.earned);
    }

    return Response.json({ success: true, groups });
  } catch (error) {
    console.error('[getPayoutOverview]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});