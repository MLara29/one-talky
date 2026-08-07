import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";

// Webhook público do Stripe — chamado pela Stripe, sem autenticação de usuário.
// Verifica a assinatura (Stripe-Signature) usando STRIPE_WEBHOOK_SECRET quando
// disponível. Se o secret não estiver configurado, aceita o evento com um aviso
// (modo de teste inicial) — cadastre o secret para produção.
// Sempre retorna 200 para a Stripe não reenviar o evento.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();
    const sigHeader = req.headers.get("Stripe-Signature") || "";

    let event;
    const webhookSecret = secrets.get("STRIPE_WEBHOOK_SECRET");

    if (webhookSecret) {
      // Verifica a assinatura usando Web Crypto (SubtleCrypto HMAC-SHA256).
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

    console.log("[stripeWebhook] event received:", event.type);

    // Extrai campos comuns do evento.
    const obj = event.data?.object || {};
    let eventType = event.type || "UNKNOWN";
    let subscriptionId = obj.subscription || obj.id || "";
    let invoiceId = obj.id || "";
    let checkoutSessionId = obj.id || "";
    let customerId = obj.customer || "";
    let amountPaid = typeof obj.amount_paid === "number" ? obj.amount_paid : null;
    let status = obj.status || "";

    // Para checkout.session.completed, o subscription vem no campo subscription.
    if (event.type === "checkout.session.completed") {
      subscriptionId = obj.subscription || "";
      checkoutSessionId = obj.id || "";
      invoiceId = "";
    }
    // Para invoice.paid / invoice.payment_failed, o subscription está em obj.subscription.
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      subscriptionId = obj.subscription || "";
      invoiceId = obj.id || "";
      customerId = obj.customer || "";
    }
    // Para customer.subscription.deleted, o objeto é a própria subscription.
    if (event.type === "customer.subscription.deleted") {
      subscriptionId = obj.id || "";
      customerId = obj.customer || "";
      checkoutSessionId = "";
      invoiceId = "";
    }

    await base44.asServiceRole.entities.StripeTestEvent.create({
      event_type: eventType,
      subscription_id: subscriptionId || "",
      invoice_id: invoiceId || "",
      checkout_session_id: event.type === "checkout.session.completed" ? checkoutSessionId : "",
      customer_id: customerId || "",
      amount_paid: amountPaid,
      status: status || "",
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(event),
    });

    return Response.json({ received: true });
  } catch (e) {
    console.error("[stripeWebhook] error:", e.message);
    // Sempre 200, mesmo com erro interno, para a Stripe não reenviar.
    return Response.json({ received: true });
  }
}

// Verifica a assinatura do webhook da Stripe usando Web Crypto (HMAC-SHA256).
// Formato do header: "t=timestamp,v1=signature"
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts: Record<string, string> = {};
    sigHeader.split(",").forEach((part) => {
      const [k, v] = part.split("=");
      if (k && v) parts[k.trim()] = v.trim();
    });
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    // Rejeita timestamps muito antigos (> 5 min) para evitar replay.
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