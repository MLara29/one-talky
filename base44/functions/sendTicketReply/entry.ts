import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// User-side reply to an existing support ticket (continuous conversation).
// Creates a SupportTicketReply with is_from_admin=false and notifies all admins.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticket_id, message } = await req.json();
    if (!ticket_id || !message?.trim()) {
      return Response.json({ error: 'ticket_id and message are required' }, { status: 400 });
    }

    // RLS enforces: user-scoped get only returns the ticket if sender_id === user.id
    let ticket;
    try {
      ticket = await base44.entities.SupportMessage.get(ticket_id);
    } catch {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.status === 'closed') {
      return Response.json({ error: 'Ticket is closed' }, { status: 400 });
    }

    // Create the reply (user-scoped; RLS allows create when sender_id === user.id)
    await base44.entities.SupportTicketReply.create({
      ticket_id,
      ticket_owner_id: ticket.sender_id,
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      is_from_admin: false,
      message: message.trim(),
    });

    // Notify all admins (service-role needed: Notification.create is admin-only)
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      if (admins.length > 0) {
        await base44.asServiceRole.entities.Notification.bulkCreate(
          admins.map(a => ({
            user_id: a.id,
            title: `💬 Nova mensagem no ticket: ${ticket.subject}`,
            message: `${user.full_name || user.email} respondeu no ticket de suporte.`,
            type: 'general',
            is_read: false,
            link: '/admin/support',
          }))
        );
      }
    } catch {}

    return Response.json({ success: true });
  } catch (error) {
    console.error('[sendTicketReply]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}