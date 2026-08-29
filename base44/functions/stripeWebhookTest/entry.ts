import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { verifyStripeSignature, logStripeEvent, fulfillStripeEvent } from "../../shared/stripeWebhookHandlers.js";

// ──────────────────────────────────────────────────────────────────────────
// stripeWebhookTest — ISOLATED TEST webhook for Stripe TEST-mode events.
//
// This is the test-mode twin of stripeWebhook. It shares the exact same
// fulfillment logic (via stripeWebhookHandlers.js) but is fully isolated:
//   - Verifies signatures with STRIPE_TEST_WEBHOOK_SECRET (NOT production).
//   - Calls the Stripe API with STRIPE_TEST_SECRET_KEY (NOT production) —
//     never touches live charges or live data.
//   - Idempotency keys are prefixed `stripetest_` so they never collide with
//     production ProcessedPayment records.
//   - Processes test-flagged events (metadata.test === "true") — the
//     production webhook skips these; this one handles them so the full test
//     flow (credits, PaymentRecord, Meta Purchase) can be exercised.
//   - Every Meta Purchase event includes testEventCode from the
//     META_TEST_EVENT_CODE secret, so events land in the Meta Test Events
//     tool instead of production ad optimization.
//
// Public URL (register in the Stripe dashboard → Developers → Webhooks,
// TEST mode, as a SEPARATE endpoint from the production one):
//   https://just-speak.base44.app/functions/stripeWebhookTest
//
// Production checkout (stripeCreateCheckout) and production webhook
// (stripeWebhook) are untouched and continue using STRIPE_SECRET_KEY /
// STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET exclusively.
// ──────────────────────────────────────────────────────────────────────────

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();
    const sigHeader = req.headers.get("Stripe-Signature") || "";

    let event;
    const webhookSecret = secrets.get("STRIPE_TEST_WEBHOOK_SECRET");
    if (webhookSecret) {
      const verified = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
      if (!verified) {
        console.error("[stripeWebhookTest] signature verification failed");
        return Response.json({ error: "Invalid signature" }, { status: 400 });
      }
      event = JSON.parse(rawBody);
    } else {
      console.error("[stripeWebhookTest] STRIPE_TEST_WEBHOOK_SECRET não configurado — rejeitando evento por segurança.");
      return Response.json({ error: "Webhook not configured" }, { status: 500 });
    }

    console.log("[stripeWebhookTest] event received:", event.type, event.id);

    // ── 1) Log every event to StripeTestEvent (audit, prefixed TEST_) ────────
    await logStripeEvent(base44, event, "TEST_");

    // ── 2) Idempotency — distinct prefix from production ─────────────────────
    const eventId = event.id || "";
    const idempotencyKey = `stripetest_${eventId}`;
    const alreadyProcessed = await base44.asServiceRole.entities.ProcessedPayment.filter({
      payment_id: idempotencyKey,
    });
    if (alreadyProcessed.length > 0) {
      console.log(`[stripeWebhookTest] event ${eventId} already processed — skipping fulfillment`);
      return Response.json({ received: true, duplicate: true });
    }

    // ── 3) Fulfill test events ────────────────────────────────────────────────
    try {
      await fulfillStripeEvent(base44, event, {
        logPrefix: "[stripeWebhookTest]",
        secretKeyName: "STRIPE_TEST_SECRET_KEY",
        testEventCode: secrets.get("META_TEST_EVENT_CODE") || "",
        skipTestEvents: false,
        purchaseEventIdPrefix: "purchase_test_",
      });
      await base44.asServiceRole.entities.ProcessedPayment.create({
        payment_id: idempotencyKey,
        user_id: (event.data?.object?.metadata?.user_id) || "stripe_webhook_test",
      });
    } catch (fulfillErr) {
      console.error(`[stripeWebhookTest] fulfillment error for ${eventId}:`, fulfillErr.message);
      // Don't mark as processed — Stripe will retry.
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error("[stripeWebhookTest] error:", e.message);
    return Response.json({ received: true });
  }
}