import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';
import { grantRole } from '../../shared/grantRole.js';

// Admin-only actions on an Affiliate record: link it to a platform user account
// (granting role: 'affiliate' via the single shared grantRole helper), or delete it.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { affiliate_id, action, target_user_id } = await req.json();
    if (!affiliate_id || !['link_role', 'delete'].includes(action)) {
      return Response.json({ error: 'affiliate_id and valid action are required' }, { status: 400 });
    }

    const affiliate = await base44.asServiceRole.entities.Affiliate.get(affiliate_id);
    if (!affiliate) return Response.json({ error: 'Affiliate not found' }, { status: 404 });

    if (action === 'delete') {
      await base44.asServiceRole.entities.Affiliate.delete(affiliate_id);
      return Response.json({ success: true, deleted: true });
    }

    if (action === 'link_role') {
      if (!target_user_id) return Response.json({ error: 'target_user_id required' }, { status: 400 });
      if (!affiliate.user_id || affiliate.user_id !== target_user_id) {
        await base44.asServiceRole.entities.Affiliate.update(affiliate_id, { user_id: target_user_id });
      }
      await grantRole(base44, target_user_id, 'affiliate');
      return Response.json({ success: true });
    }
  } catch (error) {
    console.error('[adminManageAffiliateUser]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});