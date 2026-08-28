import { detectRegionFromRequest } from "../../shared/regionDetect.js";

// Public endpoint — no auth required. Called by the Landing Page on mount
// to determine the visitor's region via IP geolocation so the correct plan
// prices + currency can be shown before signup.
//
// Returns: { region, currency, country, countryCode }
// Always returns 200 and never blocks the page — falls back to BR/BRL.
export default async function (req: Request): Promise<Response> {
  try {
    const result = await detectRegionFromRequest(req);
    // DIAGNÓSTICO TEMPORÁRIO (remover depois de identificar a causa do
    // problema de detecção via VPN) — mostra os cabeçalhos crus recebidos
    // E a resposta crua do ipwho.is, pra ver exatamente onde/por que falha.
    const debugHeaders: Record<string, string> = {};
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase().includes("ip") || key.toLowerCase().includes("forwarded") || key.toLowerCase().includes("client") || key.toLowerCase().includes("cf-") || key.toLowerCase().includes("real")) {
        debugHeaders[key] = value;
      }
    }
    const xff = req.headers.get("x-forwarded-for");
    const extractedIp = xff ? xff.split(",")[0].trim() : (req.headers.get("x-real-ip") || "");
    let rawLookup = null;
    try {
      const lookupRes = await fetch(`https://ipwho.is/${encodeURIComponent(extractedIp)}`);
      rawLookup = { status: lookupRes.status, body: await lookupRes.json() };
    } catch (e) {
      rawLookup = { error: e.message };
    }
    return Response.json({ ...result, _debug_headers: debugHeaders, _debug_extracted_ip: extractedIp, _debug_raw_lookup: rawLookup });
  } catch {
    return Response.json({ region: "br", currency: "BRL", country: "", countryCode: "" });
  }
}