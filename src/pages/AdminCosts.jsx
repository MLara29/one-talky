import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  DollarSign, TrendingUp, TrendingDown, Users, CreditCard,
  Percent, BarChart3, PieChart, Download, Edit2, Check, X, Save,
  Calendar, ChevronLeft, ChevronRight, BadgeCheck, AlertCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from "recharts";
import { PLANS } from "@/lib/constants";

function fmtUSD(v) {
  return (v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtPct(v) {
  return `${(v || 0).toFixed(1)}%`;
}

const COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];

// ── Metric Card ─────────────────────────────────────────
function MetricCard({ label, value, sub, color = "violet", icon: IconComp, trend }) {
  const Icon = IconComp;
  const colors = {
    violet: { bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.25)", text: "#7c3aed", icon: "#7c3aed" },
    emerald: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#10b981", icon: "#10b981" },
    amber: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#f59e0b", icon: "#f59e0b" },
    red: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", text: "#ef4444", icon: "#ef4444" },
    blue: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", text: "#3b82f6", icon: "#3b82f6" },
  };
  const c = colors[color] || colors.violet;
  return (
    <div className="theme-card rounded-2xl p-5 bg-white/5 border border-white/10 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="theme-subtext text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <Icon className="w-4 h-4" style={{ color: c.icon }} />
          </div>
        )}
      </div>
      <div>
        <p className="theme-heading font-display text-2xl font-bold text-white">{value}</p>
        {sub && <p className="theme-subtext text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-400"}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          Margin: {fmtPct(trend)}
        </div>
      )}
    </div>
  );
}

