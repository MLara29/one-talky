import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const {
      token,           // card token from MP SDK
      payment_method_id,
      installments,
      external_reference, // "plan:standard:120" or "pack:pp_60:60"
      payer_email,
      description,
      transaction_amount,
    } = await req.json();

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    const paymentBody = {
      transaction_amount: Number(transaction_amount),
      token,
      description,
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
      // Atualiza perfil do aluno imediatamente
      const parts = (external_reference || "").split(":");
      const type = parts[0];
      const itemId = parts[1];
      const minutes = parseInt(parts[2] || "0", 10);

      const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const profile = profiles[0];
        const updateData: Record<string, unknown> = {
          credits_minutes: (profile.credits_minutes ?? 0) + minutes,
        };
        if (type === "plan") updateData.plan = itemId;
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