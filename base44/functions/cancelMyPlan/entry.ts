import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { secrets } from "base44:runtime";
import { requireNotBlocked } from "../../shared/requireNotBlocked.js";
import { getPlanGraceExpiryDays } from "../../shared/studentCredits.js";

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

    // ── Garantia de 7 dias (Art. 49 CDC): cancelamento dentro da janela
    //    zera os minutos do plano na hora e dispara reembolso automático.
    const subStartDate = profile.subscription_start_date
      ? new Date(profile.subscription_start_date) : null;
    const isWithinGuarantee = subStartDate &&
      (Date.now() - subStartDate.getTime()) < 7 * 24 * 60 * 60 * 1000;

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

      // ── Reembolso automático dentro da garantia de 7 dias ──────────────────
      // Zera os minutos do plano na hora e processa o reembolso na Stripe.
      // Se a chamada de reembolso falhar, o cancelamento em si não é
      // bloqueado — só logamos para revisão manual.
      if (isWithinGuarantee && profile.stripe_payment_intent_id) {
        try {
          const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `payment_intent=${encodeURIComponent(profile.stripe_payment_intent_id)}`,
          });
          const refundData = await refundRes.json();
          if (!refundRes.ok) {
            console.error("[cancelMyPlan] Stripe refund failed:", JSON.stringify(refundData));
          } else {
            console.log(`[cancelMyPlan] Stripe refund issued: ${refundData.id}`);
          }
        } catch (e) {
          console.error("[cancelMyPlan] Stripe refund error:", e.message);
        }

        await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
          plan_credits_minutes: 0,
          plan_credits_grace_expires_at: null,
          cancelled_within_guarantee: true,
        });
      }

      // The webhook (customer.subscription.deleted) will fire and set
      // subscription_status=cancelled + subscription_valid_until. We don't
      // duplicate that update here to avoid the two paths diverging.
      return Response.json({ success: true, provider: "stripe" });
    }

    // ── Mercado Pago: local downgrade (no real recurring subscription) ──────────
    // Dentro da garantia de 7 dias: zera minutos na hora + reembolso automático.
    // Fora da garantia: grace period de 60 dias (comportamento normal).
    // Prepaid credits são sempre intocados (independentes do plano).
    if (isWithinGuarantee) {
      if (profile.mp_payment_id) {
        const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
        if (mpAccessToken) {
          try {
            const refundRes = await fetch(
              `https://api.mercadopago.com/v1/payments/${profile.mp_payment_id}/refunds`,
              { method: "POST", headers: { Authorization: `Bearer ${mpAccessToken}` } }
            );
            const refundData = await refundRes.json();
            if (!refundRes.ok) {
              console.error("[cancelMyPlan] MP refund failed:", JSON.stringify(refundData));
            } else {
              console.log(`[cancelMyPlan] MP refund issued: ${refundData.id}`);
            }
          } catch (e) {
            console.error("[cancelMyPlan] MP refund error:", e.message);
          }
        }
      }

      await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
        plan: "free",
        subscription_status: "cancelled",
        subscription_valid_until: new Date().toISOString(),
        plan_credits_minutes: 0,
        plan_credits_grace_expires_at: null,
        cancelled_within_guarantee: true,
      });
    } else {
      const mpGraceExpiresAt = new Date(Date.now() + getPlanGraceExpiryDays() * 24 * 60 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
        plan: "free",
        subscription_status: "cancelled",
        subscription_valid_until: mpGraceExpiresAt,
        plan_credits_grace_expires_at: mpGraceExpiresAt,
      });
    }

    return Response.json({ success: true, provider: "mercadopago" });
  } catch (error) {
    console.error("[cancelMyPlan]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});