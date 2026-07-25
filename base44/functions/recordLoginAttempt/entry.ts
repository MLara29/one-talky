/**
 * recordLoginAttempt
 *
 * Called by the frontend AFTER the auth attempt (success or failure).
 * Records the result in LoginAttempt for audit and future rate limit queries.
 * On success: also triggers cleanup of old records (>48h).
 *
 * Public endpoint — no user auth required.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { recordAttempt, cleanupOldAttempts } from "../../shared/loginRateLimit.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = (body.email || "").toLowerCase().trim();
    const success = !!body.success;

    if (!email) {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    await recordAttempt(base44.asServiceRole, email, ip, success, false);

    // On successful login: clean up old records (housekeeping)
    if (success) {
      cleanupOldAttempts(base44.asServiceRole); // fire-and-forget, non-blocking
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[recordLoginAttempt]", error.message);
    // Non-critical — don't break the user flow if recording fails
    return Response.json({ ok: true });
  }
});