import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Records that a participant (tutor or student) joined the classroom.
// Called from Classroom.jsx right after the Agora channel join succeeds.
// No OTP required — this is just a presence marker, not a sensitive action.
// The tutor_joined_at / student_joined_at fields are later read by
// processNoShow to determine who was at fault for a no-show.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lesson_id } = await req.json();
    if (!lesson_id) return Response.json({ error: 'lesson_id is required' }, { status: 400 });

    const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
    if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });

    const field = lesson.tutor_id === user.id ? 'tutor_joined_at'
      : lesson.student_id === user.id ? 'student_joined_at' : null;
    if (!field) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Only set if not already recorded (idempotent — re-joins don't overwrite).
    if (!lesson[field]) {
      await base44.asServiceRole.entities.Lesson.update(lesson_id, { [field]: new Date().toISOString() });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[markLessonJoined]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});