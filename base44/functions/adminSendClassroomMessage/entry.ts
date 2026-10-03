import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Admin-only: creates a ClassroomAdminMessage addressed to a specific tutor.
// The message appears as a banner inside that tutor's active classroom session
// (Classroom.jsx), visible only to them, and only while they are in the room.
// The tutor acknowledges it with an "Ok, entendi" button, which sets
// acknowledged=true and hides the banner.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { tutor_id, message } = await req.json();
    if (!tutor_id) return Response.json({ error: 'tutor_id is required' }, { status: 400 });
    if (!message || !message.trim()) return Response.json({ error: 'message is required' }, { status: 400 });

    const record = await base44.asServiceRole.entities.ClassroomAdminMessage.create({
      tutor_id,
      message: message.trim(),
      acknowledged: false,
    });

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    console.error('[adminSendClassroomMessage]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});