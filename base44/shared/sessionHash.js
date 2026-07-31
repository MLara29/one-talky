// Derives a stable per-session identifier from the request's own bearer token.
// The Base44 SDK/user object doesn't expose a session/jti field, so instead of
// gating on a User-level flag (which any tab/device sharing the same account
// would see), we hash the EXACT token behind this specific request. A
// different tab/browser holds a different token → a different hash → its own
// independent verification state. We hash (never store) the raw token.
export async function getSessionHash(req) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const digestBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digestBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Best-effort: read `exp` from the JWT payload (not signature-verified here —
  // verification already happened via createClientFromRequest/auth.me()).
  // Only used so a verified-session record never outlives its own token.
  let exp = null;
  try {
    const payloadB64 = token.split('.')[1];
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (payload?.exp) exp = new Date(payload.exp * 1000).toISOString();
  } catch {
    // Not a decodable JWT — caller falls back to a default TTL.
  }

  return { hash, exp };
}