import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Server-side price catalog — kept in sync with mpCreatePreference
const PRICE_CATALOG: Record<string, number> = {
  "plan:basic":    119.60,
  "plan:standard": 227.24,
  "plan:premium":  430.56,
  "pack:pp_30":    29.90,
  "pack:pp_60":    56.81,
  "pack:pp_120":   107.64,
  "pack:pp_300":   254.15,
  "pack:pp_600":   478.40,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { payment_id, coupon_code } = await req.json();
    if (!payment_id) return Response.json({ error: "payment_id obrigatório" }, { status: 400 });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    // Verifica pagamento na API do MP
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await res.json();

    if (payment.status !== "approved") {
      return Response.json({ success: false, status: payment.status });
    }

    // Guard: ensure this payment_id has not been processed before (prevent double-spend)
    const existing = await base44.asServiceRole.entities.ProcessedPayment.filter({ payment_id: String(payment_id) });
    if (existing.length > 0) {
      return Response.json({ success: false, error: "Payment already processed" }, { status: 409 });
    }

    // Verify the payment belongs to the authenticated user by checking the payer's email
    const payerEmail = payment.payer?.email;
    if (payerEmail && user.email && payerEmail.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: "Payment does not belong to this user" }, { status: 403 });
    }

    // external_reference vem do objeto verificado da API do MP, não do cliente
    const parts = (payment.external_reference || "").split(":");
    const type = parts[0];
    const itemId = parts[1];
    const minutes = parseInt(parts[2] || "0", 10);

    // Atualiza perfil do aluno
    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: "Perfil não encontrado" }, { status: 404 });

    const profile = profiles[0];
    const updateData: Record<string, unknown> = {
      credits_minutes: (profile.credits_minutes ?? 0) + minutes,
    };
    if (type === "plan") {
      updateData.plan = itemId;
    }

    await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);

    // Record the processed payment to prevent replay
    await base44.asServiceRole.entities.ProcessedPayment.create({
      payment_id: String(payment_id),
      user_id: user.id,
    });

    // ── Affiliate commission logic ──────────────────────────────────────────
    // coupon_code may come from the client (optional) — resolve the affiliate
    const affiliateCouponCode = coupon_code || null;
    if (affiliateCouponCode) {
      const coupons = await base44.asServiceRole.entities.Coupon.filter({
        code: String(affiliateCouponCode).toUpperCase(),
        is_active: true,
      });
      const coupon = coupons[0];
      if (coupon?.affiliate_id) {
        const affiliates = await base44.asServiceRole.entities.Affiliate.filter({
          id: coupon.affiliate_id,
          status: "active",
        });
        const affiliate = affiliates[0];
        if (affiliate) {
          const saleAmount = PRICE_CATALOG[payment.external_reference] ?? 0;
          const commissionPct = affiliate.commission_percent ?? 15;
          const commissionAmount = parseFloat(((saleAmount * commissionPct) / 100).toFixed(2));
          const saleDate = new Date().toISOString();
          const releaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await base44.asServiceRole.entities.AffiliateEarning.create({
            affiliate_id: affiliate.id,
            student_id: user.id,
            student_name: profile.full_name || user.email,
            coupon_code: coupon.code,
            plan_id: itemId,
            sale_amount: saleAmount,
            commission_percent: commissionPct,
            commission_amount: commissionAmount,
            payment_id: String(payment_id),
            sale_date: saleDate,
            release_date: releaseDate,
            status: "aguardando_7_dias",
          });
        }
      }
    }
    // ── end affiliate logic ─────────────────────────────────────────────────

    return Response.json({ success: true, type, item_id: itemId, minutes_added: minutes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});