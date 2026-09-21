import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Marks all unread user-sent messages in a conversation as read by the admin.
// Called when the admin opens a conversation in the Messenger-style support page.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { user_id } = await req.json();
    if (!user_id) return Response.json({ error: 'user_id is required' }, { status: 400 });

    await base44.asServiceRole.entities.SupportChatMessage.updateMany(
      { user_id, is_from_admin: false, is_read_by_admin: false },
      { $set: { is_read_by_admin: true } },
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('[markChatReadByAdmin]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});