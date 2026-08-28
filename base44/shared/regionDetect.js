import { getRegionForCountry, getRegionalConfig } from "./regionalPricing.js";

// Detects the visitor's region from their IP address (geolocation, NOT
// browser language). Returns { region, currency, country, countryCode }.
// Falls back to { region: "br", currency: "BRL" } on any error so Brazil
// and unknown visitors see exactly what they see today.
//
// ORDEM DE PRIORIDADE (2026-08-28, após confirmar que os dois provedores
// externos gratuitos esgotam limite de uso com facilidade em produção):
//   1. Cabeçalho cf-ipcountry — fornecido de graça pela própria Cloudflare
//      (já na frente da aplicação), sem limite de consultas, sem chamada
//      de rede extra. É a fonte mais confiável disponivel hoje.
//   2. ipwho.is — serviço externo gratuito, usado se cf-ipcountry não
//      estiver presente (ex: ambiente sem Cloudflare na frente).
//   3. ipapi.co — reserva, se o provedor 2 também falhar.
export async function detectRegionFromRequest(req) {
  const clientIp = extractClientIp(req);

  // Prioridade 1: cf-ipcountry, de graça, sem limite.
  const cfCountry = req.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    const region = getRegionForCountry(cfCountry);
    const config = getRegionalConfig(region);
    return { region, currency: config.currency, country: "", countryCode: cfCountry };
  }

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