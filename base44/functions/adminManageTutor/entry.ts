import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin-only tutor profile moderation actions — all writes go through this
// gated function instead of direct entity.update()/delete() calls from the client.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { tutor_id, action } = await req.json();
    if (!tutor_id || !['toggle_block', 'delete', 'toggle_contract_type', 'dismiss_ban_suggestion'].includes(action)) {
      return Response.json({ error: 'tutor_id and valid action are required' }, { status: 400 });
    }

    const tutor = await base44.asServiceRole.entities.TutorProfile.get(tutor_id);
    if (!tutor) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    if (action === 'delete') {
      await base44.asServiceRole.entities.TutorProfile.delete(tutor_id);
      return Response.json({ success: true, deleted: true });
    }

    if (action === 'toggle_block') {
      const newStatus = tutor.status === 'rejected' ? 'approved' : 'rejected';
      await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { status: newStatus });
      return Response.json({ success: true, status: newStatus });
    }

    if (action === 'toggle_contract_type') {
      const newType = tutor.contract_type === 'upwork' ? 'direct' : 'upwork';
      await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { contract_type: newType });
      return Response.json({ success: true, contract_type: newType });
    }

    if (action === 'dismiss_ban_suggestion') {
      await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { ban_suggested: false });
      return Response.json({ success: true, ban_suggested: false });
    }
  } catch (error) {
    console.error('[adminManageTutor]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});