import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { sendPurchaseEvent } from "../../shared/metaConversions.js";

// Server-side Meta Conversions API — "Purchase" event.
//
// In production this is called directly (no HTTP round-trip) from the Stripe
// webhook (stripeWebhook/entry.ts) when a payment is confirmed:
//   - checkout.session.completed → first purchase (plan cycle 1 or prepaid pack)
//   - invoice.paid (billing_reason=subscription_cycle) → renewal (cycle 2+)
//
// This backend function wrapper exists so the Purchase event can be tested
// independently via the dashboard (test_backend_function) or invoked from the
// frontend if needed. It is best-effort and never blocks fulfillment.
//
// Idempotency: Meta deduplicates by event_id within 24h. Pass a stable
// eventId (e.g. the Stripe event id) so webhook retries don't create
// duplicate Purchase events.
//
// Test mode: set the META_TEST_EVENT_CODE secret to route events to the Meta
// Events Manager Test Events tool. Delete/empty the secret to go live.
// You can also pass testEventCode in the payload to override per-call.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const { userId, value, currency, eventId, testEventCode } = body || {};
    if (!userId || !eventId) {
      return Response.json({ error: "userId and eventId are required" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const userAgent = req.headers.get("user-agent") || "";

    const result = await sendPurchaseEvent(base44, {
      userId,
      value,
      currency,
      eventId,
      ip,
      userAgent,
      testEventCode,
    });
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[sendMetaPurchase] error:", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}