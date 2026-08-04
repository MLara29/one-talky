import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { CATALOG } from "../../shared/paymentCatalog.js";
import { validateAndApplyCoupon } from "../../shared/couponDiscount.js";

// Returns the discounted price + bonus minutes for a given coupon + product,
// so the frontend can display the real amount the student will be charged
// BEFORE opening the checkout. The authoritative validation still happens
// in mpProcessPayment at charge time — this is for display only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { coupon_code, external_reference } = await req.json();
    if (!coupon_code || !external_reference) {
      return Response.json({ error: "coupon_code e external_reference são obrigatórios" }, { status: 400 });
    }

    const item = CATALOG[external_reference];
    if (!item) return Response.json({ error: "Referência de produto inválida" }, { status: 400 });

    const { finalPrice, coupon, bonusMinutes, error } =
      await validateAndApplyCoupon(base44, coupon_code, item.price);

    return Response.json({
      valid: !error && !!coupon,
      original_price: item.price,
      final_price: finalPrice,
      discount_percent: coupon?.discount_percent || 0,
      bonus_minutes: bonusMinutes,
      error,
    });
  } catch (error) {
    console.error('[validateCoupon]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});