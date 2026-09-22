import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin sends a message in the Messenger-style support chat.
// Creates a SupportChatMessage, notifies the user, and updates the most
// recent open SupportMessage for backward compatibility with MyMessages.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { user_id, user_name, user_role, message } = await req.json();
    if (!user_id || !message?.trim()) {
      return Response.json({ error: 'user_id and message are required' }, { status: 400 });
    }

    const msg = String(message).trim();
    const adminName = user.full_name || 'Suporte One Talky';

    // 1. Create the chat message
    await base44.asServiceRole.entities.SupportChatMessage.create({
      user_id,
      user_name: user_name || 'Usuário',
      user_role: user_role || 'student',
      is_from_admin: true,
      sender_name: adminName,
      message: msg,
      is_read_by_admin: true,
    });

    // 2. Notify the user (so they see it in MyMessages → "From Support")
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_id,
        title: '💬 Nova resposta do suporte',
        message: msg,
        type: 'general',
        is_read: false,
        link: '/notifications',
      });
    } catch (e) {
      console.error('[adminSendChatMessage] notification', e.message);
    }

    // 3. Backward compat: update most recent non-closed SupportMessage so
    //    MyMessages (old ticket view) still shows the reply.
    try {
      const tickets = await base44.asServiceRole.entities.SupportMessage.filter(
        { sender_id: user_id },
        '-created_date',
        1,
      );
      if (tickets.length > 0 && tickets[0].status !== 'closed') {
        await base44.asServiceRole.entities.SupportMessage.update(tickets[0].id, {
          admin_reply: msg,
          status: 'replied',
          replied_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('[adminSendChatMessage] backward compat', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[adminSendChatMessage]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});