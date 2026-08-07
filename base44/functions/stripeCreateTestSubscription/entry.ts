import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { requireOtp } from "../../shared/requireOtp.js";

// Admin-only — cria uma assinatura de TESTE no Stripe usando Stripe Checkout
// (página hospedada pela Stripe). O admin escolhe valor + intervalo; a function
// cria uma Checkout Session com price_data inline (product + price de uso único)
// e devolve a URL para redirecionar o navegador.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { amount, interval } = await req.json();
    if (!amount || amount < 5) {
      return Response.json({ error: "Valor mínimo para teste é R$ 5,00 (taxa fixa da Stripe pesa em valores menores)" }, { status: 400 });
    }
    if (!["day", "week", "month"].includes(interval)) {
      return Response.json({ error: "Intervalo inválido (use day, week ou month)" }, { status: 400 });
    }

    const secretKey = secrets.get("STRIPE_SECRET_KEY");
    if (!secretKey) return Response.json({ error: "STRIPE_SECRET_KEY não configurado" }, { status: 500 });

    // Constrói success/cancel URLs a partir da origem do request.
    const origin = new URL(req.url).origin;
    const successUrl = `${origin}/admin/stripe-test?stripe_status=success`;
    const cancelUrl = `${origin}/admin/stripe-test?stripe_status=cancel`;

    // Cria a Checkout Session com price_data inline (product + price descartáveis).
    // Stripe exige unit_amount em centavos.
    const unitAmount = Math.round(Number(amount) * 100);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "brl",
        "line_items[0][price_data][unit_amount]": String(unitAmount),
        "line_items[0][price_data][recurring][interval]": interval,
        "line_items[0][price_data][product_data][name]": "Teste de assinatura — One Talky",
        "success_url": successUrl,
        "cancel_url": cancelUrl,
        "metadata[test]": "true",
        "metadata[created_by]": user.id,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[stripeCreateTestSubscription] Stripe error:", JSON.stringify(data));
      return Response.json(
        { error: data.error?.message || "Falha ao criar Checkout Session no Stripe" },
        { status: 400 }
      );
    }

    // Registra a criação para acompanhamento.
    await base44.asServiceRole.entities.StripeTestEvent.create({
      event_type: "checkout.session.created",
      checkout_session_id: data.id,
      status: data.status,
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(data),
    });

    return Response.json({ success: true, checkout_url: data.url, session_id: data.id });
  } catch (error) {
    console.error("[stripeCreateTestSubscription] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}