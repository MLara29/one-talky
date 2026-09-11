import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { CATALOG } from "../../shared/paymentCatalog.js";

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

    // Pacotes avulsos (prepaid packs) são exclusivos de assinantes ativos —
    // um aluno no plano Free não pode comprar minutos avulsos, mesmo que tenha
    // saldo de presente ou pré-pago remanescente. Validação server-side.
    if (external_reference.startsWith("pack:")) {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      const studentProfile = profiles[0];
      if (!studentProfile || !studentProfile.plan || studentProfile.plan === "free") {
        return Response.json({ error: "Pacotes avulsos estão disponíveis apenas para assinantes ativos" }, { status: 403 });
      }
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