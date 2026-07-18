import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Server-side catalog — prices are NEVER trusted from the client
const CATALOG: Record<string, { price: number; title: string }> = {
  "plan:basic":    { price: 119.60, title: "Plano Básico" },
  "plan:standard": { price: 227.24, title: "Plano Standard" },
  "plan:premium":  { price: 430.56, title: "Plano Premium" },
  "pack:pp_30":    { price: 29.90,  title: "Pack 30 min" },
  "pack:pp_60":    { price: 56.81,  title: "Pack 60 min" },
  "pack:pp_120":   { price: 107.64, title: "Pack 2 horas" },
  "pack:pp_300":   { price: 254.15, title: "Pack 5 horas" },
  "pack:pp_600":   { price: 478.40, title: "Pack 10 horas" },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { external_reference, success_url, failure_url, pending_url } = await req.json();

    const item = CATALOG[external_reference];
    if (!item) {
      return Response.json({ error: "Referência de produto inválida" }, { status: 400 });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    const body = {
      items: [{ title: item.title, unit_price: item.price, quantity: 1, currency_id: "BRL" }],
      external_reference,
      back_urls: {
        success: success_url,
        failure: failure_url,
        pending: pending_url,
      },
      auto_return: "approved",
      payment_methods: { installments: 12 },
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || "Erro MP" }, { status: 400 });
    }

    return Response.json({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});