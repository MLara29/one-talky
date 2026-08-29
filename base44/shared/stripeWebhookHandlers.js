import { secrets } from "base44:runtime";
import { CATALOG } from "./paymentCatalog.js";
import { isZeroDecimal } from "./regionalPricing.js";
import { recordAffiliateCommission } from "./affiliateCommission.js";
import { computeCreditUpdate, getPlanGraceExpiryDays } from "./studentCredits.js";
import { getFinanceSettings } from "./financeSettings.js";
import { sendPurchaseEvent } from "./metaConversions.js";

// ──────────────────────────────────────────────────────────────────────────
// Shared Stripe webhook logic — used by BOTH the production webhook
// (stripeWebhook) and the isolated test webhook (stripeWebhookTest).
//
// The two entry files are thin wrappers that handle signature verification
// (with their own webhook secret) and idempotency (with their own key prefix),
// then delegate fulfillment to `fulfillStripeEvent` here, passing an `opts`
// object that selects the Stripe API key, log prefix, Meta test mode, etc.
//
// opts:
//   logPrefix            — console tag ("[stripeWebhook]" / "[stripeWebhookTest]")
//   secretKeyName        — which secret holds the Stripe API key
//   testEventCode        — Meta test_event_code (null = production; string = test)
//   skipTestEvents       — true for production (skip metadata.test="true"),
//                          false for the test webhook (process them)
//   purchaseEventIdPrefix — "purchase_" (prod) / "purchase_test_" (test)
// ──────────────────────────────────────────────────────────────────────────

