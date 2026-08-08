import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Any authenticated role: records acceptance of the current Terms of Use
// and Privacy Policy versions on the User record. No OTP required.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await base44.auth.updateMe({
      terms_accepted: true,
      terms_accepted_version: "2026-08-08",
      privacy_policy_accepted: true,
      privacy_policy_accepted_version: "2026-08-08",
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}