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
    // DIAGNÓSTICO TEMPORÁRIO (2ª rodada) — o fallback também falhou, preciso
    // ver a resposta crua dos DOIS provedores pra entender o motivo do
    // segundo. Remover depois de confirmado.
    const xff = req.headers.get("x-forwarded-for");
    const extractedIp = xff ? xff.split(",")[0].trim() : (req.headers.get("x-real-ip") || "");
    const debug: Record<string, unknown> = { extractedIp };
    try {
      const r1 = await fetch(`https://ipwho.is/${encodeURIComponent(extractedIp)}`);
      debug.ipwhois = { status: r1.status, body: await r1.json() };
    } catch (e) {
      debug.ipwhois = { error: e.message };
    }
    try {
      const r2 = await fetch(`https://ipapi.co/${encodeURIComponent(extractedIp)}/json/`);
      debug.ipapico = { status: r2.status, body: await r2.json() };
    } catch (e) {
      debug.ipapico = { error: e.message };
    }
    return Response.json({ ...result, _debug: debug });
  } catch {
    return Response.json({ region: "br", currency: "BRL", country: "", countryCode: "" });
  }
}