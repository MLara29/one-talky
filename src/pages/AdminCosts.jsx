import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  DollarSign, TrendingUp, TrendingDown, Users, CreditCard,
  Percent, BarChart3, PieChart, Download, Edit2, Check, X, Save
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from "recharts";
import { PLANS } from "@/lib/constants";

function fmtUSD(v) {
  return (v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
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

export default function AdminCosts() {
  const { toast } = useToast();
  // ── Tutor rates (fetched from DB) — stored as $/hour, converted to $/min internally ──
  const [tutors, setTutors] = useState([]);
  const [tutorRatesHour, setTutorRatesHour] = useState({}); // { tutor_id: price_per_hour in USD }
  const [savingRates, setSavingRates] = useState(false);

  // ── Transaction costs ──
  const [txCosts, setTxCosts] = useState({
    card_pct: 4,
    card_fixed: 0.39,
    pix_pct: 0.99,
    boleto: 3.49,
    gateway_pct: 0.5,
    other_pct: 0,
  });

  // ── Global settings — default_tutor_rate stored as $/hour ──
  const [globals, setGlobals] = useState({
    default_tutor_rate_hour: 36.0,  // USD/hora padrão pago ao tutor
    platform_commission: 0,
    tax_pct: 0,
    operational: 0,
  });

  useEffect(() => {
    base44.entities.TutorProfile.filter({ status: "approved" })
      .then(data => {
        setTutors(data);
        const rates = {};
        data.forEach(t => { rates[t.id] = (t.price_per_minute || globals.default_tutor_rate_hour / 60) * 60; });
        setTutorRatesHour(rates);
      })
      .catch(() => {});
  }, []);

  const saveTutorRates = async () => {
    setSavingRates(true);
    try {
      await Promise.all(
        tutors.map(t => {
          const perHour = tutorRatesHour[t.id] ?? globals.default_tutor_rate_hour;
          return base44.entities.TutorProfile.update(t.id, { price_per_minute: perHour / 60 });
        })
      );
      toast({ title: "Rates saved successfully!" });
    } catch {
      toast({ title: "Error saving rates", variant: "destructive" });
    } finally {
      setSavingRates(false);
    }
  };

  // ── Calculations ─────────────────────────────────────────
  const planResults = useMemo(() => {
    const defaultRatePerMin = globals.default_tutor_rate_hour / 60;
    return PLANS.filter(p => p.price_monthly > 0).map(plan => {
      const revenue = plan.price_monthly;
      const minutes = plan.minutes * 4;
      const tutor_cost = defaultRatePerMin * minutes;
      const card_fee = (revenue * txCosts.card_pct / 100) + txCosts.card_fixed;
      const gateway_fee = revenue * txCosts.gateway_pct / 100;
      const other_fee = revenue * txCosts.other_pct / 100;
      const tax_fee = revenue * globals.tax_pct / 100;
      const commission_fee = revenue * globals.platform_commission / 100;
      const total_costs = tutor_cost + card_fee + gateway_fee + other_fee + tax_fee + commission_fee + globals.operational;
      const gross_profit = revenue - tutor_cost;
      const net_profit = revenue - total_costs;
      const hours = minutes / 60;
      const profit_per_hour = hours > 0 ? net_profit / hours : 0;
      const profit_per_min = minutes > 0 ? net_profit / minutes : 0;
      const margin = revenue > 0 ? (net_profit / revenue) * 100 : 0;

      return {
        ...plan,
        revenue, minutes, hours, tutor_cost,
        card_fee, gateway_fee, other_fee, tax_fee,
        total_costs, gross_profit, net_profit,
        profit_per_hour, profit_per_min, margin
      };
    });
  }, [PLANS, txCosts, globals]);

  // ── Aggregate totals (across all plans, weighted equally) ──
  const totals = useMemo(() => {
    if (!planResults.length) return {};
    const avg = (key) => planResults.reduce((s, p) => s + p[key], 0) / planResults.length;
    const sum = (key) => planResults.reduce((s, p) => s + p[key], 0);
    return {
      revenue: sum("revenue"),
      tutor_cost: sum("tutor_cost"),
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
    Revenue: p.revenue,
    "Tutor Cost": p.tutor_cost,
    Fees: parseFloat((p.card_fee + p.gateway_fee + p.other_fee).toFixed(2)),
    "Net Profit": parseFloat(p.net_profit.toFixed(2)),
  }));

  const pieData = planResults.length > 0 ? [
    { name: "Tutor", value: parseFloat(totals.tutor_cost?.toFixed(2)) },
    { name: "Card Fee", value: parseFloat(planResults.reduce((s, p) => s + p.card_fee, 0).toFixed(2)) },
    { name: "Gateway", value: parseFloat(planResults.reduce((s, p) => s + p.gateway_fee, 0).toFixed(2)) },
    { name: "Profit", value: parseFloat(totals.net_profit?.toFixed(2)) },
  ].filter(d => d.value > 0) : [];

  // ── CSV Export ──
  const exportCSV = () => {
    const headers = ["Plan","Revenue","Minutes","Hours","Tutor Cost","Fees","Gross Profit","Net Profit","Profit/hour","Profit/min","Margin %"];
    const rows = planResults.map(p => [
      p.name, p.revenue, p.minutes, p.hours.toFixed(1),
      p.tutor_cost.toFixed(2), (p.card_fee + p.gateway_fee).toFixed(2),
      p.gross_profit.toFixed(2), p.net_profit.toFixed(2),
      p.profit_per_hour.toFixed(2), p.profit_per_min.toFixed(4), p.margin.toFixed(1)
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "profitability.csv"; a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Costs & Profitability</h1>
          <p className="theme-subtext text-gray-500 text-sm">Real-time financial simulator · updates automatically</p>
        </div>
        <Button onClick={exportCSV} size="sm" className="bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* ── Dashboard cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Total Revenue" value={fmtUSD(totals.revenue)} icon={DollarSign} color="violet" />
        <MetricCard label="Paid to Tutors" value={fmtUSD(totals.tutor_cost)} icon={Users} color="blue" />
        <MetricCard label="Total Fees" value={fmtUSD((totals.total_costs || 0) - (totals.tutor_cost || 0))} icon={CreditCard} color="amber" />
        <MetricCard label="Gross Profit" value={fmtUSD(totals.gross_profit)} icon={TrendingUp} color="emerald" />
        <MetricCard label="Net Profit" value={fmtUSD(totals.net_profit)} icon={TrendingUp} color="emerald" trend={totals.avg_margin} />
        <MetricCard label="Avg Margin" value={fmtPct(totals.avg_margin)} icon={Percent} color="violet" />
        <MetricCard label="Avg Profit/hour" value={fmtUSD(totals.profit_per_hour)} icon={BarChart3} color="blue" />
        <MetricCard label="Avg Profit/min" value={fmtUSD(totals.profit_per_min)} icon={BarChart3} color="amber" />
      </div>

      <Tabs defaultValue="simulator">
        <TabsList className="mb-6 bg-white/5 border border-white/10 flex w-full sm:w-auto flex-wrap">
          <TabsTrigger value="simulator" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Simulator</TabsTrigger>
          <TabsTrigger value="tutors" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Tutors</TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Plans</TabsTrigger>
          <TabsTrigger value="costs" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Fees</TabsTrigger>
          <TabsTrigger value="charts" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Charts</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Global Settings</TabsTrigger>
        </TabsList>

        {/* ── SIMULADOR ── */}
        <TabsContent value="simulator">
          <div className="space-y-4">
            {planResults.map(p => {
              const marginColor = p.margem >= 30 ? "text-emerald-400" : p.margem >= 15 ? "text-amber-400" : "text-red-400";
              return (
                <div key={p.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="theme-heading font-display font-bold text-white text-lg">{p.name}</h3>
                      <p className="theme-subtext text-xs text-gray-500">{p.minutes} min/mo · {p.hours.toFixed(1)} hours</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-display text-2xl font-bold ${marginColor}`}>{fmtPct(p.margin)}</p>
                      <p className="theme-subtext text-xs text-gray-500">net margin</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Revenue", value: fmtUSD(p.revenue), color: "text-white" },
                      { label: "Tutor Cost", value: fmtUSD(p.tutor_cost), color: "text-blue-400" },
                      { label: "Total Fees", value: fmtUSD(p.card_fee + p.gateway_fee + p.other_fee + p.tax_fee), color: "text-amber-400" },
                      { label: "Net Profit", value: fmtUSD(p.net_profit), color: marginColor },
                      { label: "Gross Profit", value: fmtUSD(p.gross_profit), color: "text-emerald-400" },
                      { label: "Profit/hour", value: fmtUSD(p.profit_per_hour), color: "text-violet-400" },
                      { label: "Profit/min", value: fmtUSD(p.profit_per_min), color: "text-violet-400" },
                      { label: "Card Fee", value: fmtUSD(p.card_fee), color: "text-gray-400" },
                    ].map(item => (
                      <div key={item.label} className="bg-white/3 border border-white/5 rounded-xl p-3">
                        <p className="theme-subtext text-[10px] text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                        <p className={`font-display font-bold text-sm ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Cost breakdown bar */}
                  <div className="mt-5">
                    <p className="theme-subtext text-xs text-gray-500 mb-2">Revenue breakdown</p>
                    <div className="flex h-3 rounded-full overflow-hidden gap-px">
                      <div className="bg-blue-500 transition-all" style={{ width: `${(p.tutor_cost / p.revenue) * 100}%` }} title="Tutor" />
                      <div className="bg-amber-500 transition-all" style={{ width: `${((p.card_fee + p.gateway_fee) / p.revenue) * 100}%` }} title="Fees" />
                      <div className="bg-emerald-500 transition-all" style={{ width: `${Math.max(0, p.margin)}%` }} title="Profit" />
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Tutor {fmtPct((p.tutor_cost / p.revenue) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Fees {fmtPct(((p.card_fee + p.gateway_fee) / p.revenue) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Profit {fmtPct(p.margin)}</span>
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
                <h2 className="theme-heading font-display font-bold text-white">Tutor Rates</h2>
                <p className="theme-subtext text-xs text-gray-500 mt-0.5">Edit values and click Save to persist to database</p>
              </div>
              <Button onClick={saveTutorRates} disabled={savingRates || tutors.length === 0} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
                <Save className="w-4 h-4 mr-2" />
                {savingRates ? "Saving..." : "Save changes"}
              </Button>
            </div>
            {tutors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="theme-subtext text-sm text-gray-500">No approved tutors yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Tutor", "USD/hour", "USD/min (auto)", "Status"].map(h => (
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
                            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-medium">Active</span>
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
              <h2 className="theme-heading font-display font-bold text-white">Plans Overview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Plan", "Student Price/mo", "Hours", "Minutes", "$/hour", "$/minute"].map(h => (
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
          <div className="max-w-lg">
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="theme-heading font-display font-bold text-white mb-1">Transaction Costs</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Used automatically in profit calculations</p>
              <EditableField label="Card fee (%)" value={txCosts.card_pct} onChange={v => setTxCosts(p => ({ ...p, card_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Fixed fee per transaction ($)" value={txCosts.card_fixed} onChange={v => setTxCosts(p => ({ ...p, card_fixed: v }))} />
              <EditableField label="PIX fee (%)" value={txCosts.pix_pct} onChange={v => setTxCosts(p => ({ ...p, pix_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Boleto fee ($)" value={txCosts.boleto} onChange={v => setTxCosts(p => ({ ...p, boleto: v }))} />
              <EditableField label="Gateway fee (%)" value={txCosts.gateway_pct} onChange={v => setTxCosts(p => ({ ...p, gateway_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Other fees (%)" value={txCosts.other_pct} onChange={v => setTxCosts(p => ({ ...p, other_pct: v }))} prefix="" suffix="%" />
            </div>
          </div>
        </TabsContent>

        {/* ── GRÁFICOS ── */}
        <TabsContent value="charts">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" /> Revenue vs Costs by Plan
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
                  <Bar dataKey="Revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Tutor Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-violet-400" /> Cost Distribution
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
          <div className="max-w-lg">
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="theme-heading font-display font-bold text-white mb-1">Global Settings</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Affects all calculations in real time</p>
              <EditableField label="Default tutor rate (USD/hour)" value={globals.default_tutor_rate_hour} onChange={v => setGlobals(p => ({ ...p, default_tutor_rate_hour: v }))} prefix="$" step="0.01" />
              <EditableField label="Platform commission (%)" value={globals.platform_commission} onChange={v => setGlobals(p => ({ ...p, platform_commission: v }))} prefix="" suffix="%" />
              <EditableField label="Taxes (%)" value={globals.tax_pct} onChange={v => setGlobals(p => ({ ...p, tax_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Operational expenses (USD/mo)" value={globals.operational} onChange={v => setGlobals(p => ({ ...p, operational: v }))} prefix="$" />
            </div>
            <div className="theme-card bg-white/3 border border-white/5 rounded-2xl p-5 mt-4">
              <p className="theme-subtext text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-300">Formulas applied:</strong><br />
                 Revenue = Plan monthly price<br />
                 Tutor cost = (USD/hour ÷ 60) × plan minutes × 4 weeks<br />
                 Card fee = Revenue × % + fixed<br />
                 Net profit = Revenue − (tutor + fees + taxes + operational)<br />
                 Margin % = Net profit ÷ Revenue × 100
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}