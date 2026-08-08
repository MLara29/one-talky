import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { requireOtp } from "../../shared/requireOtp.js";

// Admin-only — avança o Test Clock da Stripe em N dias, simulando a passagem
// do tempo para validar a renovação automática da assinatura sem esperar o
// ciclo real. O avanço dispara a geração de invoices em segundo plano na
// Stripe (não é instantâneo — o frontend deve aguardar e recarregar a lista).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { clock_id, days } = await req.json();
    if (!clock_id) return Response.json({ error: "clock_id é obrigatório" }, { status: 400 });
    if (!days || Number(days) <= 0) return Response.json({ error: "days deve ser um número positivo" }, { status: 400 });

    const secretKey = secrets.get("STRIPE_SECRET_KEY");
    if (!secretKey) return Response.json({ error: "STRIPE_SECRET_KEY não configurado" }, { status: 500 });

    const advanceTo = Math.floor(Date.now() / 1000) + Math.round(Number(days) * 24 * 60 * 60);

    const res = await fetch(`https://api.stripe.com/v1/test_helpers/test_clocks/${clock_id}/advance`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ frozen_time: String(advanceTo) }),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[stripeAdvanceTestClock] Stripe error:", JSON.stringify(data));
      return Response.json(
        { error: data.error?.message || "Falha ao avançar o Test Clock" },
        { status: 400 }
      );
    }

    // Registra o avanço para auditoria.
    await base44.asServiceRole.entities.StripeTestEvent.create({
      event_type: "test_clock.advanced",
      clock_id: data.id,
      status: data.status,
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(data),
    });

    return Response.json({ success: true, status: data.status, frozen_time: data.frozen_time });
  } catch (error) {
    console.error("[stripeAdvanceTestClock] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}