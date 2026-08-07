import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { requireOtp } from "../../shared/requireOtp.js";

// Admin-only — cancela uma assinatura de teste no Stripe imediatamente.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { subscription_id } = await req.json();
    if (!subscription_id) return Response.json({ error: "subscription_id é obrigatório" }, { status: 400 });

    const secretKey = secrets.get("STRIPE_SECRET_KEY");
    if (!secretKey) return Response.json({ error: "STRIPE_SECRET_KEY não configurado" }, { status: 500 });

    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[stripeCancelTestSubscription] Stripe error:", JSON.stringify(data));
      return Response.json(
        { error: data.error?.message || "Falha ao cancelar assinatura no Stripe" },
        { status: 400 }
      );
    }

    // Registra o cancelamento.
    await base44.asServiceRole.entities.StripeTestEvent.create({
      event_type: "subscription.cancelled_manually",
      subscription_id: data.id,
      status: data.status,
      received_at: new Date().toISOString(),
      raw_payload: JSON.stringify(data),
    });

    return Response.json({ success: true, status: data.status });
  } catch (error) {
    console.error("[stripeCancelTestSubscription] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}