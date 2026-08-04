import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { CATALOG, PRICE_CATALOG } from "../../shared/paymentCatalog.js";
import { validateAndApplyCoupon } from "../../shared/couponDiscount.js";

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
        const updateData: Record<string, unknown> = {
          credits_minutes: (profile.credits_minutes ?? 0) + item.minutes + bonusMinutes,
        };
        if (item.plan) updateData.plan = item.plan;
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

        // ── Affiliate commission logic (on FULL price — discount is a platform
        //    promotion, not an affiliate discount) ──────────────────────────────
        if (coupon_code) {
          const coupons = await base44.asServiceRole.entities.Coupon.filter({
            code: String(coupon_code).toUpperCase(),
            is_active: true,
          });
          const coupon = coupons[0];
          if (coupon?.affiliate_id) {
            const affiliates = await base44.asServiceRole.entities.Affiliate.filter({
              id: coupon.affiliate_id,
              status: "active",
            });
            const affiliate = affiliates[0];
            if (affiliate) {
              const saleAmount = PRICE_CATALOG[external_reference] ?? item.price;
              const commissionPct = affiliate.commission_percent ?? 15;
              const commissionAmount = parseFloat(((saleAmount * commissionPct) / 100).toFixed(2));
              await base44.asServiceRole.entities.AffiliateEarning.create({
                affiliate_id: affiliate.id,
                student_id: user.id,
                student_name: profile.full_name || user.email,
                coupon_code: coupon.code,
                plan_id: item.plan || external_reference,
                sale_amount: saleAmount,
                commission_percent: commissionPct,
                commission_amount: commissionAmount,
                payment_id: String(payment.id),
                sale_date: new Date().toISOString(),
                release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: "aguardando_7_dias",
              });
            }
          }
        }
        // ── end affiliate logic ─────────────────────────────────────────────────
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