// ── Stripe signature verification (HMAC-SHA256 via Web Crypto) ────────────────
export async function verifyStripeSignature(payload, sigHeader, secret) {
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

// ── Event logging (audit trail) ──────────────────────────────────────────────
export async function logStripeEvent(base44, event, typePrefix = "") {
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
    event_type: typePrefix ? `${typePrefix}${eventType}` : eventType,
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
export async function fulfillStripeEvent(base44, event, opts) {
  const { logPrefix, skipTestEvents } = opts;
  const eventType = event.type;
  const obj = event.data?.object || {};
  const metadata = obj.metadata || {};

  if (skipTestEvents && metadata.test === "true") {
    console.log(`${logPrefix} test event — skipping fulfillment`);
    return;
  }

  if (eventType === "checkout.session.completed") {
    await handleCheckoutCompleted(base44, obj, event.id || "", opts);
  } else if (eventType === "invoice.paid") {
    await handleInvoicePaid(base44, obj, event.id || "", opts);
  } else if (eventType === "customer.subscription.deleted") {
    await handleSubscriptionDeleted(base44, obj, opts);
  }
}

// ── checkout.session.completed — first payment (one-time pack or subscription cycle 1) ─
async function handleCheckoutCompleted(base44, session, stripeEventId, opts) {
  const { logPrefix, secretKeyName, testEventCode, purchaseEventIdPrefix } = opts;
  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const externalReference = metadata.external_reference;
  const couponCode = metadata.coupon_code || "";
  const bonusMinutes = parseInt(metadata.bonus_minutes || "0", 10);

  // ── Test checkout without catalog reference (e.g. stripeCreateTestSubscription) ──
  // Skip credit fulfillment but still fire the Meta Purchase event so the
  // isolated test webhook can be validated end-to-end in the Meta Test Events
  // tool. userId comes from metadata.created_by (the admin who triggered the test).
  if (metadata.test === "true" && !externalReference) {
    const testUserId = metadata.created_by || userId || "";
    if (!testUserId) {
      console.warn(`${logPrefix} test checkout has no created_by/user_id — cannot send Purchase event`);
      return;
    }
    console.log(`${logPrefix} test checkout without external_reference — skipping credits, sending Purchase event only`);
    try {
      const purchaseValue = (session.amount_total || 0) / (isZeroDecimal(session.currency) ? 1 : 100);
      await sendPurchaseEvent(base44, {
        userId: testUserId,
        value: purchaseValue,
        currency: session.currency || "BRL",
        eventId: `${purchaseEventIdPrefix}${stripeEventId || session.id}`,
        testEventCode,
      });
    } catch (e) {
      console.warn(`${logPrefix} Meta Purchase event failed (test checkout):`, e.message);
    }
    return;
  }

  if (!userId || !externalReference) {
    console.warn(`${logPrefix} checkout.session.completed missing metadata — skipping`);
    return;
  }

  const item = CATALOG[externalReference];
  if (!item) {
    console.error(`${logPrefix} unknown external_reference: ${externalReference}`);
    return;
  }

  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: userId });
  if (profiles.length === 0) {
    console.error(`${logPrefix} StudentProfile not found for user ${userId}`);
    return;
  }
  const profile = profiles[0];

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
    externalReference,
    item,
    couponCode,
    bonusMinutes,
    appliedCoupon,
    isRenewal: false,
  });
  const updateData = { ...creditUpdate };
  if (item.plan) updateData.plan = item.plan;

  if (session.mode === "subscription") {
    updateData.subscription_status = "active";
    updateData.subscription_start_date = new Date().toISOString();
    updateData.subscription_cycle = 1;
    updateData.subscription_provider = "stripe";
    updateData.stripe_subscription_id = session.subscription || "";
    let paymentIntentId = session.payment_intent;
    if (!paymentIntentId && session.customer) {
      try {
        const secretKey = secrets.get(secretKeyName);
        if (secretKey) {
          const chargesRes = await fetch(
            `https://api.stripe.com/v1/charges?customer=${encodeURIComponent(session.customer)}&limit=5`,
            { headers: { Authorization: `Bearer ${secretKey}` } }
          );
          const chargesData = await chargesRes.json();
          const charges = chargesData?.data || [];
          const eligibleCharges = charges.filter(c => c.status === "succeeded" && !c.refunded);
          const matchingCharge =
            eligibleCharges.find(c => c.metadata?.external_reference?.startsWith("plan:")) ||
            eligibleCharges[0];
          paymentIntentId = matchingCharge?.payment_intent || null;
        }
      } catch (e) {
        console.error(`${logPrefix} failed to fetch payment_intent from charges:`, e.message);
      }
    }
    updateData.stripe_payment_intent_id = paymentIntentId || "";
  }

  await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);
  console.log(`${logPrefix} credited ${item.minutes + bonusMinutes} min to user ${userId} (${externalReference})`);

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
        console.warn(`${logPrefix} CAS mismatch on Coupon.used_count for ${coupon.code} — concurrent redemption.`);
      }
    }
  }

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

  try {
    const grossAmount = (session.amount_total || 0) / (isZeroDecimal(session.currency) ? 1 : 100);
    const settings = await getFinanceSettings(base44);
    const estimatedFee = (grossAmount * (settings.stripe_card_pct || 0) / 100) + (settings.stripe_card_fixed || 0);
    await base44.asServiceRole.entities.PaymentRecord.create({
      student_id: userId,
      provider: "stripe",
      type: externalReference.startsWith("plan:") ? "plan" : "pack",
      reference: externalReference,
      gross_amount: grossAmount,
      coupon_code: couponCode || "",
      discount_amount: (item.price - grossAmount) || 0,
      estimated_fee: estimatedFee,
      net_amount: grossAmount - estimatedFee,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn(`${logPrefix} PaymentRecord creation failed (checkout):`, e.message);
  }

  // ── Meta Conversions API — "Purchase" event (server-side) ──────────────
  try {
    const purchaseValue = (session.amount_total || 0) / (isZeroDecimal(session.currency) ? 1 : 100);
    await sendPurchaseEvent(base44, {
      userId,
      value: purchaseValue,
      currency: session.currency || "BRL",
      eventId: `${purchaseEventIdPrefix}${stripeEventId || session.id}`,
      testEventCode,
    });
  } catch (e) {
    console.warn(`${logPrefix} Meta Purchase event failed (checkout):`, e.message);
  }
}

// ── invoice.paid — renewal (cycle 2+) ────────────────────────────────────────
async function handleInvoicePaid(base44, invoice, stripeEventId, opts) {
  const { logPrefix, secretKeyName, testEventCode, purchaseEventIdPrefix } = opts;

  if (invoice.billing_reason === "subscription_create") {
    console.log(`${logPrefix} invoice.paid (subscription_create) — skipping (handled by checkout.session.completed)`);
    return;
  }

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    console.warn(`${logPrefix} invoice.paid without subscription — skipping`);
    return;
  }

  const secretKey = secrets.get(secretKeyName);
  if (!secretKey) {
    console.error(`${logPrefix} ${secretKeyName} not configured — cannot retrieve subscription`);
    return;
  }

  const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const subscription = await subRes.json();
  if (!subRes.ok) {
    console.error(`${logPrefix} failed to retrieve subscription ${subscriptionId}:`, JSON.stringify(subscription));
    return;
  }

  const metadata = subscription.metadata || {};
  if (opts.skipTestEvents && metadata.test === "true") {
    console.log(`${logPrefix} invoice.paid for test subscription — skipping`);
    return;
  }

  const userId = metadata.user_id;
  const externalReference = metadata.external_reference;

  // ── Test renewal without catalog reference (e.g. stripeCreateTestSubscription) ──
  // Skip credit fulfillment but still fire the Meta Purchase event so the
  // isolated test webhook renewal flow can be validated in the Meta Test Events
  // tool. userId comes from metadata.created_by on the subscription.
  if (metadata.test === "true" && !externalReference) {
    const testUserId = metadata.created_by || userId || "";
    if (!testUserId) {
      console.warn(`${logPrefix} test invoice has no created_by/user_id — cannot send Purchase event`);
      return;
    }
    console.log(`${logPrefix} test invoice without external_reference — skipping credits, sending Purchase event only`);
    try {
      const purchaseValue = (invoice.amount_paid || 0) / (isZeroDecimal(invoice.currency) ? 1 : 100);
      await sendPurchaseEvent(base44, {
        userId: testUserId,
        value: purchaseValue,
        currency: invoice.currency || "BRL",
        eventId: `${purchaseEventIdPrefix}${stripeEventId || invoice.id}`,
        testEventCode,
      });
    } catch (e) {
      console.warn(`${logPrefix} Meta Purchase event failed (test invoice):`, e.message);
    }
    return;
  }

  if (!userId || !externalReference) {
    console.warn(`${logPrefix} invoice.paid subscription missing metadata — skipping`);
    return;
  }

  const item = CATALOG[externalReference];
  if (!item) {
    console.error(`${logPrefix} unknown external_reference: ${externalReference}`);
    return;
  }

  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: userId });
  if (profiles.length === 0) {
    console.error(`${logPrefix} StudentProfile not found for user ${userId}`);
    return;
  }
  const profile = profiles[0];

  const creditUpdate = await computeCreditUpdate(base44, {
    profile,
    externalReference,
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
  console.log(`${logPrefix} renewal: credited ${item.minutes} min to user ${userId} (cycle ${(profile.subscription_cycle ?? 1) + 1})`);

  await recordAffiliateCommission(base44, {
    couponCode: profile.coupon_code || "",
    externalReference,
    planId: item.plan || externalReference,
    studentId: userId,
    studentName: profile.full_name || "",
    paymentId: invoice.id,
  });

  try {
    const grossAmount = (invoice.amount_paid || 0) / (isZeroDecimal(invoice.currency) ? 1 : 100);
    const settings = await getFinanceSettings(base44);
    const estimatedFee = (grossAmount * (settings.stripe_card_pct || 0) / 100) + (settings.stripe_card_fixed || 0);
    await base44.asServiceRole.entities.PaymentRecord.create({
      student_id: userId,
      provider: "stripe",
      type: "plan",
      reference: externalReference,
      gross_amount: grossAmount,
      coupon_code: profile.coupon_code || "",
      discount_amount: 0,
      estimated_fee: estimatedFee,
      net_amount: grossAmount - estimatedFee,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn(`${logPrefix} PaymentRecord creation failed (invoice):`, e.message);
  }

  // ── Meta Conversions API — "Purchase" event (server-side) ──────────────
  try {
    const purchaseValue = (invoice.amount_paid || 0) / (isZeroDecimal(invoice.currency) ? 1 : 100);
    await sendPurchaseEvent(base44, {
      userId,
      value: purchaseValue,
      currency: invoice.currency || "BRL",
      eventId: `${purchaseEventIdPrefix}${stripeEventId || invoice.id}`,
      testEventCode,
    });
  } catch (e) {
    console.warn(`${logPrefix} Meta Purchase event failed (invoice):`, e.message);
  }
}

// ── customer.subscription.deleted — cancellation/expiry ──────────────────────
async function handleSubscriptionDeleted(base44, subscription, opts) {
  const { logPrefix, skipTestEvents } = opts;
  const metadata = subscription.metadata || {};
  if (skipTestEvents && metadata.test === "true") {
    console.log(`${logPrefix} test subscription deleted — skipping`);
    return;
  }

  const userId = metadata.user_id;
  if (!userId) {
    console.warn(`${logPrefix} subscription.deleted missing user_id metadata — skipping`);
    return;
  }

  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: userId });
  if (profiles.length === 0) {
    console.error(`${logPrefix} StudentProfile not found for user ${userId}`);
    return;
  }
  const profile = profiles[0];

  const validUntil = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  const subStartDate = profile.subscription_start_date
    ? new Date(profile.subscription_start_date) : null;
  const isWithinGuarantee = subStartDate &&
    (Date.now() - subStartDate.getTime()) < 7 * 24 * 60 * 60 * 1000;

  if (isWithinGuarantee) {
    await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
      subscription_status: "cancelled",
      subscription_valid_until: validUntil,
      plan_credits_minutes: 0,
      plan_credits_grace_expires_at: null,
      cancelled_within_guarantee: true,
    });
    console.log(`${logPrefix} subscription cancelled within guarantee for user ${userId} — plan credits zeroed immediately`);
  } else {
    const planGraceExpiresAt = new Date(Date.now() + getPlanGraceExpiryDays() * 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
      subscription_status: "cancelled",
      subscription_valid_until: validUntil,
      plan_credits_grace_expires_at: planGraceExpiresAt,
    });
    console.log(`${logPrefix} subscription cancelled for user ${userId}, valid until ${validUntil}`);
  }
}