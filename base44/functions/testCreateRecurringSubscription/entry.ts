import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireOtp } from "../../shared/requireOtp.js";

// Admin-only — cria uma assinatura recorrente de TESTE no Mercado Pago (R$1/dia).
// O cartão é tokenizado no frontend (SDK MP) — só o card_token_id chega aqui.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { card_token_id, payer_email, frequency_type } = await req.json();
    if (!card_token_id) return Response.json({ error: "card_token_id é obrigatório" }, { status: 400 });
    if (!payer_email) return Response.json({ error: "payer_email é obrigatório" }, { status: 400 });
    if (!["days", "weeks", "months"].includes(frequency_type)) {
      return Response.json({ error: "frequency_type inválido" }, { status: 400 });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "Mercado Pago access token não configurado" }, { status: 500 });

    // Mercado Pago documenta apenas "days" e "months" como frequency_type válidos.
    // "weeks" é convertido para "days" com frequency 7 (mesmo efeito prático).
    const mpFrequencyType = frequency_type === "weeks" ? "days" : frequency_type;
    const mpFrequency = frequency_type === "weeks" ? 7 : 1;

    const preapprovalBody = {
      reason: "Teste de assinatura recorrente — One Talky",
      auto_recurring: {
        frequency: mpFrequency,
        frequency_type: mpFrequencyType,
        transaction_amount: 1,
        currency_id: "BRL",
      },
      card_token_id: card_token_id,
      payer_email: payer_email,
      back_url: "https://onetalky.com/admin",
      status: "authorized",
    };

    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preapprovalBody),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[testCreateRecurringSubscription] MP error:", JSON.stringify(data));
      return Response.json(
        { error: data.message || data.error || "Falha ao criar assinatura no Mercado Pago" },
        { status: 400 }
      );
    }

    // Salva o preapproval retornado para acompanhamento.
    await base44.asServiceRole.entities.RecurringSubscriptionTest.create({
      event_type: "SUBSCRIPTION_CREATED",
      preapproval_id: data.id,
      status: data.status,
      created_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(data),
    });

    return Response.json({ success: true, preapproval_id: data.id, status: data.status });
  } catch (error) {
    console.error("[testCreateRecurringSubscription] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});