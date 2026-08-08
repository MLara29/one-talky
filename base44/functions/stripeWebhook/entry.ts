import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { CATALOG } from "../../shared/paymentCatalog.js";
import { recordAffiliateCommission } from "../../shared/affiliateCommission.js";
import { computeCreditUpdate } from "../../shared/studentCredits.js";

// Stripe webhook — receives ALL Stripe events.
// 1. Logs every event to StripeTestEvent (audit trail, admin dashboard).
// 2. For production events (metadata[test] !== "true"), fulfills the purchase:
//    - checkout.session.completed → first payment (pack or subscription cycle 1)
//    - invoice.paid (billing_reason=subscription_cycle) → renewal (cycle 2+)
//    - customer.subscription.deleted → mark cancelled, set valid_until
// 3. Idempotent via ProcessedPayment (keyed by Stripe event ID).
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
      console.warn("[stripeWebhook] STRIPE_WEBHOOK_SECRET não configurado — aceitando evento sem verificação (modo teste).");
      event = JSON.parse(rawBody);
    }

    console.log("[stripeWebhook] event received:", event.type, event.id);

    // ── 1) Log every event to StripeTestEvent (audit) ──────────────────────────
    await logEvent(base44, event);

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
      await fulfillEvent(base44, event);
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

// ── Event logging (audit trail) ──────────────────────────────────────────────
async function logEvent(base44, event) {
  const obj = event.data?.object || {};
  let eventType = event.type || "UNKNOWN";
  let subscriptionId = obj.subscription || obj.id || "";
  let invoiceId = obj.id || "";
  let checkoutSessionId = event.type === "checkout.session.completed" ? obj.id || "" : "";
  let customerId = obj.customer || "";
  let amountPaid = typeof obj.amount_paid === "number" ? obj.amount_paid : null;
  let status = obj.status || "";
  let clockId = obj.test_clock || "";

  if (event.type === "checkout.session.completed") {
    subscriptionId = obj.subscription || "";
    checkoutSessionId = obj.id || "";
    invoiceId = "";
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    subscriptionId = obj.subscription || "";
    invoiceId = obj.id || "";
    customerId = obj.customer || "";
  }
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    subscriptionId = obj.id || "";
    customerId = obj.customer || "";
    clockId = obj.test_clock || "";
    checkoutSessionId = "";
    invoiceId = "";
  }

  await base44.asServiceRole.entities.StripeTestEvent.create({
    event_type: eventType,
    subscription_id: subscriptionId || "",
    invoice_id: invoiceId || "",
    checkout_session_id: checkoutSessionId,
    customer_id: customerId || "",
    clock_id: clockId || "",
    amount_paid: amountPaid,
    status: status || "",
    received_at: new Date().toISOString(),
    raw_payload: JSON.stringify(event),
  });
}

// ── Fulfillment dispatcher ───────────────────────────────────────────────────
async function fulfillEvent(base44, event) {
  const eventType = event.type;
  const obj = event.data?.object || {};
  const metadata = obj.metadata || {};

  // Test events (created by stripeCreateTestSubscription) are logged only.
  if (metadata.test === "true") {
    console.log("[stripeWebhook] test event — skipping fulfillment");
    return;
  }

  if (eventType === "checkout.session.completed") {
    await handleCheckoutCompleted(base44, obj);
  } else if (eventType === "invoice.paid") {
    await handleInvoicePaid(base44, obj);
  } else if (eventType === "customer.subscription.deleted") {
    await handleSubscriptionDeleted(base44, obj);
  }
  // invoice.payment_failed and other events: logged only, no fulfillment.
}

// ── checkout.session.completed — first payment (one-time pack or subscription cycle 1) ─
async function handleCheckoutCompleted(base44, session) {
  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const externalReference = metadata.external_reference;
  const couponCode = metadata.coupon_code || "";
  const bonusMinutes = parseInt(metadata.bonus_minutes || "0", 10);

  if (!userId || !externalReference) {
    console.warn("[stripeWebhook] checkout.session.completed missing metadata — skipping");
    return;
  }

  const item = CATALOG[externalReference];
  if (!item) {
    console.error(`[stripeWebhook] unknown external_reference: ${externalReference}`);
    return;
  }

  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: userId });
  if (profiles.length === 0) {
    console.error(`[stripeWebhook] StudentProfile not found for user ${userId}`);
    return;
  }
  const profile = profiles[0];

  // Look up the coupon record for CouponUsage tracking (bonus minutes + cycle tracking).
  let appliedCoupon = null;
  if (couponCode) {
    const coupons = await base44.asServiceRole.entities.Coupon.filter({
      code: String(couponCode).toUpperCase(),
      is_active: true,
    });
    appliedCoupon = coupons[0] || null;
  }

  const creditUpdate = await computeCreditUpdate(base44, {
    profile,
    externalReference: externalReference,
    item,
    couponCode,
    bonusMinutes,
    appliedCoupon,
    isRenewal: false,
  });
  const updateData = { ...creditUpdate };
  if (item.plan) updateData.plan = item.plan;

  // Subscription first payment — activate subscription tracking.
  if (session.mode === "subscription") {
    updateData.subscription_status = "active";
    updateData.subscription_start_date = new Date().toISOString();
    updateData.subscription_cycle = 1;
    updateData.subscription_provider = "stripe";
    updateData.stripe_subscription_id = session.subscription || "";
  }

  await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);
  console.log(`[stripeWebhook] credited ${item.minutes + bonusMinutes} min to user ${userId} (${externalReference})`);

  // ── Increment coupon used_count (CAS) ──────────────────────────────────────
  if (couponCode) {
    const coupons = await base44.asServiceRole.entities.Coupon.filter({
      code: String(couponCode).toUpperCase(),
      is_active: true,
    });
    const coupon = coupons[0];
    if (coupon) {
      const casResult = await base44.asServiceRole.entities.Coupon.updateMany(
        { id: coupon.id, used_count: coupon.used_count },
        { $set: { used_count: (coupon.used_count || 0) + 1 } }
      );
      if (casResult.updated === 0) {
        console.warn(`[stripeWebhook] CAS mismatch on Coupon.used_count for ${coupon.code} — concurrent redemption.`);
      }
    }
  }

  // ── Affiliate commission — SOMENTE para assinatura de plano, nunca
  //    para pacote avulso pré-pago ──────────────────────────────────────────────
  if (session.mode === "subscription") {
    await recordAffiliateCommission(base44, {
      couponCode,
      externalReference,
      planId: item.plan || externalReference,
      studentId: userId,
      studentName: profile.full_name || "",
      paymentId: session.id,
    });
  }
}

