// Server-side 2FA enforcement guard.
// Admin/tutor accounts must have completed OTP verification for their CURRENT
// login session before they can perform privileged actions. base44.auth.me()
// always does a live DB read, so `user.otp_verified_at` / `otp_session_token`
// here reflect real-time state — never trust a cached/JWT-embedded value.
//
// Usage: const gate = requireOtp(user); if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
export function requireOtp(user) {
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };

  // Only admin/tutor accounts go through 2FA — everyone else passes through.
  if (user.role !== 'admin' && user.role !== 'tutor') {
    return { ok: true };
  }

  if (!user.otp_verified_at || !user.otp_session_token) {
    return { ok: false, status: 403, error: 'otp_required' };
  }

  return { ok: true };
}