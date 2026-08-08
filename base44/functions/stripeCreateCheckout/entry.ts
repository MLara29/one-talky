import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { STRIPE_CATALOG, getStripeMode } from "../../shared/stripeCatalog.js";
import { CATALOG } from "../../shared/paymentCatalog.js";
import { validateAndApplyCoupon } from "../../shared/couponDiscount.js";

// Student-facing — creates a Stripe Embedded Checkout Session.
// Receives external_reference ("plan:standard" | "pack:pp_60") and optional
// coupon_code. Resolves the price_id from stripeCatalog.js, determines the
// checkout mode (subscription vs payment) from the prefix, validates the coupon
// via the SAME shared helper used by mpProcessPayment (no duplicated rules),
// applies a Stripe Coupon if there's a discount_percent, and returns the
// client_secret + publishable_key for <EmbeddedCheckoutProvider>.
//
// Metadata on the session carries everything the webhook needs to credit the
// student: user_id, external_reference, coupon_code, bonus_minutes.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { external_reference, coupon_code } = await req.json();

    // 1) Resolve the Stripe price + mode from the catalog.
    const stripeEntry = STRIPE_CATALOG[external_reference];
    if (!stripeEntry) {
      return Response.json({ error: "Produto não encontrado no catálogo Stripe" }, { status: 400 });
    }
    const item = CATALOG[external_reference];
    if (!item) {
      return Response.json({ error: "Referência de produto inválida" }, { status: 400 });
    }
    const mode = getStripeMode(external_reference);

    // 2) Validate coupon using the shared helper (same rules as Mercado Pago).
    const { finalPrice, coupon: appliedCoupon, bonusMinutes, error: couponError } =
      await validateAndApplyCoupon(base44, coupon_code, item.price);
    if (couponError) {
      return Response.json({ error: couponError }, { status: 400 });
    }

    const secretKey = secrets.get("STRIPE_SECRET_KEY");
    const publishableKey = secrets.get("STRIPE_PUBLISHABLE_KEY");
    if (!secretKey) return Response.json({ error: "STRIPE_SECRET_KEY não configurado" }, { status: 500 });
    if (!publishableKey) return Response.json({ error: "STRIPE_PUBLISHABLE_KEY não configurado" }, { status: 500 });

    const auth = `Bearer ${secretKey}`;
    const formHeaders = { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" };

    // 3) If the coupon has a discount_percent, create/reuse a Stripe Coupon
    //    (deterministic ID) and apply it to the Checkout Session.
    let stripeCouponId = "";
    const discountPercent = appliedCoupon?.discount_percent || 0;
    if (discountPercent > 0) {
      const couponId = `ot_disc_${discountPercent}`;
      // Try to create; if it already exists (409), retrieve it.
      const createRes = await fetch("https://api.stripe.com/v1/coupons", {
        method: "POST",
        headers: formHeaders,
        body: `id=${encodeURIComponent(couponId)}&percent_off=${discountPercent}&duration=once`,
      });
      if (createRes.ok) {
        stripeCouponId = couponId;
      } else {
        // Already exists — retrieve it.
        const getRes = await fetch(`https://api.stripe.com/v1/coupons/${couponId}`, { headers: { Authorization: auth } });
        if (getRes.ok) {
          stripeCouponId = couponId;
        } else {
          const errData = await getRes.json();
          console.error("[stripeCreateCheckout] coupon retrieve error:", JSON.stringify(errData));
          return Response.json({ error: "Falha ao aplicar cupom de desconto" }, { status: 400 });
        }
      }
    }

    // 4) Build the Checkout Session with ui_mode: "embedded".
    const returnUrl = "https://onetalky.com/plans?stripe_status=success";

    const params = new URLSearchParams();
    params.set("ui_mode", "embedded");
    params.set("mode", mode);
    params.set("return_url", returnUrl);
    params.set("customer_email", user.email);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price]", stripeEntry.price_id);

    // Metadata — the webhook reads these to credit the student.
    params.set("metadata[user_id]", user.id);
    params.set("metadata[external_reference]", external_reference);
    params.set("metadata[coupon_code]", coupon_code || "");
    params.set("metadata[bonus_minutes]", String(bonusMinutes || 0));
    params.set("metadata[test]", "false");

    if (stripeCouponId) {
      params.set("discounts[0][coupon]", stripeCouponId);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      // Pin to a pre-2026-03-25 API version so ui_mode: "embedded" is still
      // accepted — the installed @stripe/stripe-js v5.10 only supports
      // initEmbeddedCheckout (the "embedded" flow), not createEmbeddedCheckoutPage.
      headers: { ...formHeaders, "Stripe-Version": "2025-08-27.basil" },
      body: params,
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[stripeCreateCheckout] Stripe error:", JSON.stringify(data));
      return Response.json(
        { error: data.error?.message || "Falha ao criar Checkout Session" },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      client_secret: data.client_secret,
      publishable_key: publishableKey,
      session_id: data.id,
      mode,
    });
  } catch (error) {
    console.error("[stripeCreateCheckout] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}