import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { secrets } from "base44:runtime";
import { requireNotBlocked } from "../../shared/requireNotBlocked.js";

// Cancels the student's paid plan.
// - Stripe subscriptions: calls the Stripe API to cancel the real subscription.
//   The webhook (customer.subscription.deleted) handles the local field updates
//   (subscription_status=cancelled + subscription_valid_until), so we don't
//   duplicate that logic here — the student keeps access until the end of the
//   current billing period (graceful cancellation).
// - Mercado Pago: no real recurring subscription exists, so we just downgrade
//   locally to Free (existing behavior).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "student") return Response.json({ error: "Forbidden" }, { status: 403 });

    const blockedGate = await requireNotBlocked(base44, user.id);
    if (!blockedGate.ok) return Response.json({ error: blockedGate.error }, { status: blockedGate.status });

    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: "Profile not found" }, { status: 404 });
    const profile = profiles[0];

    if (!profile.plan || profile.plan === "free") {
      return Response.json({ success: true, already_free: true });
    }

    // ── Stripe: cancel the real subscription on Stripe's side ──────────────────
    if (profile.subscription_provider === "stripe" && profile.stripe_subscription_id) {
      // Already cancelled — no-op (access continues until valid_until).
      if (profile.subscription_status === "cancelled") {
        return Response.json({ success: true, already_cancelled: true, provider: "stripe" });
      }

      const secretKey = secrets.get("STRIPE_SECRET_KEY");
      if (!secretKey) {
        console.error("[cancelMyPlan] STRIPE_SECRET_KEY not configured");
        return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
      }

      const res = await fetch(`https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secretKey}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        // Se a Stripe disser que já está cancelada ou a assinatura não existe,
        // tratar como sucesso — o resultado final desejado já foi alcançado.
        const msg = (errData.error?.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("no such subscription")) {
          return Response.json({ success: true, provider: "stripe", already_cancelled: true });
        }
        console.error("[cancelMyPlan] Stripe cancel error:", JSON.stringify(errData));
        return Response.json(
          { error: "Não foi possível cancelar a assinatura na Stripe. Tente novamente ou contate o suporte." },
          { status: 500 }
        );
      }

      // The webhook (customer.subscription.deleted) will fire and set
      // subscription_status=cancelled + subscription_valid_until. We don't
      // duplicate that update here to avoid the two paths diverging.
      return Response.json({ success: true, provider: "stripe" });
    }

    // ── Mercado Pago: local downgrade (no real recurring subscription) ──────────
    // Set grace period for plan credits (60 days). Don't zero plan_credits_minutes
    // — the cron expirePlanGraceCredits will do that when the grace period ends.
    // Prepaid credits are untouched (independent of the plan).
    const mpGraceExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
      plan: "free",
      subscription_status: "cancelled",
      subscription_valid_until: mpGraceExpiresAt,
      plan_credits_grace_expires_at: mpGraceExpiresAt,
    });

    return Response.json({ success: true, provider: "mercadopago" });
  } catch (error) {
    console.error("[cancelMyPlan]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});