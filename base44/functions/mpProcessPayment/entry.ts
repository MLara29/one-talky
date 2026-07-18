import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Server-side catalog — prices and minutes are NEVER trusted from the client
const CATALOG = {
  "plan:basic:2":  { minutes: 60,  price: 59.80,  plan: "basic" },
  "plan:basic:4":  { minutes: 120, price: 119.60, plan: "basic" },
  "plan:basic":    { minutes: 120, price: 119.60, plan: "basic" },
  "plan:standard": { minutes: 240, price: 227.24, plan: "standard" },
  "plan:premium":  { minutes: 480, price: 430.56, plan: "premium" },
  "pack:teste":    { minutes: 1,   price: 2.00 },
  "pack:pp_30":    { minutes: 30,  price: 29.90 },
  "pack:pp_60":    { minutes: 60,  price: 56.81 },
  "pack:pp_120":   { minutes: 120, price: 107.64 },
  "pack:pp_300":   { minutes: 300, price: 254.15 },
  "pack:pp_600":   { minutes: 600, price: 478.40 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const {
      token,
      payment_method_id,
      installments,
      external_reference, // "plan:standard" or "pack:pp_60"
      payer_email,
    } = await req.json();

    // Validate the reference against the server-side catalog
    const item = CATALOG[external_reference];
    if (!item) {
      return Response.json({ error: "Referência de produto inválida" }, { status: 400 });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    const paymentBody = {
      transaction_amount: item.price, // server-side price, never from client
      token,
      description: external_reference,
      installments: Number(installments) || 1,
      payment_method_id,
      payer: { email: payer_email },
      external_reference,
    };

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${user.id}-${external_reference}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const payment = await res.json();

    if (!res.ok) {
      return Response.json({ error: payment.message || "Erro no pagamento", detail: payment }, { status: 400 });
    }

    if (payment.status === "approved") {
      const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const profile = profiles[0];
        const updateData: Record<string, unknown> = {
          credits_minutes: (profile.credits_minutes ?? 0) + item.minutes,
        };
        if (item.plan) updateData.plan = item.plan;
        await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);
      }
    }

    return Response.json({
      success: payment.status === "approved",
      status: payment.status,
      status_detail: payment.status_detail,
      id: payment.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});