// ── Editable Field ───────────────────────────────────────
function EditableField({ label, value, onChange, prefix = "R$", suffix = "", type = "number", step = "0.01" }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  const save = () => { onChange(parseFloat(local) || 0); setEditing(false); };
  const cancel = () => { setLocal(value); setEditing(false); };
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="theme-subtext text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <span className="text-xs text-gray-500">{prefix}</span>
            <Input
              type={type} step={step} value={local}
              onChange={e => setLocal(e.target.value)}
              className="w-28 h-7 text-sm bg-white/10 border-violet-500/40 text-white text-right"
              autoFocus onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            />
            <span className="text-xs text-gray-500">{suffix}</span>
            <button onClick={save} className="text-emerald-500 hover:text-emerald-400"><Check className="w-4 h-4" /></button>
            <button onClick={cancel} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <span className="theme-heading font-medium text-white text-sm">
              {suffix === "%" ? `${value}%` : `${prefix} ${value}`}
            </span>
            <button onClick={() => { setLocal(value); setEditing(true); }} className="text-gray-500 hover:text-violet-400 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const DEFAULT_FINANCE = {
  mp_card_pct: 4.99,
  mp_card_fixed: 0.39,
  stripe_card_pct: 2.9,
  stripe_card_fixed: 0.30,
  agora_cost_per_min: 0.0099,
  affiliate_commission_pct: 15,
  avg_discount_pct: 0,
  tax_pct: 0,
  operational_monthly: 0,
  default_tutor_rate_hour: 36,
};

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function AdminCosts() {
  const { toast } = useToast();
  // ── Tutor rates (fetched from DB) — stored as $/hour, converted to $/min internally ──
  const [tutors, setTutors] = useState([]);
  const [tutorRatesHour, setTutorRatesHour] = useState({}); // { tutor_id: price_per_hour in USD }
  const [savingRates, setSavingRates] = useState(false);

  // ── Finance settings (persisted in AdminFinanceSettings) ──
  const [finance, setFinance] = useState({ ...DEFAULT_FINANCE });
  const [savingSettings, setSavingSettings] = useState(false);

  // ── globals kept solely for the Tutors tab (saveTutorRates + JSX reference) ──
  const [globals, setGlobals] = useState({ default_tutor_rate_hour: 36.0 });

  // ── Real financials (monthly) ──
  const [realMonth, setRealMonth] = useState(() => new Date().getMonth());
  const [realYear, setRealYear] = useState(() => new Date().getFullYear());
  const [realData, setRealData] = useState(null);
  const [loadingReal, setLoadingReal] = useState(false);

  useEffect(() => {
    base44.entities.TutorProfile.filter({ status: "approved" })
      .then(data => {
        setTutors(data);
        const rates = {};
        data.forEach(t => { rates[t.id] = (t.price_per_minute || globals.default_tutor_rate_hour / 60) * 60; });
        setTutorRatesHour(rates);
      })
      .catch(() => {});
    // Load persisted finance settings
    base44.functions.invoke("getFinanceSettings")
      .then(res => {
        if (res.data) {
          setFinance(res.data);
          setGlobals({ default_tutor_rate_hour: res.data.default_tutor_rate_hour ?? 36 });
        }
      })
      .catch(() => {});
  }, []);

  const saveTutorRates = async () => {
    setSavingRates(true);
    try {
      const rates = tutors.map(t => ({
        tutor_id: t.id,
        price_per_minute: (tutorRatesHour[t.id] ?? globals.default_tutor_rate_hour) / 60,
      }));
      const response = await base44.functions.invoke("adminSetTutorRate", { rates });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Taxas salvas com sucesso!" });
    } catch (err) {
      toast({ title: "Erro ao salvar taxas", description: err.message, variant: "destructive" });
    } finally {
      setSavingRates(false);
    }
  };

  const saveFinanceSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await base44.functions.invoke("updateFinanceSettings", finance);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (err) {
      const msg = err?.message === "otp_required" ? "Confirme o código 2FA para salvar." : err.message;
      toast({ title: "Erro ao salvar configurações", description: msg, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Calculations ─────────────────────────────────────────
  const planResults = useMemo(() => {
    const defaultRatePerMin = globals.default_tutor_rate_hour / 60;
    return PLANS.filter(p => p.price_monthly > 0).map(plan => {
      const revenue = plan.price_monthly;
      const minutes = plan.minutes * 4;
      const tutor_cost = defaultRatePerMin * minutes;
      // Use Mercado Pago card fee (conservative — higher than Stripe)
      const mp_card_fee = (revenue * finance.mp_card_pct / 100) + finance.mp_card_fixed;
      const stripe_card_fee = (revenue * finance.stripe_card_pct / 100) + finance.stripe_card_fixed;
      const card_fee = mp_card_fee; // conservative
      const agora_cost = minutes * (finance.agora_cost_per_min || 0);
      // affiliate_cost_estimate is a CEILING — assumes ALL sales come from affiliates
      const affiliate_cost_estimate = revenue * (finance.affiliate_commission_pct || 0) / 100;
      const tax_fee = revenue * (finance.tax_pct || 0) / 100;
      const total_costs = tutor_cost + card_fee + agora_cost + affiliate_cost_estimate + tax_fee + (finance.operational_monthly || 0);
      const gross_profit = revenue - tutor_cost;
      const net_profit = revenue - total_costs;
      const hours = minutes / 60;
      const profit_per_hour = hours > 0 ? net_profit / hours : 0;
      const profit_per_min = minutes > 0 ? net_profit / minutes : 0;
      const margin = revenue > 0 ? (net_profit / revenue) * 100 : 0;

      return {
        ...plan,
        revenue, minutes, hours, tutor_cost,
        card_fee, mp_card_fee, stripe_card_fee, agora_cost, affiliate_cost_estimate,
        tax_fee, total_costs, gross_profit, net_profit,
        profit_per_hour, profit_per_min, margin
      };
    });
  }, [PLANS, finance, globals]);

  // ── Aggregate totals (across all plans, weighted equally) ──
  const totals = useMemo(() => {
    if (!planResults.length) return {};
    const avg = (key) => planResults.reduce((s, p) => s + p[key], 0) / planResults.length;
    const sum = (key) => planResults.reduce((s, p) => s + p[key], 0);
    return {
      revenue: sum("revenue"),
      tutor_cost: sum("tutor_cost"),
      agora_cost: sum("agora_cost"),
      affiliate_cost_estimate: sum("affiliate_cost_estimate"),
      total_costs: sum("total_costs"),
      gross_profit: sum("gross_profit"),
      net_profit: sum("net_profit"),
      avg_margin: avg("margin"),
      profit_per_hour: avg("profit_per_hour"),
      profit_per_min: avg("profit_per_min"),
    };
  }, [planResults]);

  // ── Chart data ──
  const barData = planResults.map(p => ({
    name: p.name,
    Receita: p.revenue,
    "Custo Tutor": p.tutor_cost,
    Taxas: parseFloat((p.card_fee + p.agora_cost).toFixed(2)),
    "Lucro Líquido": parseFloat(p.net_profit.toFixed(2)),
  }));

  const pieData = planResults.length > 0 ? [
    { name: "Tutor", value: parseFloat(totals.tutor_cost?.toFixed(2)) },
    { name: "Taxa Cartão", value: parseFloat(planResults.reduce((s, p) => s + p.card_fee, 0).toFixed(2)) },
    { name: "Agora.io", value: parseFloat(totals.agora_cost?.toFixed(2)) },
    { name: "Afiliado (teto)", value: parseFloat(totals.affiliate_cost_estimate?.toFixed(2)) },
    { name: "Lucro", value: parseFloat(totals.net_profit?.toFixed(2)) },
  ].filter(d => d.value > 0) : [];

  // ── CSV Export ──
  const exportCSV = () => {
    const headers = ["Plano","Receita","Minutos","Horas","Custo Tutor","Taxa Cartão","Agora","Afiliado (teto)","Lucro Bruto","Lucro Líquido","Lucro/hora","Lucro/min","Margem %"];
    const rows = planResults.map(p => [
      p.name, p.revenue, p.minutes, p.hours.toFixed(1),
      p.tutor_cost.toFixed(2), p.card_fee.toFixed(2),
      p.agora_cost.toFixed(4), p.affiliate_cost_estimate.toFixed(2),
      p.gross_profit.toFixed(2), p.net_profit.toFixed(2),
      p.profit_per_hour.toFixed(2), p.profit_per_min.toFixed(4), p.margin.toFixed(1)
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "profitability.csv"; a.click();
  };

  // ── Real financials loader ──
  const loadRealFinancials = useCallback(async () => {
    setLoadingReal(true);
    try {
      const res = await base44.functions.invoke("getMonthlyFinancials", { year: realYear, month: realMonth });
      if (res.data?.error) throw new Error(res.data.error);
      setRealData(res.data);
    } catch (err) {
      const msg = err?.message === "otp_required" ? "Confirme o código 2FA para ver os dados reais." : err.message;
      toast({ title: "Erro ao carregar financeiro real", description: msg, variant: "destructive" });
    } finally {
      setLoadingReal(false);
    }
  }, [realYear, realMonth]);

  useEffect(() => {
    loadRealFinancials();
  }, [loadRealFinancials]);

  const prevMonth = () => {
    if (realMonth === 0) { setRealMonth(11); setRealYear(y => y - 1); }
    else setRealMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (realMonth === 11) { setRealMonth(0); setRealYear(y => y + 1); }
    else setRealMonth(m => m + 1);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Custos e Rentabilidade</h1>
          <p className="theme-subtext text-gray-500 text-sm">Simulador de projeção — valores hipotéticos por plano, não refletem o faturamento real do mês. Veja o faturamento real na aba "Financeiro Real".</p>
        </div>
        <Button onClick={exportCSV} size="sm" className="bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10">
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* ── Dashboard cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Receita Total" value={fmtUSD(totals.revenue)} icon={DollarSign} color="violet" />
        <MetricCard label="Pago a Tutores" value={fmtUSD(totals.tutor_cost)} icon={Users} color="blue" />
        <MetricCard label="Taxas Totais" value={fmtUSD((totals.total_costs || 0) - (totals.tutor_cost || 0) - (totals.agora_cost || 0) - (totals.affiliate_cost_estimate || 0))} icon={CreditCard} color="amber" />
        <MetricCard label="Lucro Bruto" value={fmtUSD(totals.gross_profit)} icon={TrendingUp} color="emerald" />
        <MetricCard label="Lucro Líquido" value={fmtUSD(totals.net_profit)} icon={TrendingUp} color="emerald" trend={totals.avg_margin} />
        <MetricCard label="Margem Média" value={fmtPct(totals.avg_margin)} icon={Percent} color="violet" />
        <MetricCard label="Lucro Médio/hora" value={fmtUSD(totals.profit_per_hour)} icon={BarChart3} color="blue" />
        <MetricCard label="Lucro Médio/min" value={fmtUSD(totals.profit_per_min)} icon={BarChart3} color="amber" />
      </div>

      <Tabs defaultValue="real">
        <TabsList className="mb-6 bg-white/5 border border-white/10 flex w-full sm:w-auto flex-wrap">
          <TabsTrigger value="real" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-gray-500 text-xs px-4">Financeiro Real</TabsTrigger>
          <TabsTrigger value="simulator" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Simulador</TabsTrigger>
          <TabsTrigger value="tutors" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Tutores</TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Planos</TabsTrigger>
          <TabsTrigger value="costs" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Taxas</TabsTrigger>
          <TabsTrigger value="charts" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Gráficos</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Config. Globais</TabsTrigger>
        </TabsList>

        {/* ── FINANCEIRO REAL ── */}
        <TabsContent value="real">
          <div className="space-y-5">
            {/* Month selector */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
                <span className="theme-heading font-display font-bold text-white text-lg min-w-[140px] text-center">{MONTH_NAMES[realMonth]} {realYear}</span>
                <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <BadgeCheck className="w-3.5 h-3.5" /> Dados reais
                </span>
                <Button onClick={loadRealFinancials} variant="outline" size="sm" className="bg-white/5 border-white/10 text-gray-300">
                  Atualizar
                </Button>
              </div>
            </div>

            {loadingReal ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : realData ? (
              <>
                {/* Real metric cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Receita Bruta" value={fmtBRL(realData.gross_revenue)} sub={`${realData.tx_count} transações`} icon={DollarSign} color="emerald" />
                  <MetricCard label="Receita Líquida" value={fmtBRL(realData.net_revenue)} sub={`Taxas: ${fmtBRL(realData.total_fees)}`} icon={TrendingUp} color="violet" />
                  <MetricCard label="Ticket Médio" value={fmtBRL(realData.avg_ticket)} icon={BarChart3} color="blue" />
                  <MetricCard label="Descontos" value={fmtBRL(realData.total_discount)} icon={Percent} color="amber" />
                  <MetricCard label="Pago a Tutores" value={fmtBRL(realData.paid_to_tutors)} sub={`${realData.tutor_payouts_count} saques`} icon={Users} color="blue" />
                  <MetricCard label="Pago a Afiliados" value={fmtBRL(realData.paid_to_affiliates)} sub={`${realData.affiliate_earnings_count} comissões`} icon={Users} color="amber" />
                  <MetricCard label="Custo Agora.io" value={fmtUSD(realData.agora_cost)} sub={`${realData.agora_total_minutes} min (${realData.agora_audio_minutes} áudio + ${realData.agora_video_minutes} vídeo)`} icon={CreditCard} color="red" />
                  <MetricCard label="Operacional + Impostos" value={fmtBRL(realData.operational + realData.tax_amount)} icon={CreditCard} color="amber" />
                </div>

                {/* Net profit highlight */}
                <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="theme-subtext text-xs text-gray-500 uppercase tracking-wide mb-1">Lucro Líquido Real</p>
                      <p className={`theme-heading font-display text-3xl font-bold ${realData.net_profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtBRL(realData.net_profit)}</p>
                    </div>
                    <div className="text-right">
                      <p className="theme-subtext text-xs text-gray-500 uppercase tracking-wide mb-1">Margem Real</p>
                      <p className={`font-display text-2xl font-bold ${realData.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtPct(realData.margin)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-gray-500">Receita Líquida:</span> <span className="theme-heading text-white font-medium">{fmtBRL(realData.net_revenue)}</span></div>
                    <div><span className="text-gray-500">Total de Custos:</span> <span className="theme-heading text-white font-medium">{fmtBRL(realData.total_costs)}</span></div>
                    <div><span className="text-gray-500">MP:</span> <span className="theme-heading text-white font-medium">{realData.breakdown.mp_count}x · {fmtBRL(realData.breakdown.mp_gross)}</span></div>
                    <div><span className="text-gray-500">Stripe:</span> <span className="theme-heading text-white font-medium">{realData.breakdown.stripe_count}x · {fmtBRL(realData.breakdown.stripe_gross)}</span></div>
                  </div>
                </div>

                {/* Real transactions table */}
                <div className="theme-card bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="theme-heading font-display font-bold text-white">Transações do Mês</h2>
                    <p className="theme-subtext text-xs text-gray-500 mt-0.5">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      A taxa do gateway é estimada (calculada com a taxa configurada), não o valor exato cobrado por provedor.
                    </p>
                  </div>
                  {realData.payments.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="theme-subtext text-sm text-gray-500">Nenhuma transação neste mês</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            {["Data", "Provedor", "Tipo", "Referência", "Bruto", "Desconto", "Taxa Estim.", "Líquido", "Cupom"].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {realData.payments.map(p => (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                              <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.provider === "stripe" ? "bg-violet-500/15 border border-violet-500/20 text-violet-300" : "bg-blue-500/15 border border-blue-500/20 text-blue-300"}`}>
                                  {p.provider === "stripe" ? "Stripe" : "Mercado Pago"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400 capitalize">{p.type === "plan" ? "Plano" : "Pacote"}</td>
                              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.reference}</td>
                              <td className="px-4 py-3 text-white font-medium">{fmtBRL(p.gross_amount)}</td>
                              <td className="px-4 py-3 text-amber-400">{p.discount_amount > 0 ? fmtBRL(p.discount_amount) : "—"}</td>
                              <td className="px-4 py-3 text-red-400">{fmtBRL(p.estimated_fee)}</td>
                              <td className="px-4 py-3 text-emerald-400 font-medium">{fmtBRL(p.net_amount)}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{p.coupon_code || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <p className="theme-subtext text-sm text-gray-500">Nenhum dado carregado</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── SIMULADOR ── */}
        <TabsContent value="simulator">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" /> Projeção
            </span>
            <span className="theme-subtext text-xs text-gray-500">Valores hipotéticos por plano — não refletem o faturamento real do mês.</span>
          </div>
          <div className="space-y-4">
            {planResults.map(p => {
              const marginColor = p.margin >= 30 ? "text-emerald-400" : p.margin >= 15 ? "text-amber-400" : "text-red-400";
              return (
                <div key={p.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="theme-heading font-display font-bold text-white text-lg">{p.name}</h3>
                      <p className="theme-subtext text-xs text-gray-500">{p.minutes} min/mês · {p.hours.toFixed(1)} horas</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-display text-2xl font-bold ${marginColor}`}>{fmtPct(p.margin)}</p>
                      <p className="theme-subtext text-xs text-gray-500">margem líquida</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Receita", value: fmtUSD(p.revenue), color: "text-white" },
                      { label: "Custo Tutor", value: fmtUSD(p.tutor_cost), color: "text-blue-400" },
                      { label: "Taxas Totais", value: fmtUSD(p.card_fee + p.tax_fee), color: "text-amber-400" },
                      { label: "Agora.io", value: fmtUSD(p.agora_cost), color: "text-red-400" },
                      { label: "Afiliado (teto)", value: fmtUSD(p.affiliate_cost_estimate), color: "text-amber-400" },
                      { label: "Lucro Líquido", value: fmtUSD(p.net_profit), color: marginColor },
                      { label: "Lucro Bruto", value: fmtUSD(p.gross_profit), color: "text-emerald-400" },
                      { label: "Lucro/hora", value: fmtUSD(p.profit_per_hour), color: "text-violet-400" },
                    ].map(item => (
                      <div key={item.label} className="bg-white/3 border border-white/5 rounded-xl p-3">
                        <p className="theme-subtext text-[10px] text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                        <p className={`font-display font-bold text-sm ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Cost breakdown bar */}
                  <div className="mt-5">
                    <p className="theme-subtext text-xs text-gray-500 mb-2">Composição da receita</p>
                    <div className="flex h-3 rounded-full overflow-hidden gap-px">
                      <div className="bg-blue-500 transition-all" style={{ width: `${(p.tutor_cost / p.revenue) * 100}%` }} title="Tutor" />
                      <div className="bg-amber-500 transition-all" style={{ width: `${(p.card_fee / p.revenue) * 100}%` }} title="Taxas" />
                      <div className="bg-red-500 transition-all" style={{ width: `${(p.agora_cost / p.revenue) * 100}%` }} title="Agora" />
                      <div className="bg-orange-500 transition-all" style={{ width: `${(p.affiliate_cost_estimate / p.revenue) * 100}%` }} title="Afiliado (teto)" />
                      <div className="bg-emerald-500 transition-all" style={{ width: `${Math.max(0, p.margin)}%` }} title="Lucro" />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Tutor {fmtPct((p.tutor_cost / p.revenue) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Taxas {fmtPct((p.card_fee / p.revenue) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Agora {fmtPct((p.agora_cost / p.revenue) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Afiliado (teto) {fmtPct((p.affiliate_cost_estimate / p.revenue) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Lucro {fmtPct(p.margin)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TUTORES ── */}
        <TabsContent value="tutors">
          <div className="theme-card bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="theme-heading font-display font-bold text-white">Taxas dos Tutores</h2>
                <p className="theme-subtext text-xs text-gray-500 mt-0.5">Edite os valores e clique em Salvar para gravar no banco de dados</p>
              </div>
              <Button onClick={saveTutorRates} disabled={savingRates || tutors.length === 0} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
                <Save className="w-4 h-4 mr-2" />
                {savingRates ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
            {tutors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="theme-subtext text-sm text-gray-500">Nenhum tutor aprovado ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Tutor", "USD/hora", "USD/min (auto)", "Status"].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tutors.map(t => {
                      const rateHour = tutorRatesHour[t.id] ?? globals.default_tutor_rate_hour;
                      return (
                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=7c3aed&color=fff&size=40`}
                                alt={t.full_name} className="w-8 h-8 rounded-xl object-cover" />
                              <span className="theme-heading font-medium text-white">{t.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number" step="0.01" min="0"
                                value={rateHour}
                                onChange={e => setTutorRatesHour(prev => ({ ...prev, [t.id]: parseFloat(e.target.value) || 0 }))}
                                className="w-24 h-7 text-xs bg-white/10 border-white/10 text-white text-right"
                              />
                              <span className="text-xs text-gray-500">$/h</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="theme-heading font-medium text-emerald-400">{fmtUSD(rateHour / 60)}/min</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-medium">Ativo</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── PLANOS ── */}
        <TabsContent value="plans">
          <div className="theme-card bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="theme-heading font-display font-bold text-white">Visão Geral dos Planos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Plano", "Preço/mês do aluno", "Horas", "Minutos", "$/hora", "$/minuto"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLANS.filter(p => p.price_monthly > 0).map(p => {
                    const mins = p.minutes * 4;
                    const hrs = mins / 60;
                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                        <td className="px-5 py-4 font-medium text-white">{p.name}</td>
                        <td className="px-5 py-4 text-emerald-400 font-medium">{fmtUSD(p.price_monthly)}</td>
                        <td className="px-5 py-4 text-gray-300">{hrs.toFixed(1)}h</td>
                        <td className="px-5 py-4 text-gray-300">{mins} min</td>
                        <td className="px-5 py-4 text-violet-400">{fmtUSD(p.price_monthly / hrs)}</td>
                        <td className="px-5 py-4 text-violet-400">{fmtUSD(p.price_monthly / mins)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAXAS ── */}
        <TabsContent value="costs">
          <div className="max-w-lg space-y-4">
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="theme-heading font-display font-bold text-white mb-1">Taxas — Mercado Pago</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Usado nos cálculos de lucro (conservador)</p>
              <EditableField label="Taxa do cartão (%)" value={finance.mp_card_pct} onChange={v => setFinance(p => ({ ...p, mp_card_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Taxa fixa por transação (R$)" value={finance.mp_card_fixed} onChange={v => setFinance(p => ({ ...p, mp_card_fixed: v }))} prefix="R$" />
            </div>
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="theme-heading font-display font-bold text-white mb-1">Taxas — Stripe</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Referência (não usada no cálculo conservador)</p>
              <EditableField label="Taxa do cartão (%)" value={finance.stripe_card_pct} onChange={v => setFinance(p => ({ ...p, stripe_card_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Taxa fixa por transação (R$)" value={finance.stripe_card_fixed} onChange={v => setFinance(p => ({ ...p, stripe_card_fixed: v }))} prefix="R$" />
            </div>
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="theme-heading font-display font-bold text-white mb-1">Custos de Infraestrutura</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Custo por minuto de vídeo via Agora.io</p>
              <EditableField label="Custo Agora.io (USD/min)" value={finance.agora_cost_per_min} onChange={v => setFinance(p => ({ ...p, agora_cost_per_min: v }))} prefix="$" step="0.0001" />
              <EditableField label="Comissão de afiliado (%)" value={finance.affiliate_commission_pct} onChange={v => setFinance(p => ({ ...p, affiliate_commission_pct: v }))} prefix="" suffix="%" />
            </div>
            <Button onClick={saveFinanceSettings} disabled={savingSettings} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
              <Save className="w-4 h-4 mr-2" />
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </TabsContent>

        {/* ── GRÁFICOS ── */}
        <TabsContent value="charts">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" /> Receita vs Custos por Plano
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                    formatter={v => fmtUSD(v)}
                  />
                  <Legend wrapperStyle={{ color: "#6b7280", fontSize: 11 }} />
                  <Bar dataKey="Receita" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Custo Tutor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lucro Líquido" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-violet-400" /> Distribuição de Custos
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <RPieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} formatter={v => fmtUSD(v)} />
                </RPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ── CONFIGURAÇÕES GLOBAIS ── */}
        <TabsContent value="settings">
          <div className="max-w-lg space-y-4">
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="theme-heading font-display font-bold text-white mb-1">Configurações Globais</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Afeta todos os cálculos do simulador em tempo real</p>
              <EditableField label="Taxa padrão do tutor (USD/hora)" value={finance.default_tutor_rate_hour} onChange={v => { setFinance(p => ({ ...p, default_tutor_rate_hour: v })); setGlobals(g => ({ ...g, default_tutor_rate_hour: v })); }} prefix="$" step="0.01" />
              <EditableField label="Desconto médio dos cupons (%)" value={finance.avg_discount_pct} onChange={v => setFinance(p => ({ ...p, avg_discount_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Impostos (%)" value={finance.tax_pct} onChange={v => setFinance(p => ({ ...p, tax_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Despesas operacionais (USD/mês)" value={finance.operational_monthly} onChange={v => setFinance(p => ({ ...p, operational_monthly: v }))} prefix="$" />
            </div>
            <div className="theme-card bg-white/3 border border-white/5 rounded-2xl p-5">
              <p className="theme-subtext text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-300">Fórmulas aplicadas:</strong><br />
                 Receita = Preço mensal do plano<br />
                 Custo do tutor = (USD/hora ÷ 60) × minutos do plano × 4 semanas<br />
                 Taxa do cartão = Receita × % MP + taxa fixa (conservador)<br />
                 Custo Agora = minutos × USD/min configurado<br />
                 Afiliado (teto) = Receita × % (assume que toda venda vem de afiliado)<br />
                 Lucro líquido = Receita − (tutor + taxas + Agora + afiliado + impostos + operacional)<br />
                 Margem % = Lucro líquido ÷ Receita × 100
              </p>
            </div>
            <Button onClick={saveFinanceSettings} disabled={savingSettings} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
              <Save className="w-4 h-4 mr-2" />
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}