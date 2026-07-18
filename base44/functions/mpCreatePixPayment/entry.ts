import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const CATALOG = {
  "plan:basic:2":  { price: 59.80,  title: "Plano Básico (2 aulas)",  minutes: 60,  plan: "basic" },
  "plan:basic:4":  { price: 119.60, title: "Plano Básico (4 aulas)",  minutes: 120, plan: "basic" },
  "plan:basic":    { price: 119.60, title: "Plano Básico",   minutes: 120, plan: "basic" },
  "plan:standard": { price: 227.24, title: "Plano Standard", minutes: 240, plan: "standard" },
  "plan:premium":  { price: 430.56, title: "Plano Premium",  minutes: 480, plan: "premium" },
  "pack:pp_30":    { price: 29.90,  title: "Pack 30 min",    minutes: 30 },
  "pack:pp_60":    { price: 56.81,  title: "Pack 60 min",    minutes: 60 },
  "pack:pp_120":   { price: 107.64, title: "Pack 2 horas",   minutes: 120 },
  "pack:pp_300":   { price: 254.15, title: "Pack 5 horas",   minutes: 300 },
  "pack:pp_600":   { price: 478.40, title: "Pack 10 horas",  minutes: 600 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { external_reference, payer_email, payer_first_name, payer_last_name, payer_cpf } = await req.json();

    const item = CATALOG[external_reference];
    if (!item) return Response.json({ error: "Referência de produto inválida" }, { status: 400 });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    const body = {
      transaction_amount: item.price,
      description: item.title,
      payment_method_id: "pix",
      payer: {
        email: payer_email,
        first_name: payer_first_name || "Usuario",
        last_name: payer_last_name || "Linguify",
        identification: {
          type: "CPF",
          number: (payer_cpf || "").replace(/\D/g, ""),
        },
      },
      external_reference,
    };

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `pix-${user.id}-${external_reference}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });

    const payment = await res.json();

    if (!res.ok) {
      const causes = payment.cause?.map((c) => c.description).join(", ") || "";
      const msg = causes || payment.message || "Erro ao gerar Pix";
      return Response.json({ error: msg, detail: payment }, { status: 400 });
    }

    const qr = payment.point_of_interaction?.transaction_data;

    return Response.json({
      payment_id: payment.id,
      status: payment.status,
      qr_code: qr?.qr_code,
      qr_code_base64: qr?.qr_code_base64,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});