// ── invoice.paid — renewal (cycle 2+) ────────────────────────────────────────
async function handleInvoicePaid(base44, invoice) {
  // The first invoice (billing_reason=subscription_create) is already handled
  // by checkout.session.completed — skip it to avoid double-crediting.
  if (invoice.billing_reason === "subscription_create") {
    console.log("[stripeWebhook] invoice.paid (subscription_create) — skipping (handled by checkout.session.completed)");
    return;
  }

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    console.warn("[stripeWebhook] invoice.paid without subscription — skipping");
    return;
  }

  // Retrieve the subscription to read metadata (user_id, external_reference).
  const secretKey = secrets.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    console.error("[stripeWebhook] STRIPE_SECRET_KEY not configured — cannot retrieve subscription");
    return;
  }

  const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const subscription = await subRes.json();
  if (!subRes.ok) {
    console.error(`[stripeWebhook] failed to retrieve subscription ${subscriptionId}:`, JSON.stringify(subscription));
    return;
  }

  const metadata = subscription.metadata || {};
  if (metadata.test === "true") {
    console.log("[stripeWebhook] invoice.paid for test subscription — skipping");
    return;
  }

  const userId = metadata.user_id;
  const externalReference = metadata.external_reference;
  if (!userId || !externalReference) {
    console.warn("[stripeWebhook] invoice.paid subscription missing metadata — skipping");
    return;
  }

  const item = CATALOG[externalReference];
  if (!item) {
    console.error(`[stripeWebhook] unknown external_reference: ${externalReference}`);
    return;
  }

  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: userId });
  if (profiles.length === 0) {
    console.error(`[stripeWebhook] StudentProfile not found for user ${userId}`);
    return;
  }
  const profile = profiles[0];

  // Renewal: add plan minutes (no bonus — coupon was one-time), increment cycle.
  const creditUpdate = await computeCreditUpdate(base44, {
    profile,
    externalReference: externalReference,
    item,
    couponCode: "",
    bonusMinutes: 0,
    appliedCoupon: null,
    isRenewal: true,
  });
  await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
    ...creditUpdate,
    subscription_status: "active",
    subscription_cycle: (profile.subscription_cycle ?? 1) + 1,
  });
  console.log(`[stripeWebhook] renewal: credited ${item.minutes} min to user ${userId} (cycle ${(profile.subscription_cycle ?? 1) + 1})`);

  // ── Affiliate commission na renovação (todo mês, enquanto ativo) ──────────────
  // O cupom (desconto) só se aplica na primeira compra, mas a comissão do
  // afiliado recorre em todo ciclo. Usamos o coupon_code armazenado no perfil
  // do aluno para localizar o afiliado original, e invoice.id como paymentId
  // (cada invoice é única no Stripe → idempotência natural + check interno).
  await recordAffiliateCommission(base44, {
    couponCode: profile.coupon_code || "",
    externalReference,
    planId: item.plan || externalReference,
    studentId: userId,
    studentName: profile.full_name || "",
    paymentId: invoice.id,
  });
}

// ── customer.subscription.deleted — cancellation/expiry ──────────────────────
async function handleSubscriptionDeleted(base44, subscription) {
  const metadata = subscription.metadata || {};
  if (metadata.test === "true") {
    console.log("[stripeWebhook] test subscription deleted — skipping");
    return;
  }

  const userId = metadata.user_id;
  if (!userId) {
    console.warn("[stripeWebhook] subscription.deleted missing user_id metadata — skipping");
    return;
  }

  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: userId });
  if (profiles.length === 0) {
    console.error(`[stripeWebhook] StudentProfile not found for user ${userId}`);
    return;
  }
  const profile = profiles[0];

  // Mark cancelled; student keeps access until the end of the last paid period.
  const validUntil = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  // Set grace period for plan credits (60 days from now). The subscription's
  // current_period_end may be different — that controls scheduling access, while
  // plan_credits_grace_expires_at controls when the plan credits are zeroed.
  const planGraceExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
    subscription_status: "cancelled",
    subscription_valid_until: validUntil,
    plan_credits_grace_expires_at: planGraceExpiresAt,
  });
  console.log(`[stripeWebhook] subscription cancelled for user ${userId}, valid until ${validUntil}`);
}

// ── Stripe signature verification (HMAC-SHA256 via Web Crypto) ────────────────
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = {};
    sigHeader.split(",").forEach((part) => {
      const [k, v] = part.split("=");
      if (k && v) parts[k.trim()] = v.trim();
    });
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (age > 300 || age < -300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expected === signature;
  } catch {
    return false;
  }
}