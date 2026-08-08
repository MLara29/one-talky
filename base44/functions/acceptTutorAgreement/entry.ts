import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Tutor-only: records acceptance of the current Tutor Service Agreement version.
// No OTP required — this is a simple legal acceptance, not a privileged admin action.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "tutor") return Response.json({ error: "Forbidden" }, { status: 403 });

    const profiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: "Profile not found" }, { status: 404 });

    await base44.asServiceRole.entities.TutorProfile.update(profiles[0].id, {
      tutor_agreement_accepted_at: new Date().toISOString(),
      tutor_agreement_accepted_version: "2026-08-08",
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}