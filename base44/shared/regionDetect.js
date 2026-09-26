import { getRegionForCountry, getRegionalConfig } from "./regionalPricing.js";

// Detects the visitor's region from their IP address (geolocation, NOT
// browser language). Returns { region, currency, country, countryCode }.
// Falls back to { region: "br", currency: "BRL" } on any error so Brazil
// and unknown visitors see exactly what they see today.
//
// ORDEM DE PRIORIDADE (2026-09-26, reativação da detecção de região):
//   1. IPinfo.io — provedor pago, base mais precisa e atualizada que os
//      gratuitos, resolve corretamente IPv6 de operadoras móveis
//      brasileiras (problema original que pausou a detecção em 29/08).
//      Requer o secret IPINFO_API_KEY. Se a chave não estiver configurada
//      ou a chamada falhar, cai para o próximo provedor.
//   2. Cabeçalho cf-ipcountry — fornecido de graça pela Cloudflare (já na
//      frente da aplicação), sem limite de consultas, sem chamada de
//      rede extra. Bom fallback quando o IPinfo falha.
//   3. ipwho.is — serviço externo gratuito, usado se os dois anteriores
//      falharem (ex: ambiente sem Cloudflare e sem chave do IPinfo).
//   4. ipapi.co — última reserva, se todos os anteriores falharem.
export async function detectRegionFromRequest(req) {
  const clientIp = extractClientIp(req);

  // Prioridade 1: IPinfo.io (se a chave estiver configurada).
  if (clientIp) {
    const ipinfoCountry = await lookupCountryCodeIpinfo(clientIp);
    if (ipinfoCountry) {
      const region = getRegionForCountry(ipinfoCountry);
      const config = getRegionalConfig(region);
      return { region, currency: config.currency, country: "", countryCode: ipinfoCountry };
    }
  }

  // Prioridade 2: cf-ipcountry, de graça, sem limite.
  const cfCountry = req.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    const region = getRegionForCountry(cfCountry);
    const config = getRegionalConfig(region);
    return { region, currency: config.currency, country: "", countryCode: cfCountry };
  }

  if (!clientIp) {
    return { region: "br", currency: "BRL", country: "Brazil", countryCode: "BR" };
  }

  // Prioridades 3 e 4: provedores gratuitos restantes.
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

// IPinfo.io — provedor primário. Retorna o country code (ex: "BR") ou
// null se a chave não estiver configurada, a chamada falhar, ou a
// resposta não contiver um país válido.
async function lookupCountryCodeIpinfo(ip) {
  const apiKey = process.env.IPINFO_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(apiKey)}`);
    if (!res.ok) return null;
    const data = await res.json();
    // IPinfo retorna { country: "BR", ... } ou { error: { ... } } em falha.
    if (data && data.country && !data.error) return data.country;
    return null;
  } catch {
    return null;
  }
}

async function lookupCountryCode(ip) {
  // Provedor 1 (agora reserva): ipwho.is
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    const data = await res.json();
    if (data && data.success && data.country_code) return data.country_code;
  } catch { /* tenta o próximo provedor */ }

  // Provedor 2 (última reserva): ipapi.co — só chamado se o anterior falhar.
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    const data = await res.json();
    if (data && !data.error && data.country_code) return data.country_code;
  } catch { /* todos falharam — cai no padrão Brasil normalmente */ }

  return null;
}

function extractClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "";
}