import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin toggles the instant_chat_enabled flag on a student's profile,
// granting or revoking access to the "Instant Message" tab in MyMessages.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { user_id, enabled } = await req.json();
    if (!user_id) return Response.json({ error: 'user_id is required' }, { status: 400 });

    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id });
    if (profiles.length === 0) return Response.json({ error: 'Student profile not found' }, { status: 404 });

    await base44.asServiceRole.entities.StudentProfile.update(profiles[0].id, {
      instant_chat_enabled: !!enabled,
    });

    return Response.json({ success: true, instant_chat_enabled: !!enabled });
  } catch (error) {
    console.error('[adminToggleInstantChat]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});