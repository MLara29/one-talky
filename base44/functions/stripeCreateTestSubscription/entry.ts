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

    const secretKey = secrets.get("STRIPE_TEST_SECRET_KEY");
    if (!secretKey) return Response.json({ error: "STRIPE_TEST_SECRET_KEY não configurado" }, { status: 500 });

    // URL fixa do domínio de produção — req.url pode chegar como o dispatcher
    // interno do Base44, o que quebraria o redirect pós-pagamento.
    const successUrl = "https://onetalky.com/admin/stripe-test?stripe_status=success";
    const cancelUrl = "https://onetalky.com/admin/stripe-test?stripe_status=cancel";

    const unitAmount = Math.round(Number(amount) * 100);
    const now = Math.floor(Date.now() / 1000);

    // 1) Cria um Test Clock congelado no agora — permite avançar o tempo depois
    //    para validar a renovação automática sem esperar o ciclo real.
    const clockRes = await fetch("https://api.stripe.com/v1/test_helpers/test_clocks", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "frozen_time": String(now),
        "name": "Teste recorrência One Talky",
      }),
    });
    const clockData = await clockRes.json();
    if (!clockRes.ok) {
      console.error("[stripeCreateTestSubscription] clock error:", JSON.stringify(clockData));
      return Response.json({ error: clockData.error?.message || "Falha ao criar Test Clock" }, { status: 400 });
    }

    // 2) Cria um customer vinculado ao Test Clock. Assinaturas geradas a partir
    //    deste customer herdam o clock e respondem ao avanço do tempo.
    const customerRes = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "test_clock": clockData.id,
        "description": "Customer de teste — One Talky recorrência",
        "metadata[test]": "true",
      }),
    });
    const customerData = await customerRes.json();
    if (!customerRes.ok) {
      console.error("[stripeCreateTestSubscription] customer error:", JSON.stringify(customerData));
      return Response.json({ error: customerData.error?.message || "Falha ao criar customer de teste" }, { status: 400 });
    }

    // 3) Cria a Checkout Session com price_data inline, vinculada ao customer
    //    (e portanto ao Test Clock).
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "customer": customerData.id,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "brl",
        "line_items[0][price_data][unit_amount]": String(unitAmount),
        "line_items[0][price_data][recurring][interval]": interval,
        "line_items[0][price_data][product_data][name]": "Teste de assinatura — One Talky",
        "success_url": successUrl,
        "cancel_url": cancelUrl,
        "metadata[test]": "true",
        "metadata[created_by]": user.id,
        "metadata[clock_id]": clockData.id,
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

    // Registra a criação para acompanhamento, incluindo clock e customer.
    await base44.asServiceRole.entities.StripeTestEvent.create({
      event_type: "checkout.session.created",
      checkout_session_id: data.id,
      customer_id: customerData.id,
      clock_id: clockData.id,
      status: data.status,
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(data),
    });

    return Response.json({ success: true, checkout_url: data.url, session_id: data.id, clock_id: clockData.id });
  } catch (error) {
    console.error("[stripeCreateTestSubscription] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}