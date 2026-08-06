import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Webhook público do Asaas — chamado pelo próprio Asaas, sem autenticação de usuário.
// Sempre retorna 200 para o Asaas não reenviar o evento.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const event = await req.json();
    console.log("[asaasWebhook] event received:", JSON.stringify(event));

    const payment = event.payment || {};

    await base44.asServiceRole.entities.AsaasTestEvent.create({
      event_type: event.event || "UNKNOWN",
      payment_id: payment.id != null ? String(payment.id) : "",
      subscription_id: payment.subscription != null ? String(payment.subscription) : "",
      value: typeof payment.value === "number" ? payment.value : null,
      status: payment.status || "",
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(event),
    });

    return Response.json({ received: true });
  } catch (e) {
    console.error("[asaasWebhook] error:", e.message);
    // Sempre 200, mesmo com erro interno, para o Asaas não reenviar.
    return Response.json({ received: true });
  }
}