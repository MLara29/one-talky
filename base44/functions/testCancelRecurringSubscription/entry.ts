import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireOtp } from "../../shared/requireOtp.js";

// Admin-only — cancela uma assinatura recorrente de TESTE no Mercado Pago (Preapproval PUT).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { preapproval_id } = await req.json();
    if (!preapproval_id) return Response.json({ error: "preapproval_id é obrigatório" }, { status: 400 });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "Mercado Pago access token não configurado" }, { status: 500 });

    const res = await fetch(`https://api.mercadopago.com/preapproval/${preapproval_id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[testCancelRecurringSubscription] MP error:", JSON.stringify(data));
      return Response.json(
        { error: data.message || data.error || "Erro ao cancelar assinatura" },
        { status: res.status }
      );
    }

    await base44.asServiceRole.entities.RecurringSubscriptionTest.create({
      preapproval_id,
      status: "cancelled",
      event_type: "cancelled_manually",
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(data),
    });

    return Response.json({ success: true, status: data.status });
  } catch (error) {
    console.error("[testCancelRecurringSubscription] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});