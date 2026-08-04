import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { checkRescheduleConflicts, performRescheduleSlotMove } from "../../shared/rescheduleLogic.js";
import { requireOtp } from "../../shared/requireOtp.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id, new_scheduled_at, message } = await req.json();
    if (!lesson_id || !new_scheduled_at) {
      return Response.json({ error: "lesson_id and new_scheduled_at required" }, { status: 400 });
    }

    // Validate the new date is in the future
    if (new Date(new_scheduled_at) <= new Date()) {
      return Response.json({ error: "New scheduled time must be in the future" }, { status: 400 });
    }

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    if (lessons.length === 0) return Response.json({ error: "Lesson not found" }, { status: 404 });
    const lesson = lessons[0];

    // Only the tutor of this lesson can reschedule
    if (user.id !== lesson.tutor_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    if (lesson.status !== "scheduled") {
      return Response.json({ error: "Only scheduled lessons can be rescheduled" }, { status: 400 });
    }

    // ── Check for tutor/student lesson conflicts at the new time ──────────────
    const conflict = await checkRescheduleConflicts(base44, lesson, new_scheduled_at);
    if (!conflict.ok) return Response.json({ error: conflict.error }, { status: conflict.status });

    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
    if (tutorProfiles.length === 0) return Response.json({ error: "Tutor profile not found" }, { status: 404 });
    const tp = tutorProfiles[0];

    // ── Perform the actual slot move (two-step CAS, shared logic) ─────────────
    const move = await performRescheduleSlotMove(base44, tp, new_scheduled_at, lesson.scheduled_at);
    if (!move.ok) return Response.json({ error: move.error }, { status: move.status });

    await base44.asServiceRole.entities.Lesson.update(lesson_id, { scheduled_at: new_scheduled_at });

    // Notify student
    const newDate = new Date(new_scheduled_at).toLocaleString();
    await base44.asServiceRole.entities.Notification.create({
      user_id: lesson.student_id,
      title: "Lesson rescheduled",
      message: message
        ? `Your lesson was moved to ${newDate}. Note from tutor: "${message}"`
        : `Your lesson was rescheduled to ${newDate}.`,
      type: "lesson_reminder",
      is_read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[rescheduleLesson]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});