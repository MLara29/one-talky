// Single source of truth for what is charged/credited across all Mercado Pago
// payment functions (mpConfirmPayment, mpProcessPayment, mpCreatePixPayment,
// mpCreatePreference, mpCheckPixStatus). Prices/minutes are NEVER trusted from
// the client — everything is looked up here by external_reference.
//
// Confirmed with product 2026-07-31. The obsolete "plan:basic:2"/"plan:basic:4"
// keys have been permanently removed — nothing in the frontend references them.
export const CATALOG = {
  "plan:basic":    { price: 59.80,  title: "Plano Básico",    minutes: 60,  plan: "basic" },
  "plan:standard": { price: 119.60, title: "Plano Standard",  minutes: 120, plan: "standard" },
  "plan:premium":  { price: 227.24, title: "Plano Premium",   minutes: 240, plan: "premium" },
  "pack:teste":    { price: 2.00,   title: "One Talky - Teste de Cobrança", minutes: 1 },
  "pack:pp_30":    { price: 29.90,  title: "Pack 30 min",    minutes: 30 },
  "pack:pp_60":    { price: 56.81,  title: "Pack 60 min",    minutes: 60 },
  "pack:pp_120":   { price: 107.64, title: "Pack 2 horas",   minutes: 120 },
  "pack:pp_300":   { price: 254.15, title: "Pack 5 horas",   minutes: 300 },
  "pack:pp_600":   { price: 478.40, title: "Pack 10 horas",  minutes: 600 },
};

// Regional pricing (international fixed prices per currency) — re-exported
// from regionalPricing.js so paymentCatalog.js remains the single import point
// for all payment-related config. See regionalPricing.js for the full table.
export { REGIONAL_PRICING, getRegionalConfig, getRegionalPlanPrice, getRegionalPackPrice } from "./regionalPricing.js";

// Derived price-only map, used for affiliate commission calculations.
export const PRICE_CATALOG = Object.fromEntries(
  Object.entries(CATALOG).map(([key, item]) => [key, item.price])
);