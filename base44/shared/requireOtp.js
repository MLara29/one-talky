import { getSessionHash } from './sessionHash.js';

// Server-side 2FA enforcement guard, bound to the CURRENT session.
//
// otp_verified_at/otp_session_token on the User record are legacy/display-only —
// the real check queries OtpVerifiedSession for a record matching THIS
// request's own session hash (derived from its bearer token). This means a
// second tab/browser logged in as the same admin/tutor, which never completed
// its own OTP, always gets otp_required — even if another session for the
// same user already verified.
//
// Usage: const gate = await requireOtp(base44, req, user); if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
export async function requireOtp(base44, req, user) {
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };

  // Only admin/tutor accounts go through 2FA — everyone else passes through.
  if (user.role !== 'admin' && user.role !== 'tutor') {
    return { ok: true };
  }

  const session = await getSessionHash(req);
  if (!session?.hash) return { ok: false, status: 403, error: 'otp_required' };

  const verifiedSessions = await base44.asServiceRole.entities.OtpVerifiedSession.filter({
    user_id: user.id,
    session_hash: session.hash,
  });

  const now = new Date();
  const isValid = verifiedSessions.some(s => s.expires_at && new Date(s.expires_at) > now);
  if (!isValid) return { ok: false, status: 403, error: 'otp_required' };

  return { ok: true };
}