import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireOtp } from "../../shared/requireOtp.js";
import { getFinanceSettings } from "../../shared/financeSettings.js";

// Admin-only: returns real financial data for a given month (year + month).
// Sums PaymentRecord (real payments), WithdrawalRequest (paid to tutors),
// AffiliateEarning (paid to affiliates), and Agora usage cost for the month.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const year = body.year ? Number(body.year) : now.getFullYear();
    const month = body.month !== undefined ? Number(body.month) : now.getMonth(); // 0-indexed

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1); // exclusive
    const pad = (n: number) => String(n).padStart(2, "0");
    const fromDate = `${year}-${pad(month + 1)}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const toDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

    // ── 1) PaymentRecord sums (real revenue) ──────────────────────────────────
    const allPayments = await base44.asServiceRole.entities.PaymentRecord.list("-created_date", 500);
    const monthPayments = allPayments.filter(p => {
      const d = p.created_at ? new Date(p.created_at) : new Date(p.created_date);
      return d >= monthStart && d < monthEnd;
    });

    const grossRevenue = monthPayments.reduce((s, p) => s + (p.gross_amount || 0), 0);
    const totalDiscount = monthPayments.reduce((s, p) => s + (p.discount_amount || 0), 0);
    const totalFees = monthPayments.reduce((s, p) => s + (p.estimated_fee || 0), 0);
    const netRevenue = monthPayments.reduce((s, p) => s + (p.net_amount || 0), 0);
    const txCount = monthPayments.length;
    const avgTicket = txCount > 0 ? grossRevenue / txCount : 0;

    // Breakdown by provider
    const mpPayments = monthPayments.filter(p => p.provider === "mercadopago");
    const stripePayments = monthPayments.filter(p => p.provider === "stripe");
    const planPayments = monthPayments.filter(p => p.type === "plan");
    const packPayments = monthPayments.filter(p => p.type === "pack");

    // ── 2) WithdrawalRequest (paid to tutors) ──────────────────────────────────
    const allWithdrawals = await base44.asServiceRole.entities.WithdrawalRequest.list("-created_date", 500);
    const monthWithdrawals = allWithdrawals.filter(w => {
      if (w.status !== "paid") return false;
      const d = w.confirmed_at ? new Date(w.confirmed_at) : new Date(w.created_date);
      return d >= monthStart && d < monthEnd;
    });
    const paidToTutors = monthWithdrawals.reduce((s, w) => s + (w.amount || 0), 0);

    // ── 3) AffiliateEarning (paid to affiliates) ──────────────────────────────
    const allEarnings = await base44.asServiceRole.entities.AffiliateEarning.list("-created_date", 500);
    const monthEarnings = allEarnings.filter(e => {
      const d = e.sale_date ? new Date(e.sale_date) : new Date(e.created_date);
      return d >= monthStart && d < monthEnd;
    });
    const paidToAffiliates = monthEarnings.reduce((s, e) => s + (e.commission_amount || 0), 0);

    // ── 4) Agora usage cost for the month ─────────────────────────────────────
    const settings = await getFinanceSettings(base44);
    let agoraAudioMinutes = 0;
    let agoraVideoMinutes = 0;
    let agoraCost = 0;
    let agoraFromCache = true;

    const cacheKey = `${fromDate}_${toDate}`;
    const cached = await base44.asServiceRole.entities.AgoraUsageCache.filter({ cache_key: cacheKey }, "-fetched_at", 1);
    if (cached.length > 0) {
      const c = cached[0];
      agoraAudioMinutes = c.total_audio_minutes || 0;
      agoraVideoMinutes = c.total_video_minutes || 0;
    } else {
      // Fetch from Agora API directly (same logic as agoraUsage function)
      const projectId = Deno.env.get("AGORA_PROJECT_ID");
      const customerId = Deno.env.get("AGORA_CUSTOMER_ID");
      const customerSecret = Deno.env.get("AGORA_CUSTOMER_SECRET");
      if (projectId && customerId && customerSecret) {
        try {
          const credentials = btoa(`${customerId}:${customerSecret}`);
          const url = `https://api.agora.io/dev/v3/usage?project_id=${projectId}&from_date=${fromDate}&to_date=${toDate}&business=default`;
          const agoraRes = await fetch(url, {
            headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
          });
          if (agoraRes.ok) {
            const data = await agoraRes.json();
            const usages = data.usages || [];
            agoraAudioMinutes = usages.reduce((s: number, d: any) => s + Math.round((d.durationAudioAll || 0) / 60), 0);
            agoraVideoMinutes = usages.reduce((s: number, d: any) =>
              s + Math.round((d.durationVideoHd || 0) / 60) +
              Math.round((d.durationVideo1080P || 0) / 60) +
              Math.round((d.durationVideo2K || 0) / 60) +
              Math.round((d.durationVideo4K || 0) / 60) +
              Math.round((d.durationVideoHdp || 0) / 60), 0);
            const fetchedAt = new Date().toISOString();
            await base44.asServiceRole.entities.AgoraUsageCache.create({
              cache_key: cacheKey, from_date: fromDate, to_date: toDate,
              usages, total_audio_minutes: agoraAudioMinutes, total_video_minutes: agoraVideoMinutes, fetched_at: fetchedAt,
            }).catch(() => {});
            agoraFromCache = false;
          }
        } catch (e) {
          console.warn("[getMonthlyFinancials] Agora fetch failed:", e.message);
        }
      }
    }
    const totalAgoraMinutes = agoraAudioMinutes + agoraVideoMinutes;
    agoraCost = totalAgoraMinutes * (settings.agora_cost_per_min || 0);

    // ── 5) Operational + tax (from settings) ───────────────────────────────────
    const operational = settings.operational_monthly || 0;
    const taxAmount = netRevenue * (settings.tax_pct || 0) / 100;

    // ── 6) Net real profit ─────────────────────────────────────────────────────
    const totalCosts = paidToTutors + paidToAffiliates + totalFees + agoraCost + operational + taxAmount;
    const netProfit = netRevenue - totalCosts;
    const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return Response.json({
      data: {
        year, month: month + 1,
        period_label: `${monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
        gross_revenue: grossRevenue,
        total_discount: totalDiscount,
        total_fees: totalFees,
        net_revenue: netRevenue,
        tx_count: txCount,
        avg_ticket: avgTicket,
        paid_to_tutors: paidToTutors,
        tutor_payouts_count: monthWithdrawals.length,
        paid_to_affiliates: paidToAffiliates,
        affiliate_earnings_count: monthEarnings.length,
        agora_audio_minutes: agoraAudioMinutes,
        agora_video_minutes: agoraVideoMinutes,
        agora_total_minutes: totalAgoraMinutes,
        agora_cost: agoraCost,
        agora_from_cache: agoraFromCache,
        operational,
        tax_amount: taxAmount,
        total_costs: totalCosts,
        net_profit: netProfit,
        margin,
        breakdown: {
          mp_count: mpPayments.length,
          mp_gross: mpPayments.reduce((s, p) => s + (p.gross_amount || 0), 0),
          stripe_count: stripePayments.length,
          stripe_gross: stripePayments.reduce((s, p) => s + (p.gross_amount || 0), 0),
          plan_count: planPayments.length,
          plan_gross: planPayments.reduce((s, p) => s + (p.gross_amount || 0), 0),
          pack_count: packPayments.length,
          pack_gross: packPayments.reduce((s, p) => s + (p.gross_amount || 0), 0),
        },
        payments: monthPayments.map(p => ({
          id: p.id,
          provider: p.provider,
          type: p.type,
          reference: p.reference,
          gross_amount: p.gross_amount,
          discount_amount: p.discount_amount,
          estimated_fee: p.estimated_fee,
          net_amount: p.net_amount,
          coupon_code: p.coupon_code,
          created_at: p.created_at || p.created_date,
        })),
      },
    });
  } catch (error) {
    console.error('[getMonthlyFinancials]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});