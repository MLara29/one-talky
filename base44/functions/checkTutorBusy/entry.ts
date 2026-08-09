import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tutor_id } = await req.json();
    if (!tutor_id) return Response.json({ error: 'tutor_id required' }, { status: 400 });

    const activeLessons = await base44.asServiceRole.entities.Lesson.filter({
      tutor_id, status: "in_progress",
    });

    return Response.json({ busy: activeLessons.length > 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}