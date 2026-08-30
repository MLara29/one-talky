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
    return Response.json(result);
  } catch {
    return Response.json({ region: "br", currency: "BRL", country: "", countryCode: "" });
  }
}
