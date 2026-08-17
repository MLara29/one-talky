import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id } = await req.json();
    if (!lesson_id) return Response.json({ error: "lesson_id required" }, { status: 400 });

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    if (lessons.length === 0) return Response.json({ error: "Lesson not found" }, { status: 404 });
    const lesson = lessons[0];

    // Only the student of this lesson can start it (trigger in_progress)
    if (user.id !== lesson.student_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Idempotent — don't overwrite if already started
    if (lesson.status !== "scheduled") {
      return Response.json({ success: true, already_started: true });
    }

    // Hard block: past the 10-minute join grace period, this lesson belongs
    // to the no-show system, not to a fresh start. Must match
    // LESSON_JOIN_GRACE_PERIOD_MS in src/lib/constants.js.
    const GRACE_PERIOD_MS = 10 * 60 * 1000;
    if (lesson.scheduled_at) {
      const overdueMs = Date.now() - new Date(lesson.scheduled_at).getTime();
      if (overdueMs > GRACE_PERIOD_MS) {
        return Response.json({ error: "join_window_closed" }, { status: 410 });
      }
    }

    await base44.asServiceRole.entities.Lesson.update(lesson_id, {
      status: "in_progress",
      started_at: new Date().toISOString(),
    });

    // Mark tutor as in_lesson
    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
    if (tutorProfiles.length > 0) {
      await base44.asServiceRole.entities.TutorProfile.update(tutorProfiles[0].id, { in_lesson: true });
    }

    // Notify the tutor
    await base44.asServiceRole.entities.Notification.create({
      user_id: lesson.tutor_id,
      title: "📞 Live lesson started!",
      message: `${lesson.student_name} is waiting for you in the ${lesson.language} lesson. Join now!`,
      type: "lesson_booked",
      link: `/classroom/${lesson_id}`,
      is_read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[startLesson]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});