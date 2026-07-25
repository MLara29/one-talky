import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id, is_recorded } = await req.json();
    if (!lesson_id) return Response.json({ error: "lesson_id required" }, { status: 400 });

    // Fetch lesson server-side
    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    if (lessons.length === 0) return Response.json({ error: "Lesson not found" }, { status: 404 });
    const lesson = lessons[0];

    // Only participants can end the lesson
    if (user.id !== lesson.tutor_id && user.id !== lesson.student_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // If already completed, just return success (idempotent)
    if (lesson.status === "completed") {
      return Response.json({ success: true, already_completed: true });
    }

    const now = new Date().toISOString();
    const startedAt = lesson.started_at ? new Date(lesson.started_at).getTime() : Date.now();
    const endedAt = Date.now();
    const durationSeconds = Math.max(1, (endedAt - startedAt) / 1000);
    const durationMinutes = durationSeconds / 60;

    // Mark lesson as completed server-side
    await base44.asServiceRole.entities.Lesson.update(lesson_id, {
      status: "completed",
      ended_at: now,
      duration_minutes: Math.round(durationMinutes),
      is_recorded: Boolean(is_recorded),
    });

    // Debit student credits server-side
    const studentProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: lesson.student_id });
    if (studentProfiles.length > 0) {
      const sp = studentProfiles[0];
      const newCredits = Math.max(0, (sp.credits_minutes ?? 0) - durationMinutes);
      await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
        credits_minutes: Math.round(newCredits * 100) / 100,
        total_minutes: Math.round(((sp.total_minutes ?? 0) + durationMinutes) * 100) / 100,
        total_lessons: (sp.total_lessons ?? 0) + 1,
        last_practice_date: now.split("T")[0],
      });
    }

    // Credit tutor earnings server-side
    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
    if (tutorProfiles.length > 0) {
      const tp = tutorProfiles[0];
      const rate = tp.price_per_minute ?? 0.9967;
      const earnings = durationSeconds * (rate / 60);
      await base44.asServiceRole.entities.TutorProfile.update(tp.id, {
        total_earnings: Math.round(((tp.total_earnings ?? 0) + earnings) * 100) / 100,
        total_minutes: Math.round(((tp.total_minutes ?? 0) + durationMinutes) * 100) / 100,
        total_lessons: (tp.total_lessons ?? 0) + 1,
      });
    }

    return Response.json({ success: true, duration_minutes: Math.round(durationMinutes * 100) / 100 });
  } catch (error) {
    console.error('[endLesson]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});