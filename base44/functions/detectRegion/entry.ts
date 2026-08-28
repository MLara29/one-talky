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
    // problema de detecção via VPN) — mostra os cabeçalhos crus recebidos,
    // pra ver se o IP real do visitante está chegando em x-forwarded-for/
    // x-real-ip do jeito que o código espera.
    const debugHeaders: Record<string, string> = {};
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase().includes("ip") || key.toLowerCase().includes("forwarded") || key.toLowerCase().includes("client") || key.toLowerCase().includes("cf-") || key.toLowerCase().includes("real")) {
        debugHeaders[key] = value;
      }
    }
    return Response.json({ ...result, _debug_headers: debugHeaders });
  } catch {
    return Response.json({ region: "br", currency: "BRL", country: "", countryCode: "" });
  }
}