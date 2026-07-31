import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin-only broadcast/targeted notification to tutors — "all" (every
// approved tutor) or "specific" (a single tutor_id).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { target, tutor_id, title, message } = await req.json();
    if (!['all', 'specific'].includes(target)) {
      return Response.json({ error: 'Valid target is required' }, { status: 400 });
    }
    const titleText = String(title || '').trim();
    const messageText = String(message || '').trim();
    if (!titleText || !messageText) {
      return Response.json({ error: 'title and message are required' }, { status: 400 });
    }

    if (target === 'all') {
      const tutors = await base44.asServiceRole.entities.TutorProfile.filter({ status: 'approved' });
      const records = tutors.map(t => ({
        user_id: t.user_id,
        title: titleText,
        message: messageText,
        type: 'general',
        is_read: false,
        link: '/my-messages',
      }));
      if (records.length > 0) await base44.asServiceRole.entities.Notification.bulkCreate(records);
      return Response.json({ success: true, sent: records.length });
    }

    if (target === 'specific') {
      if (!tutor_id) return Response.json({ error: 'tutor_id is required' }, { status: 400 });
      const tutor = await base44.asServiceRole.entities.TutorProfile.get(tutor_id);
      if (!tutor) return Response.json({ error: 'Tutor not found' }, { status: 404 });
      await base44.asServiceRole.entities.Notification.create({
        user_id: tutor.user_id,
        title: titleText,
        message: messageText,
        type: 'general',
        is_read: false,
        link: '/my-messages',
      });
      return Response.json({ success: true, sent: 1 });
    }
  } catch (error) {
    console.error('[adminSendNotification]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});