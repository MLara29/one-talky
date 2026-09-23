import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin-only support ticket actions: reply (writes admin_reply + notifies the
// user) and close.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { message_id, action, reply } = await req.json();
    if (!message_id || !['reply', 'close', 'delete'].includes(action)) {
      return Response.json({ error: 'message_id and valid action are required' }, { status: 400 });
    }

    const msg = await base44.asServiceRole.entities.SupportMessage.get(message_id);
    if (!msg) return Response.json({ error: 'Message not found' }, { status: 404 });

    if (action === 'reply') {
      const replyText = String(reply || '').trim();
      if (!replyText) return Response.json({ error: 'reply is required' }, { status: 400 });

      const isFirstReply = !msg.admin_reply;

      if (isFirstReply) {
        // First reply: fill admin_reply + set status (preserves existing behavior)
        await base44.asServiceRole.entities.SupportMessage.update(message_id, {
          admin_reply: replyText,
          status: 'replied',
          replied_at: new Date().toISOString(),
        });
      } else {
        // Subsequent replies: append as a new SupportTicketReply
        await base44.asServiceRole.entities.SupportTicketReply.create({
          ticket_id: message_id,
          ticket_owner_id: msg.sender_id,
          sender_id: user.id,
          sender_name: user.full_name || user.email,
          is_from_admin: true,
          message: replyText,
        });
      }

      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: msg.sender_id,
          title: `Resposta ao seu chamado: ${msg.subject}`,
          message: replyText,
          type: 'general',
          is_read: false,
          link: '/my-messages?tab=ticket',
        });
      } catch {}

      return Response.json({ success: true });
    }

    if (action === 'close') {
      await base44.asServiceRole.entities.SupportMessage.update(message_id, { status: 'closed' });
      return Response.json({ success: true });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.SupportMessage.delete(message_id);
      return Response.json({ success: true, deleted: true });
    }
  } catch (error) {
    console.error('[adminReplySupportTicket]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});