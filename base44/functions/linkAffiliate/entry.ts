import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { coupon_code, full_name, pix_key, pix_key_type, bank_info } = await req.json();

    if (!coupon_code) return Response.json({ error: 'coupon_code é obrigatório' }, { status: 400 });

    const code = coupon_code.trim().toUpperCase();

    // Validate coupon exists (service role to bypass RLS)
    const coupons = await base44.asServiceRole.entities.Coupon.filter({ code });
    if (coupons.length === 0) {
      return Response.json({ error: `Cupom "${code}" não encontrado. Verifique com o administrador.` }, { status: 404 });
    }
    const coupon = coupons[0];

    // Check if admin pre-created an affiliate with this coupon or this user's email
    const existingByCoupon = await base44.asServiceRole.entities.Affiliate.filter({ coupon_code: code });
    const existingByEmail = user.email ? await base44.asServiceRole.entities.Affiliate.filter({ email: user.email }) : [];

    const preCreated = existingByCoupon[0] || existingByEmail[0];

    if (preCreated) {
      // Already linked to another user
      if (preCreated.user_id && preCreated.user_id !== user.id) {
        return Response.json({ error: 'Este cupom já está vinculado a outro afiliado.' }, { status: 409 });
      }
      // If not yet linked, the authenticated user's email must match the pre-registered email
      // to prevent anyone with the public coupon code from hijacking the affiliate record
      if (!preCreated.user_id && preCreated.email && preCreated.email.toLowerCase() !== user.email?.toLowerCase()) {
        return Response.json({ error: 'Este cupom não pertence ao seu e-mail.' }, { status: 403 });
      }
      // Update pre-created record with user data
      await base44.asServiceRole.entities.Affiliate.update(preCreated.id, {
        user_id: user.id,
        full_name: full_name || preCreated.full_name,
        email: user.email,
        coupon_code: code,
        pix_key,
        pix_key_type,
        bank_info,
        status: 'active',
      });
      // Link coupon to affiliate id
      await base44.asServiceRole.entities.Coupon.update(coupon.id, { affiliate_id: preCreated.id });
    } else {
      // No pre-created affiliate record for this coupon or email.
      // Block self-registration: only admin-pre-created affiliate records are allowed.
      return Response.json({ error: 'Este cupom não está pré-autorizado para cadastro de afiliado. Entre em contato com o administrador.' }, { status: 403 });
    }

    // Update user role
    await base44.asServiceRole.entities.User.update(user.id, { role: 'affiliate' });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});