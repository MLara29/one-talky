import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { secrets } from "base44:runtime";
import { requireNotBlocked } from "../../shared/requireNotBlocked.js";
import { getPlanGraceExpiryDays } from "../../shared/studentCredits.js";
import { normalizeSlot } from "../../shared/slotUtils.js";

async function cancelFutureScheduledLessons(base44, studentId) {
  try {
    const scheduledLessons = await base44.asServiceRole.entities.Lesson.filter({
      student_id: studentId,
      status: "scheduled",
    });
    for (const lesson of scheduledLessons) {
      await base44.asServiceRole.entities.Lesson.update(lesson.id, { status: "cancelled" });

      if (lesson.scheduled_at) {
        try {
          const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
          const tutorProfile = tutorProfiles[0];
          if (tutorProfile) {
            const normalizedTarget = normalizeSlot(lesson.scheduled_at);
            const updatedSlots = (tutorProfile.booked_slots || []).filter(s => normalizeSlot(s) !== normalizedTarget);
            await base44.asServiceRole.entities.TutorProfile.update(tutorProfile.id, { booked_slots: updatedSlots });
          }
        } catch (e) {
          console.error("[cancelMyPlan] failed to release tutor slot for lesson", lesson.id, e.message);
        }
      }

      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: lesson.tutor_id,
          title: "Lesson cancelled — student left the platform",
          message: `Your lesson with ${lesson.student_name || "a student"} scheduled for ${lesson.scheduled_at ? new Date(lesson.scheduled_at).toLocaleString("en-US") : "an upcoming date"} was cancelled because the student cancelled their subscription.`,
          type: "general",
          is_read: false,
        });
      } catch (e) {
        console.error("[cancelMyPlan] failed to notify tutor for lesson", lesson.id, e.message);
      }
    }
    if (scheduledLessons.length > 0) {
      console.log(`[cancelMyPlan] Cancelled ${scheduledLessons.length} future scheduled lesson(s) for student=${studentId}`);
    }
  } catch (e) {
    console.error("[cancelMyPlan] failed to cancel future scheduled lessons for student", studentId, e.message);
  }
}

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

      await cancelFutureScheduledLessons(base44, user.id);

      // ── Reembolso automático dentro da garantia de 7 dias ──────────────────
      // Zera os minutos do plano na hora e processa o reembolso na Stripe.
      // Se a chamada de reembolso falhar, o cancelamento em si não é
      // bloqueado — só logamos para revisão manual.
      let refundAttempted = false;
      let refundIssued = false;
      let refundId = null;

      if (isWithinGuarantee) {
        let paymentIntentId = profile.stripe_payment_intent_id;

        // Fallback: o webhook salva stripe_payment_intent_id a partir de
        // session.payment_intent, mas esse campo é null em Checkout Sessions
        // de assinatura (mode=subscription) — o PI vive na invoice, não na
        // session. Além disso, a API version 2026-06-24.dahlia removeu o campo
        // `payment_intent` do objeto Invoice, então expand[]=latest_invoice.
        // payment_intent também não funciona. Solução: buscar o customer na
        // subscription, listar os charges do customer e usar o payment_intent
        // do charge mais recente bem-sucedido e não reembolsado.
        if (!paymentIntentId) {
          try {
            const subRes = await fetch(
              `https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`,
              { headers: { Authorization: `Bearer ${secretKey}` } }
            );
            const subData = await subRes.json();
            const customerId = subData?.customer;
            if (customerId) {
              const chargesRes = await fetch(
                `https://api.stripe.com/v1/charges?customer=${encodeURIComponent(customerId)}&limit=10`,
                { headers: { Authorization: `Bearer ${secretKey}` } }
              );
              const chargesData = await chargesRes.json();
              const charges = chargesData?.data || [];
              const matchingCharge = charges.find(c => c.status === "succeeded" && !c.refunded);
              paymentIntentId = matchingCharge?.payment_intent || null;
            }
          } catch (e) {
            console.error("[cancelMyPlan] failed to fetch fallback payment_intent_id:", e.message);
          }
        }

        if (paymentIntentId) {
          refundAttempted = true;
          try {
            const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: `payment_intent=${encodeURIComponent(paymentIntentId)}`,
            });
            const refundData = await refundRes.json();
            if (!refundRes.ok) {
              console.error("[cancelMyPlan] Stripe refund failed:", JSON.stringify(refundData));
            } else {
              console.log(`[cancelMyPlan] Stripe refund issued: ${refundData.id}`);
              refundIssued = true;
              refundId = refundData.id;
            }
          } catch (e) {
            console.error("[cancelMyPlan] Stripe refund error:", e.message);
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
        // Fora da garantia: aluno mantém acesso até o fim do período já pago
        // (subscription_valid_until existente não é alterado). "plan" também
        // permanece o mesmo — isso é o que faz Plans.jsx mostrar "cancelado,
        // mas ainda ativo até X data" (ver isCancelledButActive em Plans.jsx).
        await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
          subscription_status: "cancelled",
        });
      }

      // NOTA: o webhook (customer.subscription.deleted) também roda e tenta
      // fazer essa mesma atualização, mas agora é só redundante/idempotente —
      // não é mais o único responsável por isso. Isso corrige o caso de
      // assinaturas de teste (metadata.test === "true"), que o webhook ignora
      // por design.
      return Response.json({ success: true, provider: "stripe", refund_attempted: refundAttempted, refund_issued: refundIssued, refund_id: refundId });
    }

    // ── Mercado Pago: local downgrade (no real recurring subscription) ──────────
    // Dentro da garantia de 7 dias: zera minutos na hora + reembolso automático.
    // Fora da garantia: grace period de 60 dias (comportamento normal).
    // Prepaid credits são sempre intocados (independentes do plano).
    await cancelFutureScheduledLessons(base44, user.id);

    let mpRefundAttempted = false;
    let mpRefundIssued = false;
    let mpRefundId = null;

    if (isWithinGuarantee) {
      if (profile.mp_payment_id) {
        const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
        if (mpAccessToken) {
          mpRefundAttempted = true;
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
              mpRefundIssued = true;
              mpRefundId = refundData.id;
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

    return Response.json({ success: true, provider: "mercadopago", refund_attempted: mpRefundAttempted, refund_issued: mpRefundIssued, refund_id: mpRefundId });
  } catch (error) {
    console.error("[cancelMyPlan]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});