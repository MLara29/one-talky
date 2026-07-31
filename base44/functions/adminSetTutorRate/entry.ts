import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin-only bulk update of tutor pay rates (USD/minute).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { rates } = await req.json();
    if (!Array.isArray(rates) || rates.length === 0) {
      return Response.json({ error: 'rates array is required' }, { status: 400 });
    }

    const updates = rates
      .filter(r => r && r.tutor_id && typeof r.price_per_minute === 'number' && r.price_per_minute >= 0)
      .map(r => ({ id: r.tutor_id, price_per_minute: r.price_per_minute }));

    if (updates.length === 0) {
      return Response.json({ error: 'No valid rate entries' }, { status: 400 });
    }

    await base44.asServiceRole.entities.TutorProfile.bulkUpdate(updates);
    return Response.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('[adminSetTutorRate]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});