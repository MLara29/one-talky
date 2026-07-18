import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const CATALOG = {
  "plan:basic":    { minutes: 120, plan: "basic" },
  "plan:standard": { minutes: 240, plan: "standard" },
  "plan:premium":  { minutes: 480, plan: "premium" },
  "pack:pp_30":    { minutes: 30 },
  "pack:pp_60":    { minutes: 60 },
  "pack:pp_120":   { minutes: 120 },
  "pack:pp_300":   { minutes: 300 },
  "pack:pp_600":   { minutes: 600 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { payment_id, external_reference } = await req.json();
    if (!payment_id) return Response.json({ error: "payment_id required" }, { status: 400 });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payment = await res.json();
    if (!res.ok) return Response.json({ error: payment.message || "Erro ao consultar pagamento" }, { status: 400 });

    // If approved, credit the student
    if (payment.status === "approved") {
      const item = CATALOG[external_reference];
      if (item) {
        const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const profile = profiles[0];
          const updateData = { credits_minutes: (profile.credits_minutes ?? 0) + item.minutes };
          if (item.plan) updateData.plan = item.plan;
          await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);
        }
      }
    }

    return Response.json({ status: payment.status, status_detail: payment.status_detail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});