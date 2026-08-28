import { getRegionForCountry, getRegionalConfig } from "./regionalPricing.js";

// Detects the visitor's region from their IP address (geolocation, NOT
// browser language). Returns { region, currency, country, countryCode }.
// Falls back to { region: "br", currency: "BRL" } on any error so Brazil
// and unknown visitors see exactly what they see today.
//
// Usa DOIS provedores gratuitos, em cascata: ipwho.is primeiro, e se ele
// falhar por QUALQUER motivo (fora do ar, erro, ou limite de uso mensal
// esgotado — já aconteceu, confirmado em 2026-08-28), tenta ipapi.co antes
// de desistir e cair no padrão Brasil. Um único provedor gratuito não é
// confiável o suficiente sozinho pra depender 100% dele.
export async function detectRegionFromRequest(req) {
  const clientIp = extractClientIp(req);
  if (!clientIp) {
    return { region: "br", currency: "BRL", country: "Brazil", countryCode: "BR" };
  }

  const countryCode = await lookupCountryCode(clientIp);
  if (!countryCode) {
    return { region: "br", currency: "BRL", country: "", countryCode: "" };
  }

  const region = getRegionForCountry(countryCode);
  const config = getRegionalConfig(region);
  return {
    region,
    currency: config.currency,
    country: "",
    countryCode,
  };
}

async function lookupCountryCode(ip) {
  // Provedor 1: ipwho.is
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    const data = await res.json();
    if (data && data.success && data.country_code) return data.country_code;
  } catch { /* tenta o próximo provedor */ }

  // Provedor 2 (reserva): ipapi.co — só chamado se o primeiro falhar.
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    const data = await res.json();
    if (data && !data.error && data.country_code) return data.country_code;
  } catch { /* os dois falharam — cai no padrão Brasil normalmente */ }

  return null;
}

function extractClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "";
}