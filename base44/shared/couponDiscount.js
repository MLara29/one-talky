// Shared coupon validation + discount calculation logic.
// Used by mpProcessPayment (authoritative, server-side charge) and validateCoupon
// (frontend display) so the discount logic is never duplicated.
//
// Returns:
//   { finalPrice, coupon, bonusMinutes, error }
// - finalPrice: the price after discount (== originalPrice if no discount)
// - coupon: the Coupon record (null if not found / no benefit)
// - bonusMinutes: free minutes from the coupon (0 if none)
// - error: non-null when the coupon is invalid (esgotado / fora do período)
//
// discount_type recurrence (first_month, bimestral, etc.) is NOT implemented —
// there is no automatic recurring billing in this system. The discount applies
// to the current purchase regardless of discount_type. If per-student recurring
// discount tracking is needed later, a usage-tracking mechanism must be added.

export async function validateAndApplyCoupon(base44, couponCode, originalPrice) {
  if (!couponCode) {
    return { finalPrice: originalPrice, coupon: null, bonusMinutes: 0, error: null };
  }

  const coupons = await base44.asServiceRole.entities.Coupon.filter({
    code: String(couponCode).toUpperCase(),
    is_active: true,
  });
  const coupon = coupons[0];
  if (!coupon) {
    return { finalPrice: originalPrice, coupon: null, bonusMinutes: 0, error: null };
  }

  const hasDiscount = (coupon.discount_percent || 0) > 0;
  const hasBonus = (coupon.credits_minutes || 0) > 0;
  if (!hasDiscount && !hasBonus) {
    return { finalPrice: originalPrice, coupon: null, bonusMinutes: 0, error: null };
  }

  // Validate max_uses.
  if ((coupon.used_count || 0) >= coupon.max_uses) {
    return { finalPrice: originalPrice, coupon: null, bonusMinutes: 0, error: "Cupom esgotado" };
  }

  // Validate period (only for discount_type === "period").
  if (coupon.discount_type === "period") {
    const now = new Date();
    const start = coupon.discount_start ? new Date(coupon.discount_start) : null;
    const end = coupon.discount_end ? new Date(coupon.discount_end) : null;
    if ((start && now < start) || (end && now > end)) {
      return { finalPrice: originalPrice, coupon: null, bonusMinutes: 0, error: "Cupom fora do período de validade" };
    }
  }

  const finalPrice = hasDiscount
    ? Math.round(originalPrice * (1 - coupon.discount_percent / 100) * 100) / 100
    : originalPrice;
  const bonusMinutes = coupon.credits_minutes || 0;

  return { finalPrice, coupon, bonusMinutes, error: null };
}