import { secrets } from "base44:runtime";

// Server-side Meta Conversions API — shared logic for the "Purchase" event.
// Used by the sendMetaPurchase backend function AND directly by the Stripe
// webhook (no HTTP round-trip). Best-effort: never throws, never blocks
// fulfillment.
//
// Idempotency: Meta deduplicates events with the same event_id within a 24h
// window. The Stripe webhook also skips already-processed events via
// ProcessedPayment — double protection against duplicate Purchase events on
// webhook retries.

const PIXEL_ID = "1558500632424709";
const API_VERSION = "v21.0";

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Send a "Purchase" event to Meta CAPI.
//
// Params:
//   base44       — SDK client (from createClientFromRequest)
//   userId       — the StudentProfile's user_id (used to hash email + external_id)
//   value        — numeric amount charged (major units, e.g. 59.80)
//   currency    — ISO 4217 code (BRL, USD, EUR, JPY, KRW)
//   eventId      — stable dedup key (use the Stripe event id so retries dedupe)
//   ip           — visitor IP (optional, unavailable in webhook context)
//   userAgent    — visitor UA (optional, unavailable in webhook context)
//   testEventCode — explicit test code; falls back to META_TEST_EVENT_CODE secret
export async function sendPurchaseEvent(base44, {
  userId,
  value,
  currency,
  eventId,
  ip = "",
  userAgent = "",
  testEventCode = null,
}) {
  const token = secrets.get("META_CAPI_ACCESS_TOKEN");
  if (!token) {
    console.error("[metaConversions] META_CAPI_ACCESS_TOKEN not configured");
    return { ok: false, reason: "no_token" };
  }

  // Test event code: explicit param takes priority, then secret. Empty = production.
  const testCode = testEventCode ?? secrets.get("META_TEST_EVENT_CODE") ?? "";

  // Look up the user's email server-side (webhook has no browser session).
  let emailHash = "";
  if (userId) {
    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      if (users[0]?.email) emailHash = await sha256Hex(users[0].email);
    } catch (e) {
      console.warn("[metaConversions] user email lookup failed:", e.message);
    }
  }

  const userData = {};
  if (emailHash) userData.em = [emailHash];
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;
  if (userId) userData.external_id = [await sha256Hex(userId)];

  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_id: eventId,
    user_data: userData,
    custom_data: {
      currency: String(currency || "BRL").toUpperCase(),
      value: Number(value) || 0,
    },
  };

  const payload = { data: [event] };
  if (testCode) payload.test_event_code = testCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const resultText = await res.text();
    if (!res.ok) {
      console.error("[metaConversions] Meta API error:", res.status, resultText);
      return { ok: false, status: res.status };
    }
    console.log(`[metaConversions] Purchase event sent (event_id=${eventId}, value=${event.custom_data.value} ${event.custom_data.currency}${testCode ? ", test_mode" : ""})`);
    return { ok: true };
  } catch (e) {
    console.error("[metaConversions] unexpected error:", e.message);
    return { ok: false };
  }
}