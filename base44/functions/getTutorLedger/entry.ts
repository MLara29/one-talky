import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from "../../shared/requireOtp.js";

// Admin-only: full lesson history for a single tutor, with an optional
// custom date range — used for the earnings ledger / dispute investigation.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { tutor_user_id, start_date, end_date } = await req.json();
    if (!tutor_user_id) return Response.json({ error: "tutor_user_id required" }, { status: 400 });

    // Fetch ALL lessons for the tutor (not just completed/no_show — include
    // cancelled too, for a complete view in case of a dispute)
    let lessons = await base44.asServiceRole.entities.Lesson.filter(
      { tutor_id: tutor_user_id }, "-scheduled_at", 1000
    );

    const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3 (Brasília, no DST since 2019)

    if (start_date) {
      const start = new Date(start_date).getTime() + TZ_OFFSET_MS;
      lessons = lessons.filter(l => new Date(l.scheduled_at || l.created_date).getTime() >= start);
    }
    if (end_date) {
      const end = new Date(end_date).getTime() + TZ_OFFSET_MS + 24 * 60 * 60 * 1000; // include the full end day
      lessons = lessons.filter(l => new Date(l.scheduled_at || l.created_date).getTime() < end);
    }

    const summary = {
      total_lessons: lessons.length,
      completed_count: lessons.filter(l => l.status === "completed").length,
      no_show_count: lessons.filter(l => l.status === "no_show").length,
      cancelled_count: lessons.filter(l => l.status === "cancelled").length,
      total_minutes: lessons.reduce((s, l) => s + (["completed", "no_show"].includes(l.status) ? (l.duration_minutes || 0) : 0), 0),
      total_earned: lessons.reduce((s, l) => s + (l.earned_amount || 0), 0),
    };

    return Response.json({
      success: true,
      summary,
      lessons: lessons.map(l => ({
        id: l.id, student_name: l.student_name, scheduled_at: l.scheduled_at,
        status: l.status, duration_minutes: l.duration_minutes,
        rate_applied: l.rate_applied, earned_amount: l.earned_amount,
        flagged_for_review: l.flagged_for_review, notes: l.notes,
      })),
    });
  } catch (error) {
    console.error('[getTutorLedger]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});