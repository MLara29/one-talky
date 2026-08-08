import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { CATALOG, PRICE_CATALOG } from "../../shared/paymentCatalog.js";
import { validateAndApplyCoupon } from "../../shared/couponDiscount.js";
import { computeCreditUpdate } from "../../shared/studentCredits.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { payment_id, coupon_code } = await req.json();
    if (!payment_id) return Response.json({ error: "payment_id obrigatório" }, { status: 400 });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    // Verify payment directly with Mercado Pago — never trust client-supplied status
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await res.json();

    if (!res.ok) return Response.json({ error: payment.message || "Erro ao verificar pagamento" }, { status: 400 });

    if (payment.status !== "approved") {
      return Response.json({ success: false, status: payment.status });
    }

    // Verify the payment belongs to the authenticated user
    const payerEmail = payment.payer?.email;
    if (payerEmail && user.email && payerEmail.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: "Payment does not belong to this user" }, { status: 403 });
    }

    // Guard: prevent double-spend
    const existing = await base44.asServiceRole.entities.ProcessedPayment.filter({ payment_id: String(payment_id) });
    if (existing.length > 0) {
      return Response.json({ success: false, error: "Payment already processed" }, { status: 409 });
    }

    // Resolve product from server-side catalog — external_reference comes from MP API, not client
    const externalRef = payment.external_reference || "";
    const item = CATALOG[externalRef];
    if (!item) {
      return Response.json({ error: "Referência de produto inválida", external_reference: externalRef }, { status: 400 });
    }

    // Credit the student
    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: "Perfil não encontrado" }, { status: 404 });

    const profile = profiles[0];

    // Validate coupon (if provided) for bonus minutes. The charge already
    // happened at full price via mpCreatePreference/mpCreatePixPayment, so the
    // coupon only provides bonus minutes here — no retroactive discount.
    const { coupon: appliedCoupon, bonusMinutes } =
      await validateAndApplyCoupon(base44, coupon_code, item.price);

    const creditUpdate = await computeCreditUpdate(base44, {
      profile,
      externalReference: externalRef,
      item,
      couponCode: coupon_code || "",
      bonusMinutes,
      appliedCoupon,
      isRenewal: false,
    });
    const updateData: Record<string, unknown> = { ...creditUpdate };
    if (item.plan) updateData.plan = item.plan;
    await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);

    // Record payment as processed to prevent replay attacks
    await base44.asServiceRole.entities.ProcessedPayment.create({
      payment_id: String(payment_id),
      user_id: user.id,
    });

    // ── Affiliate commission logic ──────────────────────────────────────────
    if (coupon_code) {
      const coupons = await base44.asServiceRole.entities.Coupon.filter({
        code: String(coupon_code).toUpperCase(),
        is_active: true,
      });
      const coupon = coupons[0];
      if (coupon?.affiliate_id) {
        // Guard: one commission per student per coupon
        const alreadyUsed = await base44.asServiceRole.entities.AffiliateEarning.filter({
          student_id: user.id,
          coupon_code: coupon.code,
        });
        if (alreadyUsed.length === 0) {
          const affiliates = await base44.asServiceRole.entities.Affiliate.filter({
            id: coupon.affiliate_id,
            status: "active",
          });
          const affiliate = affiliates[0];
          if (affiliate) {
            const saleAmount = PRICE_CATALOG[externalRef] ?? 0;
            const commissionPct = affiliate.commission_percent ?? 15;
            const commissionAmount = parseFloat(((saleAmount * commissionPct) / 100).toFixed(2));
            await base44.asServiceRole.entities.AffiliateEarning.create({
              affiliate_id: affiliate.id,
              student_id: user.id,
              student_name: profile.full_name || user.email,
              coupon_code: coupon.code,
              plan_id: item.plan || externalRef,
              sale_amount: saleAmount,
              commission_percent: commissionPct,
              commission_amount: commissionAmount,
              payment_id: String(payment_id),
              sale_date: new Date().toISOString(),
              release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: "aguardando_7_dias",
            });
          }
        }
      }
    }
    // ── end affiliate logic ─────────────────────────────────────────────────

    return Response.json({ success: true, minutes_added: item.minutes, plan: item.plan || null });
  } catch (error) {
    console.error('[mpConfirmPayment]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});