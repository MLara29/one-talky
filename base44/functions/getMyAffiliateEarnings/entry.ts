import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Secure endpoint: an affiliate reads ONLY their own commission earnings.
// The AffiliateEarning.affiliate_id stores the Affiliate record's id (not the
// user id), so an RLS rule comparing affiliate_id to {{user.id}} never matches.
// This function resolves the correct Affiliate.id from the user's session and
// reads via the service role, so the affiliate sees exactly their own records.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "affiliate") return Response.json({ error: "Forbidden" }, { status: 403 });

    const affiliates = await base44.asServiceRole.entities.Affiliate.filter({ user_id: user.id });
    if (affiliates.length === 0) {
      return Response.json({ earnings: [] });
    }
    const aff = affiliates[0];

    const earnings = await base44.asServiceRole.entities.AffiliateEarning.filter(
      { affiliate_id: aff.id },
      "-sale_date",
      200
    );

    return Response.json({ earnings });
  } catch (error) {
    console.error("[getMyAffiliateEarnings]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}