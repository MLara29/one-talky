import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { completeLesson } from "../../shared/completeLesson.js";

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

    if (lesson.status === "completed") {
      return Response.json({ success: true, already_completed: true });
    }

    // completeLesson() is CAS-guarded: if the tutor and student both call this at
    // the same time, only one of them actually debits/credits — the other gets
    // already_completed back with no double charge/payment.
    const result = await completeLesson(base44, lesson, { isRecorded: is_recorded });

    if (result.alreadyCompleted) {
      return Response.json({ success: true, already_completed: true });
    }

    return Response.json({
      success: true,
      duration_minutes: Math.round(result.durationMinutes * 100) / 100,
      flagged_for_review: result.flagged,
    });
  } catch (error) {
    console.error('[endLesson]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});