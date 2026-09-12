import { secrets } from "base44:runtime";

// Server-side TikTok Events API — shared logic for conversion events.
// Used by the sendTikTokConversion backend function AND directly by the
// Stripe webhook (no HTTP round-trip) for the "Purchase" event, mirroring
// the Meta CAPI pattern in metaConversions.js. Best-effort: never throws,
// never blocks fulfillment.
//
// Endpoint: POST https://business-api.tiktok.com/open_api/v1.3/event/track/
//   Headers: Access-Token + Content-Type
//   Body: { pixel_code, test_event_code?, events: [{ event, event_time,
//          event_id?, user_data, properties? }] }
//   Success: HTTP 200 + JSON { code: 0, message: "OK" }
//
// Idempotency: TikTok deduplicates events with the same event_id. Pass a
// stable eventId (e.g. the Stripe event id) so webhook retries don't create
// duplicate Purchase events.

const API_ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Send a conversion event to TikTok Events API.
//
// Params:
//   base44       — SDK client (from createClientFromRequest)
//   eventName    — "CompleteRegistration" | "Purchase" | any TikTok-standard event
//   value        — numeric amount (major units) — only for Purchase/money events
//   currency     — ISO 4217 code (BRL, USD, EUR, JPY, KRW)
//   eventId      — stable dedup key (use the Stripe event id so retries dedupe)
//   userId       — the user's id (used to hash email + external_id)
//   email        — raw email (optional; if absent, looked up from User by userId)
//   ip           — visitor IP (optional)
//   userAgent    — visitor UA (optional)
//   testEventCode — explicit test code; falls back to TIKTOK_TEST_EVENT_CODE secret
export async function sendTikTokEvent(base44, {
  eventName,
  value = null,
  currency = "BRL",
  eventId = "",
  userId = "",
  email = "",
  ip = "",
  userAgent = "",
  testEventCode = null,
}) {
  const accessToken = secrets.get("TIKTOK_ACCESS_TOKEN");
  const pixelCode = secrets.get("TIKTOK_PIXEL_CODE");
  if (!accessToken || !pixelCode) {
    console.error("[tiktokConversions] TIKTOK_ACCESS_TOKEN or TIKTOK_PIXEL_CODE not configured");
    return { ok: false, reason: "no_credentials" };
  }

  // Test event code: explicit param takes priority, then secret. Empty = production.
  const testCode = testEventCode ?? secrets.get("TIKTOK_TEST_EVENT_CODE") ?? "";

  // Look up the user's email server-side if not provided (webhook has no browser session).
  let emailHash = "";
  const rawEmail = email ? String(email) : "";
  if (rawEmail) {
    emailHash = await sha256Hex(rawEmail);
  } else if (userId) {
    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      if (users[0]?.email) emailHash = await sha256Hex(users[0].email);
    } catch (e) {
      console.warn("[tiktokConversions] user email lookup failed:", e.message);
    }
  }

  const userData = {};
  if (emailHash) userData.email = [emailHash];
  if (userId) userData.external_id = [await sha256Hex(userId)];
  if (ip) userData.client_ip = ip;
  if (userAgent) userData.client_user_agent = userAgent;

  const evt = {
    event: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: userData,
  };
  if (eventId) evt.event_id = eventId;

  // properties (value/currency) only for money events
  if (value != null && value !== "") {
    evt.properties = {
      currency: String(currency || "BRL").toUpperCase(),
      value: Number(value) || 0,
    };
  }

  const payload = { pixel_code: pixelCode, events: [evt] };
  if (testCode) payload.test_event_code = testCode;

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const resultText = await res.text();
    let resultJson = null;
    try { resultJson = JSON.parse(resultText); } catch { /* non-JSON */ }

    if (!res.ok) {
      console.error("[tiktokConversions] TikTok API HTTP error:", res.status, resultText);
      return { ok: false, status: res.status, code: resultJson?.code, message: resultJson?.message, raw: resultText };
    }

    // TikTok returns code:0 on success, non-zero on logical error.
    const code = resultJson?.code;
    const ok = code === 0;
    if (!ok) {
      console.error(`[tiktokConversions] TikTok API non-zero code (${code}):`, resultJson?.message);
    } else {
      console.log(`[tiktokConversions] ${eventName} event sent (event_id=${eventId || "n/a"}, value=${value ?? "n/a"} ${currency || ""}${testCode ? ", test_mode" : ""})`);
    }
    return { ok, status: res.status, code, message: resultJson?.message, raw: resultText };
  } catch (e) {
    console.error("[tiktokConversions] unexpected error:", e.message);
    return { ok: false, error: e.message };
  }
}