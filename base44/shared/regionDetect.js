import { getRegionForCountry, getRegionalConfig } from "./regionalPricing.js";

// Detects the visitor's region from their IP address (geolocation, NOT
// browser language). Returns { region, currency, country, countryCode }.
// Falls back to { region: "br", currency: "BRL" } on any error so Brazil
// and unknown visitors see exactly what they see today.
//
// Uses ipwho.is (free, HTTPS, no API key).
export async function detectRegionFromRequest(req) {
  const clientIp = extractClientIp(req);
  if (!clientIp) {
    return { region: "br", currency: "BRL", country: "Brazil", countryCode: "BR" };
  }
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`);
    const data = await res.json();
    if (!data || !data.success) {
      return { region: "br", currency: "BRL", country: "", countryCode: "" };
    }
    const countryCode = data.country_code || "";
    const region = getRegionForCountry(countryCode);
    const config = getRegionalConfig(region);
    return {
      region,
      currency: config.currency,
      country: data.country || "",
      countryCode,
    };
  } catch {
    return { region: "br", currency: "BRL", country: "", countryCode: "" };
  }
}

function extractClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "";
}