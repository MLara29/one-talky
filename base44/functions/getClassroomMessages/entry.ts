import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lesson_id } = await req.json();
    if (!lesson_id) return Response.json({ error: 'lesson_id required' }, { status: 400 });

    // Verify user is a participant of this lesson
    const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
    if (!lesson || (lesson.tutor_id !== user.id && lesson.student_id !== user.id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all messages for this lesson using service role (bypasses RLS)
    const messages = await base44.asServiceRole.entities.ClassroomMessage.filter({ lesson_id });

    return Response.json({ messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});