import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { sendPurchaseEvent } from "../../shared/metaConversions.js";

// Server-side Meta Conversions API — "Purchase" event.
//
// In production this is called directly (no HTTP round-trip) from the Stripe
// webhook (stripeWebhook/entry.ts) when a payment is confirmed:
//   - checkout.session.completed → first purchase (plan cycle 1 or prepaid pack)
//   - invoice.paid (billing_reason=subscription_cycle) → renewal (cycle 2+)
//
// This backend function wrapper exists so the Purchase event can be tested
// independently via the dashboard (test_backend_function). It is best-effort
// and never blocks fulfillment.
//
// ⚠️  ADMIN-ONLY: only role="admin" may call this. This prevents anyone from
//     firing fake Purchase events into production Meta ad data. The production
//     webhook (stripeWebhook) does NOT go through this function — it calls
//     sendPurchaseEvent directly — so this gate does not affect real purchases.
//
// ⚠️  TEST-FIRST DEFAULT: if no testEventCode is passed explicitly in the body,
//     this function automatically falls back to the META_TEST_EVENT_CODE secret
//     BEFORE calling sendPurchaseEvent. This means a manual test call can never
//     accidentally fire a production Purchase event — it always lands in the
//     Meta Test Events tool unless you explicitly pass testEventCode: "" to
//     force production (which only an admin can do, and only on purpose).
//
// Idempotency: Meta deduplicates by event_id within 24h. Pass a stable
// eventId (e.g. the Stripe event id) so webhook retries don't create
// duplicate Purchase events.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // ── Auth gate: admin-only ──────────────────────────────────────────────
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden — admin only" }, { status: 403 });

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const { userId, value, currency, eventId, testEventCode } = body || {};
    if (!userId || !eventId) {
      return Response.json({ error: "userId and eventId are required" }, { status: 400 });
    }

    // ── Test-first fallback ─────────────────────────────────────────────────
    // Explicit body param wins. If absent, fall back to the META_TEST_EVENT_CODE
    // secret so manual tests never hit production. Pass testEventCode: "" to
    // explicitly force a production event (admin-only, intentional).
    const resolvedTestCode =
      testEventCode !== undefined
        ? testEventCode
        : (secrets.get("META_TEST_EVENT_CODE") || "");

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
      testEventCode: resolvedTestCode,
    });
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[sendMetaPurchase] error:", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}