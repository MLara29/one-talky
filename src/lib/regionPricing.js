import { base44 } from "@/api/base44Client";

// ⚠️ SIBLING: base44/shared/regionalPricing.js is the backend source of truth.
// This file mirrors the same config for the frontend. If you change prices
// here, change them there too. (Same pattern as CATALOG ↔ PLANS.)

export const REGIONAL_PRICING = {
  br: {
    label: "Brasil",
    currency: "BRL",
    symbol: "R$",
    locale: "pt-BR",
    zero_decimal: false,
    plans: { basic: 59.80, standard: 119.60, premium: 227.24 },
    packs: { pp_30: 29.90, pp_60: 56.81, pp_120: 107.64, pp_300: 254.15, pp_600: 478.40 },
  },
  eu: {
    label: "União Europeia",
    currency: "EUR",
    symbol: "€",
    locale: "de-DE",
    zero_decimal: false,
    plans: { basic: 14.90, standard: 29.80, premium: 56.60 },
    packs: { pp_30: 7.45, pp_60: 14.16, pp_120: 26.82, pp_300: 63.33, pp_600: 119.20 },
  },
  jp: {
    label: "Japão",
    currency: "JPY",
    symbol: "¥",
    locale: "ja-JP",
    zero_decimal: true,
    plans: { basic: 1990, standard: 3980, premium: 7560 },
    packs: { pp_30: 995, pp_60: 1891, pp_120: 3582, pp_300: 8458, pp_600: 15920 },
  },
  kr: {
    label: "Coreia do Sul",
    currency: "KRW",
    symbol: "₩",
    locale: "ko-KR",
    zero_decimal: true,
    plans: { basic: 19900, standard: 39800, premium: 75600 },
    packs: { pp_30: 9950, pp_60: 18905, pp_120: 35820, pp_300: 84575, pp_600: 159200 },
  },
  latam: {
    label: "América Latina",
    currency: "USD",
    symbol: "$",
    locale: "en-US",
    zero_decimal: false,
    plans: { basic: 11.90, standard: 23.80, premium: 45.20 },
    packs: { pp_30: 5.95, pp_60: 11.31, pp_120: 21.42, pp_300: 50.58, pp_600: 95.20 },
  },
};

export const COUNTRY_TO_REGION = {
  BR: "br",
  AT: "eu", BE: "eu", BG: "eu", HR: "eu", CY: "eu", CZ: "eu", DK: "eu", EE: "eu",
  FI: "eu", FR: "eu", DE: "eu", GR: "eu", HU: "eu", IE: "eu", IT: "eu", LV: "eu",
  LT: "eu", LU: "eu", MT: "eu", NL: "eu", PL: "eu", PT: "eu", RO: "eu", SK: "eu",
  SI: "eu", ES: "eu", SE: "eu",
  JP: "jp",
  KR: "kr",
  AR: "latam", BO: "latam", CL: "latam", CO: "latam", CR: "latam", CU: "latam",
  DO: "latam", EC: "latam", SV: "latam", GT: "latam", HN: "latam", MX: "latam",
  NI: "latam", PA: "latam", PY: "latam", PE: "latam", PR: "latam", UY: "latam",
  VE: "latam",
};

export function getRegionForCountry(countryCode) {
  // Sem código de país nenhum (detecção falhou por completo) — mantém "br"
  // como sempre foi, já que a maioria histórica dos usuários é brasileira.
  if (!countryCode) return "br";
  const known = COUNTRY_TO_REGION[String(countryCode).toUpperCase()];
  if (known) return known;
  // País identificado com sucesso, mas fora do mapa (EUA, Canadá, Reino
  // Unido, Austrália, etc.) — cai em "latam" (dólar) como padrão
  // internacional neutro, NUNCA em "br". As campanhas de anúncio rodam
  // globalmente, então assumir Brasil pra qualquer país desconhecido
  // mostraria preço/idioma errado pra visitante de fora.
  return "latam";
}

export function getRegionalConfig(region) {
  return REGIONAL_PRICING[region] || REGIONAL_PRICING.br;
}

export function getRegionalPlanPrice(planId, region) {
  const config = getRegionalConfig(region);
  return { price: config.plans[planId] ?? 0, currency: config.currency };
}

export function getRegionalPackPrice(packId, region) {
  const config = getRegionalConfig(region);
  return { price: config.packs?.[packId] ?? 0, currency: config.currency };
}

export const ZERO_DECIMAL_CURRENCIES = ["jpy", "krw"];

export function isZeroDecimal(currency) {
  return ZERO_DECIMAL_CURRENCIES.includes(String(currency || "").toLowerCase());
}

export function formatRegionalPrice(amount, currency, locale) {
  const c = String(currency || "").toLowerCase();
  if (!locale) {
    for (const config of Object.values(REGIONAL_PRICING)) {
      if (config.currency.toLowerCase() === c) { locale = config.locale; break; }
    }
    if (!locale) locale = "en-US";
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "BRL",
      minimumFractionDigits: isZeroDecimal(currency) ? 0 : 2,
      maximumFractionDigits: isZeroDecimal(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount}`;
  }
}

// ── Frontend-only: detect + cache region ───────────────────────────────────

const CACHE_KEY = "ot_region_cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Detects the visitor's region (server-side IP geolocation) and caches it
// in localStorage so we don't call the API on every page load. The cache
// has a TTL so a returning visitor from a different location gets updated.
export async function detectAndCacheRegion() {
  try {
    const res = await base44.functions.invoke("detectRegion", {});
    if (res.data?.region) {
      const cache = {
        region: res.data.region,
        currency: res.data.currency,
        country: res.data.country,
        countryCode: res.data.countryCode,
        cachedAt: Date.now(),
      };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
      return cache;
    }
  } catch (e) {
    console.error("[regionPricing] detectRegion failed:", e);
  }
  return getCachedRegion() || { region: "br", currency: "BRL", country: "", countryCode: "" };
}

export function getCachedRegion() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache || !cache.region) return null;
    if (Date.now() - (cache.cachedAt || 0) > CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

export function getCachedCurrency() {
  const cached = getCachedRegion();
  return cached?.currency || "BRL";
}

export function getCachedRegionKey() {
  const cached = getCachedRegion();
  return cached?.region || "br";
}