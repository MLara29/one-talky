import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from "../../shared/requireOtp.js";

// Non-financial fields only — commission_percent and status are server/admin controlled
// and must never be settable from the client.
const AFFILIATE_ALLOWED_FIELDS = new Set(["full_name", "pix_key", "pix_key_type", "bank_info"]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { updates } = await req.json();
    if (!updates || typeof updates !== "object") {
      return Response.json({ error: "updates object required" }, { status: 400 });
    }

    const safeUpdates = {};
    for (const key of Object.keys(updates)) {
      if (AFFILIATE_ALLOWED_FIELDS.has(key)) {
        safeUpdates[key] = updates[key];
      }
    }
    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: "No allowed fields to update" }, { status: 400 });
    }

    const affiliates = await base44.asServiceRole.entities.Affiliate.filter({ user_id: user.id });
    if (affiliates.length === 0) return Response.json({ error: "Affiliate profile not found" }, { status: 404 });

    await base44.asServiceRole.entities.Affiliate.update(affiliates[0].id, safeUpdates);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[updateMyAffiliateProfile]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});