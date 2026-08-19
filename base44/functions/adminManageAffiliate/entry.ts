import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin-only Affiliate program management: create, activate/deactivate,
// change commission_percent, delete, link an existing affiliate to a new coupon,
// and mark a released commission as paid.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { action, payload = {} } = await req.json();
    const VALID_ACTIONS = ['create', 'toggle_status', 'update_commission', 'delete', 'link_coupon', 'mark_earning_paid', 'delete_earning'];
    if (!VALID_ACTIONS.includes(action)) {
      return Response.json({ error: 'Valid action is required' }, { status: 400 });
    }

    if (action === 'create') {
      const { full_name, email, coupon_code, commission_percent, user_id } = payload;
      const code = String(coupon_code || '').trim().toUpperCase();
      if (!full_name || !email || !code) {
        return Response.json({ error: 'full_name, email and coupon_code are required' }, { status: 400 });
      }
      const existingCoupons = await base44.asServiceRole.entities.Coupon.filter({ code });
      if (existingCoupons.length === 0) {
        return Response.json({ error: `Cupom "${code}" não existe. Crie o cupom em Cupons primeiro.` }, { status: 400 });
      }
      const affiliate = await base44.asServiceRole.entities.Affiliate.create({
        full_name, email, coupon_code: code,
        commission_percent: Number(commission_percent) || 15,
        status: 'active',
        user_id: user_id || undefined,
      });
      await base44.asServiceRole.entities.Coupon.update(existingCoupons[0].id, { affiliate_id: affiliate.id });
      return Response.json({ success: true, affiliate });
    }

    // Every other action operates on an existing affiliate record
    const { affiliate_id } = payload;
    if (!['mark_earning_paid', 'delete_earning'].includes(action) && !affiliate_id) {
      return Response.json({ error: 'affiliate_id required' }, { status: 400 });
    }

    if (action === 'toggle_status') {
      const affiliate = await base44.asServiceRole.entities.Affiliate.get(affiliate_id);
      if (!affiliate) return Response.json({ error: 'Affiliate not found' }, { status: 404 });
      const newStatus = affiliate.status === 'active' ? 'inactive' : 'active';
      await base44.asServiceRole.entities.Affiliate.update(affiliate_id, { status: newStatus });
      return Response.json({ success: true, status: newStatus });
    }

    if (action === 'update_commission') {
      const pct = Number(payload.commission_percent);
      if (isNaN(pct) || pct < 1 || pct > 100) {
        return Response.json({ error: 'commission_percent must be between 1 and 100' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Affiliate.update(affiliate_id, { commission_percent: pct });
      return Response.json({ success: true, commission_percent: pct });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.Affiliate.delete(affiliate_id);
      return Response.json({ success: true, deleted: true });
    }

    if (action === 'link_coupon') {
      const code = String(payload.coupon_code || '').trim().toUpperCase();
      if (!code) return Response.json({ error: 'coupon_code required' }, { status: 400 });
      const existingCoupons = await base44.asServiceRole.entities.Coupon.filter({ code });
      if (existingCoupons.length === 0) {
        return Response.json({ error: `Cupom "${code}" não existe. Crie o cupom em Cupons primeiro.` }, { status: 400 });
      }
      const source = await base44.asServiceRole.entities.Affiliate.get(affiliate_id);
      if (!source) return Response.json({ error: 'Affiliate not found' }, { status: 404 });
      const newAff = await base44.asServiceRole.entities.Affiliate.create({
        full_name: source.full_name, email: source.email, coupon_code: code,
        commission_percent: source.commission_percent, status: 'active',
        user_id: source.user_id || undefined,
      });
      await base44.asServiceRole.entities.Coupon.update(existingCoupons[0].id, { affiliate_id: newAff.id });
      return Response.json({ success: true, affiliate: newAff });
    }

    if (action === 'mark_earning_paid') {
      const { earning_id } = payload;
      if (!earning_id) return Response.json({ error: 'earning_id required' }, { status: 400 });

      const earning = await base44.asServiceRole.entities.AffiliateEarning.get(earning_id);
      if (!earning) return Response.json({ error: 'Earning not found' }, { status: 404 });

      if (earning.status !== 'liberado') {
        return Response.json({
          error: earning.status === 'pago'
            ? 'Esta comissão já foi paga'
            : 'Esta comissão ainda está aguardando o período de liberação de 7 dias e não pode ser marcada como paga',
        }, { status: 400 });
      }

      await base44.asServiceRole.entities.AffiliateEarning.update(earning_id, {
        status: 'pago',
        paid_at: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    if (action === 'delete_earning') {
      // Exclusão manual de um registro de comissão individual — usada tanto
      // pra limpar registros errados/duplicados quanto como fallback manual
      // além da limpeza automática que já acontece quando o aluno é excluído
      // (ver adminManageStudent).
      const { earning_id } = payload;
      if (!earning_id) return Response.json({ error: 'earning_id required' }, { status: 400 });

      const earning = await base44.asServiceRole.entities.AffiliateEarning.get(earning_id);
      if (!earning) return Response.json({ error: 'Earning not found' }, { status: 404 });

      await base44.asServiceRole.entities.AffiliateEarning.delete(earning_id);
      return Response.json({ success: true, deleted: true });
    }
  } catch (error) {
    console.error('[adminManageAffiliate]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});