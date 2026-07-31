import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Server-side price catalog for affiliate commission calculation
const PRICE_CATALOG: Record<string, number> = {
  "plan:basic":    59.80,
  "plan:standard": 119.60,
  "plan:premium":  227.24,
  "pack:pp_30":    29.90,
  "pack:pp_60":    56.81,
  "pack:pp_120":   107.64,
  "pack:pp_300":   254.15,
  "pack:pp_600":   478.40,
};

// Server-side catalog — prices and minutes are NEVER trusted from the client.
// Kept in sync with PLANS/PREPAID_PACKS in src/lib/constants.js — the frontend
// display values are the source of truth (confirmed with product 2026-07-30).
const CATALOG = {
  "plan:basic":    { minutes: 60,  price: 59.80,  plan: "basic" },
  "plan:standard": { minutes: 120, price: 119.60, plan: "standard" },
  "plan:premium":  { minutes: 240, price: 227.24, plan: "premium" },
  "pack:teste":    { minutes: 1,   price: 2.00 },
  "pack:pp_30":    { minutes: 30,  price: 29.90 },
  "pack:pp_60":    { minutes: 60,  price: 56.81 },
  "pack:pp_120":   { minutes: 120, price: 107.64 },
  "pack:pp_300":   { minutes: 300, price: 254.15 },
  "pack:pp_600":   { minutes: 600, price: 478.40 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const {
      token,
      payment_method_id,
      installments,
      external_reference, // "plan:standard" or "pack:pp_60"
      payer_email,
      coupon_code,
    } = await req.json();

    // Validate the reference against the server-side catalog
    const item = CATALOG[external_reference];
    if (!item) {
      return Response.json({ error: "Referência de produto inválida" }, { status: 400 });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    const paymentBody = {
      transaction_amount: item.price, // server-side price, never from client
      token,
      description: external_reference,
      installments: Number(installments) || 1,
      payment_method_id,
      payer: { email: payer_email },
      external_reference,
    };

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${user.id}-${external_reference}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const payment = await res.json();

    if (!res.ok) {
      return Response.json({ error: payment.message || "Erro no pagamento", detail: payment }, { status: 400 });
    }

    if (payment.status === "approved") {
      const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const profile = profiles[0];
        const updateData: Record<string, unknown> = {
          credits_minutes: (profile.credits_minutes ?? 0) + item.minutes,
        };
        if (item.plan) updateData.plan = item.plan;
        await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);

        // ── Affiliate commission logic ──────────────────────────────────────
        if (coupon_code) {
          const coupons = await base44.asServiceRole.entities.Coupon.filter({
            code: String(coupon_code).toUpperCase(),
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
              const saleAmount = PRICE_CATALOG[external_reference] ?? item.price;
              const commissionPct = affiliate.commission_percent ?? 15;
              const commissionAmount = parseFloat(((saleAmount * commissionPct) / 100).toFixed(2));
              await base44.asServiceRole.entities.AffiliateEarning.create({
                affiliate_id: affiliate.id,
                student_id: user.id,
                student_name: profile.full_name || user.email,
                coupon_code: coupon.code,
                plan_id: item.plan || external_reference,
                sale_amount: saleAmount,
                commission_percent: commissionPct,
                commission_amount: commissionAmount,
                payment_id: String(payment.id),
                sale_date: new Date().toISOString(),
                release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: "aguardando_7_dias",
              });
            }
          }
        }
        // ── end affiliate logic ─────────────────────────────────────────────
      }
    }

    return Response.json({
      success: payment.status === "approved",
      status: payment.status,
      status_detail: payment.status_detail,
      id: payment.id,
    });
  } catch (error) {
    console.error('[mpProcessPayment]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});