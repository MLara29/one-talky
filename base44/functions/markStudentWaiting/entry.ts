import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Records that the student's "My Lessons" screen showed the "waiting for
// tutor" state for this specific lesson — WITHOUT the student having opened
// the actual video classroom. This is a lighter-weight presence signal than
// student_joined_at, used so processNoShow can still correctly blame the
// tutor even when the Join button never appeared for the student (because
// the tutor wasn't online/available yet).
//
// Idempotent (only set once per lesson) — safe to call repeatedly while the
// waiting screen is shown.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'student') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { lesson_id } = await req.json();
    if (!lesson_id) return Response.json({ error: 'lesson_id is required' }, { status: 400 });

    const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
    if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });
    if (lesson.student_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (!lesson.student_waiting_at) {
      await base44.asServiceRole.entities.Lesson.update(lesson_id, {
        student_waiting_at: new Date().toISOString(),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[markStudentWaiting]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});
