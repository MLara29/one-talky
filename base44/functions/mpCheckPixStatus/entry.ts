import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { CATALOG } from "../../shared/paymentCatalog.js";
import { computeCreditUpdate } from "../../shared/studentCredits.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { payment_id } = await req.json();
    if (!payment_id) return Response.json({ error: "payment_id required" }, { status: 400 });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    // Fetch payment status directly from Mercado Pago — never trust client
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await res.json();
    if (!res.ok) return Response.json({ error: payment.message || "Erro ao consultar pagamento" }, { status: 400 });

    if (payment.status !== "approved") {
      return Response.json({ status: payment.status, status_detail: payment.status_detail });
    }

    // Verify the payment belongs to the authenticated user
    const payerEmail = payment.payer?.email;
    if (payerEmail && user.email && payerEmail.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: "Payment does not belong to this user" }, { status: 403 });
    }

    // Guard: prevent double-spend — check if this payment_id was already processed
    const existing = await base44.asServiceRole.entities.ProcessedPayment.filter({ payment_id: String(payment_id) });
    if (existing.length > 0) {
      // Already processed — return success without crediting again
      return Response.json({ status: "approved", already_processed: true });
    }

    // Resolve product from server-side catalog using external_reference from MP (not from client)
    const externalRef = payment.external_reference || "";
    const item = CATALOG[externalRef];
    if (!item) {
      return Response.json({ error: "Referência de produto inválida", external_reference: externalRef }, { status: 400 });
    }

    // Credit the student
    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: "Perfil não encontrado" }, { status: 404 });

    const profile = profiles[0];
    const creditUpdate = await computeCreditUpdate(base44, {
      profile,
      externalReference: externalRef,
      item,
      couponCode: "",
      bonusMinutes: 0,
      appliedCoupon: null,
      isRenewal: false,
    });
    const updateData: Record<string, unknown> = { ...creditUpdate };
    if (item.plan) updateData.plan = item.plan;
    await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);

    // Record payment as processed to prevent replay attacks
    await base44.asServiceRole.entities.ProcessedPayment.create({
      payment_id: String(payment_id),
      user_id: user.id,
    });

    return Response.json({ status: "approved", minutes_added: item.minutes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});