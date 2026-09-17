import { createClientFromRequest } from "npm:@base44/sdk@0.8.48";

// Marks welcome_modal_shown = true on the current student's profile.
// Called from WelcomeModal.jsx when the student closes the welcome modal.
// Uses asServiceRole because StudentProfile.update is admin-only (RLS).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) {
      return Response.json({ error: "StudentProfile not found" }, { status: 404 });
    }

    await base44.asServiceRole.entities.StudentProfile.update(profiles[0].id, {
      welcome_modal_shown: true,
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}