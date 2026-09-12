// Client-side TikTok Pixel helpers.
// Safely no-op when the pixel (window.ttq) isn't loaded (ad blockers, CSP, etc.).
// PII fields passed to ttq.identify are SHA-256 hashed on the client side,
// per TikTok's spec — never send raw email/phone to the pixel.

async function sha256Hex(str) {
  if (!str) return null;
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

// Identify the current user to the TikTok pixel with hashed PII.
// Call once after the user is authenticated (email + user id available).
export async function ttqIdentify({ email, userId } = {}) {
  try {
    if (typeof window === "undefined" || typeof window.ttq?.identify !== "function") return;
    const data = {};
    if (email) {
      const h = await sha256Hex(String(email).trim().toLowerCase());
      if (h) data.email = h;
    }
    if (userId) {
      const h = await sha256Hex(String(userId));
      if (h) data.external_id = h;
    }
    if (Object.keys(data).length) window.ttq.identify(data);
  } catch {
    /* best-effort — never block UI */
  }
}

// Fire a standard TikTok pixel track event. No-op if the pixel is unavailable.
export function ttqTrack(event, params = {}) {
  try {
    if (typeof window === "undefined" || typeof window.ttq?.track !== "function") return;
    window.ttq.track(event, params);
  } catch {
    /* best-effort */
  }
}