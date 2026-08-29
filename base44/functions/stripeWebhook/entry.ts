import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { verifyStripeSignature, logStripeEvent, fulfillStripeEvent } from "../../shared/stripeWebhookHandlers.js";

// Stripe webhook (PRODUCTION) — receives ALL Stripe events.
// 1. Logs every event to StripeTestEvent (audit trail, admin dashboard).
// 2. For production events (metadata[test] !== "true"), fulfills the purchase:
//    - checkout.session.completed → first payment (pack or subscription cycle 1)
//    - invoice.paid (billing_reason=subscription_cycle) → renewal (cycle 2+)
//    - customer.subscription.deleted → mark cancelled, set valid_until
// 3. Idempotent via ProcessedPayment (keyed by Stripe event ID, prefix "stripe_").
//
// Uses exclusively production secrets: STRIPE_WEBHOOK_SECRET (signature) and
// STRIPE_SECRET_KEY (Stripe API). The isolated test path (stripeWebhookTest)
// uses STRIPE_TEST_WEBHOOK_SECRET / STRIPE_TEST_SECRET_KEY instead.
//
// Always returns 200 so Stripe doesn't retry (errors are logged).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();
    const sigHeader = req.headers.get("Stripe-Signature") || "";

    let event;
    const webhookSecret = secrets.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret) {
      const verified = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
      if (!verified) {
        console.error("[stripeWebhook] signature verification failed");
        return Response.json({ error: "Invalid signature" }, { status: 400 });
      }
      event = JSON.parse(rawBody);
    } else {
      console.error("[stripeWebhook] STRIPE_WEBHOOK_SECRET não configurado — rejeitando evento por segurança.");
      return Response.json({ error: "Webhook not configured" }, { status: 500 });
    }

    console.log("[stripeWebhook] event received:", event.type, event.id);

    // ── 1) Log every event to StripeTestEvent (audit) ──────────────────────────
    await logStripeEvent(base44, event);

    // ── 2) Idempotency — skip if this Stripe event was already processed ──────
    const eventId = event.id || "";
    const idempotencyKey = `stripe_${eventId}`;
    const alreadyProcessed = await base44.asServiceRole.entities.ProcessedPayment.filter({
      payment_id: idempotencyKey,
    });
    if (alreadyProcessed.length > 0) {
      console.log(`[stripeWebhook] event ${eventId} already processed — skipping fulfillment`);
      return Response.json({ received: true, duplicate: true });
    }

    // ── 3) Fulfill production events ──────────────────────────────────────────
    try {
      await fulfillStripeEvent(base44, event, {
        logPrefix: "[stripeWebhook]",
        secretKeyName: "STRIPE_SECRET_KEY",
        testEventCode: null, // production — sendPurchaseEvent falls back to META_TEST_EVENT_CODE only if set
        skipTestEvents: true,
        purchaseEventIdPrefix: "purchase_",
      });
      // Mark as processed only after successful fulfillment.
      const obj = event.data?.object || {};
      await base44.asServiceRole.entities.ProcessedPayment.create({
        payment_id: idempotencyKey,
        user_id: obj.metadata?.user_id || "stripe_webhook",
      });
    } catch (fulfillErr) {
      console.error(`[stripeWebhook] fulfillment error for ${eventId}:`, fulfillErr.message);
      // Don't mark as processed — Stripe will retry.
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error("[stripeWebhook] error:", e.message);
    return Response.json({ received: true });
  }
}