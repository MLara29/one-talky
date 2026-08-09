import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { CATALOG } from "../../shared/paymentCatalog.js";
import { validateAndApplyCoupon } from "../../shared/couponDiscount.js";
import { computeCreditUpdate } from "../../shared/studentCredits.js";
import { recordAffiliateCommission } from "../../shared/affiliateCommission.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const {
      token,
      payment_method_id,
      installments,
      external_reference, // "plan:standard" or "pack:pp_60"
      payer_email,
      coupon_code,
    } = await req.json();

    // Validate the reference against the server-side catalog
    const item = CATALOG[external_reference];
    if (!item) {
      return Response.json({ error: "Referência de produto inválida" }, { status: 400 });
    }

    // ── Validate coupon and calculate discounted price BEFORE charging ──────────
    const { finalPrice, coupon: appliedCoupon, bonusMinutes, error: couponError } =
      await validateAndApplyCoupon(base44, coupon_code, item.price);
    if (couponError) {
      return Response.json({ error: couponError }, { status: 400 });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return Response.json({ error: "MP token não configurado" }, { status: 500 });

    const paymentBody = {
      transaction_amount: finalPrice, // reflects the coupon discount, never the full price
      token,
      description: external_reference,
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
      const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const profile = profiles[0];
        // Add plan minutes + coupon bonus minutes.
        const creditUpdate = await computeCreditUpdate(base44, {
          profile,
          externalReference: external_reference,
          item,
          couponCode,
          bonusMinutes,
          appliedCoupon,
          isRenewal: false,
        });
        const updateData: Record<string, unknown> = { ...creditUpdate };
        if (item.plan) {
          updateData.plan = item.plan;
          updateData.subscription_provider = "mercadopago";
          // CORREÇÃO DE LACUNA: antes este caminho nunca setava
          // subscription_start_date nem incrementava subscription_cycle,
          // então a regra da primeira semana (first_week_lesson_id) nunca
          // funcionava para assinantes via Mercado Pago. Agora espelha o
          // que o stripeWebhook já fazia no checkout.session.completed.
          updateData.subscription_start_date = new Date().toISOString();
          updateData.subscription_cycle = (profile.subscription_cycle || 0) + 1;
          updateData.mp_payment_id = payment.id ? String(payment.id) : "";
        }
        await base44.asServiceRole.entities.StudentProfile.update(profile.id, updateData);

        // ── Increment coupon used_count (CAS) ──────────────────────────────────
        if (appliedCoupon) {
          const casResult = await base44.asServiceRole.entities.Coupon.updateMany(
            { id: appliedCoupon.id, used_count: appliedCoupon.used_count },
            { $set: { used_count: (appliedCoupon.used_count || 0) + 1 } }
          );
          if (casResult.updated === 0) {
            // Corrida detectada — outro pagamento simultâneo já incrementou o
            // contador entre a leitura e esta escrita. O desconto/pagamento deste
            // aluno já foi aprovado e não deve ser desfeito — só registrar para
            // acompanhamento, já que o pior cenário aqui é o cupom passar 1 uso
            // do limite em situação de corrida rara, não uma falha financeira.
            console.warn(`[mpProcessPayment] CAS mismatch on Coupon.used_count for coupon ${appliedCoupon.code} — possible concurrent redemption.`);
          }
        }

        // ── Affiliate commission (on FULL price — discount is a platform
        //    promotion, not an affiliate discount) ──────────────────────────────
        await recordAffiliateCommission(base44, {
          couponCode: coupon_code,
          externalReference: external_reference,
          planId: item.plan || external_reference,
          studentId: user.id,
          studentName: profile.full_name || user.email,
          paymentId: payment.id,
        });
      }
    }

    return Response.json({
      success: payment.status === "approved",
      status: payment.status,
      status_detail: payment.status_detail,
      id: payment.id,
    });
  } catch (error) {
    console.error('[mpProcessPayment]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});