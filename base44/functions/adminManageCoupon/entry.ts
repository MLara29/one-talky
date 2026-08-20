import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin-only Coupon management: create, toggle_active, delete.
// Server-side validation mirrors the frontend limits but is enforced here
// since the frontend form can be bypassed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { action, payload = {} } = await req.json();
    const VALID_ACTIONS = ['create', 'toggle_active', 'delete'];
    if (!VALID_ACTIONS.includes(action)) {
      return Response.json({ error: 'Valid action is required' }, { status: 400 });
    }

    if (action === 'create') {
      const code = String(payload.code || '').trim().toUpperCase();
      if (!code) return Response.json({ error: 'code is required' }, { status: 400 });

      const discountPercent = Number(payload.discount_percent) || 0;
      if (discountPercent < 0 || discountPercent > 100) {
        return Response.json({ error: 'discount_percent must be between 0 and 100' }, { status: 400 });
      }

      const creditsMinutes = Number(payload.credits_minutes) || 0;
      if (creditsMinutes < 0 || creditsMinutes > 120) {
        return Response.json({ error: 'credits_minutes must be between 0 and 120' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.Coupon.filter({ code });
      if (existing.length > 0) {
        return Response.json({ error: `Já existe um cupom com o código "${code}"` }, { status: 400 });
      }

      const record = {
        code,
        credits_minutes: creditsMinutes,
        discount_percent: discountPercent,
        discount_type: discountPercent > 0 ? (payload.discount_type || 'none') : 'none',
        max_uses: Number(payload.max_uses) || 100,
        description: payload.description || undefined,
        used_count: 0,
        is_active: true,
      };
      if (record.discount_type === 'period') {
        record.discount_start = payload.discount_start || undefined;
        record.discount_end = payload.discount_end || undefined;
      }
      // Validade geral do cupom — independente de ter desconto ou não.
      // Diferente de discount_start/discount_end (só existe pra período).
      if (payload.expires_at) {
        record.expires_at = String(payload.expires_at);
      }

      const coupon = await base44.asServiceRole.entities.Coupon.create(record);
      return Response.json({ success: true, coupon });
    }

    const { coupon_id } = payload;
    if (!coupon_id) return Response.json({ error: 'coupon_id required' }, { status: 400 });

    if (action === 'toggle_active') {
      const coupon = await base44.asServiceRole.entities.Coupon.get(coupon_id);
      if (!coupon) return Response.json({ error: 'Coupon not found' }, { status: 404 });
      const newActive = !coupon.is_active;
      await base44.asServiceRole.entities.Coupon.update(coupon_id, { is_active: newActive });
      return Response.json({ success: true, is_active: newActive });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.Coupon.delete(coupon_id);
      return Response.json({ success: true, deleted: true });
    }
  } catch (error) {
    console.error('[adminManageCoupon]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});