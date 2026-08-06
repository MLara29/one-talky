import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Webhook público do Mercado Pago — chamado pelo próprio MP, sem autenticação de usuário.
// Sempre retorna 200 para o MP não reenviar o evento.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    console.log("[mpRecurringWebhook] event:", JSON.stringify(body));

    await base44.asServiceRole.entities.RecurringSubscriptionTest.create({
      event_type: body.type || body.action || "unknown",
      payment_id: body.data?.id ? String(body.data.id) : "",
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(body),
    });

    return Response.json({ received: true });
  } catch (e) {
    console.error("[mpRecurringWebhook] error:", e.message);
    return Response.json({ received: true });
  }
});