import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { payment_id } = await req.json();
    if (!payment_id) return Response.json({ error: "payment_id obrigatório" }, { status: 400 });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    // Verifica pagamento na API do MP
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await res.json();

    if (payment.status !== "approved") {
      return Response.json({ success: false, status: payment.status });
    }

    // external_reference vem do objeto verificado da API do MP, não do cliente
    const parts = (payment.external_reference || "").split(":");
    const type = parts[0];
    const itemId = parts[1];
    const minutes = parseInt(parts[2] || "0", 10);

    // Atualiza perfil do aluno
    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: "Perfil não encontrado" }, { status: 404 });

    const profile = profiles[0];
    const updateData: Record<string, unknown> = {
      credits_minutes: (profile.credits_minutes ?? 0) + minutes,
    };
    if (type === "plan") {
      updateData.plan = itemId;
    }

    await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);

    return Response.json({ success: true, type, item_id: itemId, minutes_added: minutes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});