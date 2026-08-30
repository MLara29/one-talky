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
    // DIAGNÓSTICO TEMPORÁRIO (2026-08-29) — celular brasileiro sendo
    // classificado como EUA. Preciso ver de qual camada (cf-ipcountry vs
    // extração de IP) vem esse resultado errado. Remover depois.
    const xff = req.headers.get("x-forwarded-for");
    const extractedIp = xff ? xff.split(",")[0].trim() : (req.headers.get("x-real-ip") || "");
    const debug = {
      cfIpCountry: req.headers.get("cf-ipcountry"),
      cfConnectingIp: req.headers.get("cf-connecting-ip"),
      trueClientIp: req.headers.get("true-client-ip"),
      xForwardedFor: xff,
      extractedIp,
      userAgent: req.headers.get("user-agent"),
    };
    return Response.json({ ...result, _debug: debug });
  } catch {
    return Response.json({ region: "br", currency: "BRL", country: "", countryCode: "" });
  }
}
