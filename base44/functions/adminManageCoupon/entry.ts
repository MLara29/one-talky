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
    const VALID_ACTIONS = ['create', 'update', 'toggle_active', 'delete'];
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
      let coupon = await base44.asServiceRole.entities.Coupon.create(record);

      // Validade geral + limite separado de minutos de bônus — gravados num
      // segundo passo (update), não junto do create. Testado e confirmado:
      // campos novos de esquema às vezes são silenciosamente descartados num
      // create, mas gravam certo num update logo em seguida.
      const followUp = {};
      if (payload.expires_at) followUp.expires_at = String(payload.expires_at);
      if (creditsMinutes > 0 && payload.max_bonus_uses) {
        followUp.max_bonus_uses = Number(payload.max_bonus_uses);
      }
      if (Object.keys(followUp).length > 0) {
        await base44.asServiceRole.entities.Coupon.update(coupon.id, followUp);
        coupon = await base44.asServiceRole.entities.Coupon.get(coupon.id);
      }

      return Response.json({ success: true, coupon });
    }

    const { coupon_id } = payload;
    if (!coupon_id) return Response.json({ error: 'coupon_id required' }, { status: 400 });

    if (action === 'update') {
      const coupon = await base44.asServiceRole.entities.Coupon.get(coupon_id);
      if (!coupon) return Response.json({ error: 'Coupon not found' }, { status: 404 });

      // Mesmas validações da criação — o código do cupom e o used_count NÃO
      // são editáveis aqui de propósito: mudar o código depois de já ter sido
      // usado bagunçaria os registros de uso existentes; mexer no contador de
      // uso manualmente criaria inconsistência com o histórico real.
      const discountPercent = Number(payload.discount_percent) || 0;
      if (discountPercent < 0 || discountPercent > 100) {
        return Response.json({ error: 'discount_percent must be between 0 and 100' }, { status: 400 });
      }

      const creditsMinutes = Number(payload.credits_minutes) || 0;
      if (creditsMinutes < 0 || creditsMinutes > 120) {
        return Response.json({ error: 'credits_minutes must be between 0 and 120' }, { status: 400 });
      }

      const maxUses = Number(payload.max_uses) || 100;
      if (maxUses < (coupon.used_count || 0)) {
        return Response.json({ error: `Máximo de usos não pode ser menor que os ${coupon.used_count} usos já registrados` }, { status: 400 });
      }

      const maxBonusUses = Number(payload.max_bonus_uses) || 0;
      if (maxBonusUses > 0 && maxBonusUses < (coupon.bonus_used_count || 0)) {
        return Response.json({ error: `Máximo de usos com bônus não pode ser menor que os ${coupon.bonus_used_count} bônus já concedidos` }, { status: 400 });
      }

      const updateData = {
        credits_minutes: creditsMinutes,
        discount_percent: discountPercent,
        discount_type: discountPercent > 0 ? (payload.discount_type || 'none') : 'none',
        max_uses: maxUses,
        description: payload.description || undefined,
        // null (não undefined) pra permitir limpar um valor já gravado antes
        // — undefined seria ignorado na gravação, deixando o valor antigo preso.
        discount_start: payload.discount_type === 'period' ? (payload.discount_start || null) : null,
        discount_end: payload.discount_type === 'period' ? (payload.discount_end || null) : null,
        expires_at: payload.expires_at || null,
        max_bonus_uses: creditsMinutes > 0 ? (maxBonusUses || null) : null,
      };

      await base44.asServiceRole.entities.Coupon.update(coupon_id, updateData);
      const updated = await base44.asServiceRole.entities.Coupon.get(coupon_id);
      return Response.json({ success: true, coupon: updated });
    }

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