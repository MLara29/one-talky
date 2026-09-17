import { createClientFromRequest } from "npm:@base44/sdk@0.8.48";

// Sets urgency_offer_expires_at = now + 15 minutes for the current student.
// Called from Classroom.jsx when a lesson ends and the student is eligible
// for the urgency offer (plan === "free" && signup_coupon_has_discount === false).
// Returns the timestamp so the client can start the countdown from it.
//
// StudentProfile.update is admin-only (RLS), so this runs as service role.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) {
      return Response.json({ error: "StudentProfile not found" }, { status: 404 });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.StudentProfile.update(profiles[0].id, {
      urgency_offer_expires_at: expiresAt,
    });

    return Response.json({ success: true, urgency_offer_expires_at: expiresAt });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}