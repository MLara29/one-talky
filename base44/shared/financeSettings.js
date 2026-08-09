// Singleton finance settings shared by payment functions (mpProcessPayment,
// stripeWebhook) and the admin finance screen. Returns defaults if no
// AdminFinanceSettings record exists yet.
//
// NOTE: estimated_fee stored in PaymentRecord is CALCULATED from these
// configured rates at payment time — it is NOT the exact fee returned by
// Stripe/Mercado Pago for each specific transaction. The real gateway
// fee can vary by card brand, installment count, etc. This is an estimate
// for projection/accounting purposes.

export const FINANCE_DEFAULTS = {
  mp_card_pct: 4.99,
  mp_card_fixed: 0.39,
  stripe_card_pct: 2.9,
  stripe_card_fixed: 0.30,
  agora_cost_per_min: 0.0099,
  affiliate_commission_pct: 15,
  avg_discount_pct: 0,
  tax_pct: 0,
  operational_monthly: 0,
  default_tutor_rate_hour: 36,
};

export async function getFinanceSettings(base44) {
  const existing = await base44.asServiceRole.entities.AdminFinanceSettings.list("-created_date", 1);
  if (existing.length === 0) return { ...FINANCE_DEFAULTS };
  const s = existing[0];
  return { ...FINANCE_DEFAULTS, ...s };
}