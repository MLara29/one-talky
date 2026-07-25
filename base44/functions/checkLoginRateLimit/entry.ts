/**
 * checkLoginRateLimit
 *
 * Called by the frontend BEFORE calling base44.auth.loginViaEmailPassword.
 * Returns { allowed: true } or { allowed: false, retryAfterMinutes: N }.
 * Also records the blocked attempt in LoginAttempt for audit.
 *
 * Public endpoint — no user auth required (user is not logged in yet).
 * Security: we never reveal whether the email exists. All error messages are generic.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { checkLimit, recordAttempt, cleanupOldAttempts, formatRetryMinutes } from "../../shared/loginRateLimit.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = (body.email || "").toLowerCase().trim();

    if (!email) {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    // Best-effort IP extraction
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const result = await checkLimit(base44.asServiceRole, email, ip);

    if (result.blocked) {
      const minutes = formatRetryMinutes(result.retryAfterMs);
      // Record this blocked attempt for audit (server-side only)
      await recordAttempt(base44.asServiceRole, email, ip, false, true);
      return Response.json({
        allowed: false,
        retryAfterMinutes: minutes,
        message: `Muitas tentativas de login. Tente novamente em ${minutes} minuto(s).`,
      });
    }

    // "allowed: true" — the actual auth result will be reported by the frontend
    // via the recordAuthResult action flag on a subsequent call
    const action = body.action; // "record_failure" | "record_success" | undefined

    if (action === "record_failure") {
      await recordAttempt(base44.asServiceRole, email, ip, false, false);
    } else if (action === "record_success") {
      await recordAttempt(base44.asServiceRole, email, ip, true, false);
      cleanupOldAttempts(base44.asServiceRole); // fire-and-forget
    }

    return Response.json({ allowed: true });
  } catch (error) {
    console.error("[checkLoginRateLimit]", error.message);
    // Fail open — if rate limit check itself errors, don't block the user
    return Response.json({ allowed: true });
  }
});