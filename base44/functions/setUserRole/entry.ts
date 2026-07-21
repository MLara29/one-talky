import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, targetUserId } = await req.json();
    if (!['student', 'tutor', 'affiliate'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Admin can set role on any user by passing targetUserId
    if (targetUserId) {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      await base44.asServiceRole.entities.User.update(targetUserId, { role });
    } else {
      // Self-update
      await base44.asServiceRole.entities.User.update(user.id, { role });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});