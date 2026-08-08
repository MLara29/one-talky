// Shared affiliate commission logic.
// Used by mpProcessPayment and stripeWebhook — never duplicate this logic.
//
// Records an AffiliateEarning when a coupon linked to an active affiliate is
// used. Commission is calculated on the FULL catalog price (discount is a
// platform promotion, not an affiliate discount).

import { PRICE_CATALOG } from "./paymentCatalog.js";

export async function recordAffiliateCommission(base44, {
  couponCode,
  externalReference,
  planId,
  studentId,
  studentName,
  paymentId,
}) {
  if (!couponCode) return;

  const coupons = await base44.asServiceRole.entities.Coupon.filter({
    code: String(couponCode).toUpperCase(),
    is_active: true,
  });
  const coupon = coupons[0];
  if (!coupon?.affiliate_id) return;

  const affiliates = await base44.asServiceRole.entities.Affiliate.filter({
    id: coupon.affiliate_id,
    status: "active",
  });
  const affiliate = affiliates[0];
  if (!affiliate) return;

  const saleAmount = PRICE_CATALOG[externalReference] ?? 0;
  const commissionPct = affiliate.commission_percent ?? 15;
  const commissionAmount = parseFloat(((saleAmount * commissionPct) / 100).toFixed(2));

  await base44.asServiceRole.entities.AffiliateEarning.create({
    affiliate_id: affiliate.id,
    student_id: studentId,
    student_name: studentName,
    coupon_code: coupon.code,
    plan_id: planId || externalReference,
    sale_amount: saleAmount,
    commission_percent: commissionPct,
    commission_amount: commissionAmount,
    payment_id: String(paymentId),
    sale_date: new Date().toISOString(),
    release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "aguardando_7_dias",
  });
}