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
          Margem: {fmtPct(trend)}
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
      toast({ title: "Taxas salvas com sucesso!" });
    } catch {
      toast({ title: "Erro ao salvar taxas", variant: "destructive" });
    } finally {
      setSavingRates(false);
    }
  };

  // ── Calculations ─────────────────────────────────────────
  const planResults = useMemo(() => {
    const defaultRatePerMin = globals.default_tutor_rate_hour / 60;
    return PLANS.filter(p => p.price_monthly > 0).map(plan => {
      const receita = plan.price_monthly;
      const minutes = plan.minutes * 4;
      const tutor_cost = defaultRatePerMin * minutes;
      // Taxa cartão = % sobre receita + fixo
      const card_fee = (receita * txCosts.card_pct / 100) + txCosts.card_fixed;
      // Taxa gateway = % sobre receita
      const gateway_fee = receita * txCosts.gateway_pct / 100;
      // Outras taxas
      const other_fee = receita * txCosts.other_pct / 100;
      // Impostos
      const tax_fee = receita * globals.tax_pct / 100;
      // Comissão extra
      const commission_fee = receita * globals.platform_commission / 100;
      // Total custos
      const total_costs = tutor_cost + card_fee + gateway_fee + other_fee + tax_fee + commission_fee + globals.operational;
      // Lucro bruto = receita - tutor
      const lucro_bruto = receita - tutor_cost;
      // Lucro líquido = receita - todos os custos
      const lucro_liquido = receita - total_costs;
      // Horas totais
      const horas = minutes / 60;
      // Lucro por hora
      const lucro_hora = horas > 0 ? lucro_liquido / horas : 0;
      // Lucro por minuto
      const lucro_min = minutes > 0 ? lucro_liquido / minutes : 0;
      // Margem %
      const margem = receita > 0 ? (lucro_liquido / receita) * 100 : 0;

      return {
        ...plan,
        receita, minutes, horas, tutor_cost,
        card_fee, gateway_fee, other_fee, tax_fee,
        total_costs, lucro_bruto, lucro_liquido,
        lucro_hora, lucro_min, margem
      };
    });
  }, [PLANS, txCosts, globals]);

  // ── Aggregate totals (across all plans, weighted equally) ──
  const totals = useMemo(() => {
    if (!planResults.length) return {};
    const avg = (key) => planResults.reduce((s, p) => s + p[key], 0) / planResults.length;
    const sum = (key) => planResults.reduce((s, p) => s + p[key], 0);
    return {
      receita: sum("receita"),
      tutor_cost: sum("tutor_cost"),
      total_costs: sum("total_costs"),
      lucro_bruto: sum("lucro_bruto"),
      lucro_liquido: sum("lucro_liquido"),
      margem_media: avg("margem"),
      lucro_hora: avg("lucro_hora"),
      lucro_min: avg("lucro_min"),
    };
  }, [planResults]);

  // ── Chart data ──
  const barData = planResults.map(p => ({
    name: p.name,
    Receita: p.receita,
    "Custo Tutor": p.tutor_cost,
    Taxas: parseFloat((p.card_fee + p.gateway_fee + p.other_fee).toFixed(2)),
    "Lucro Líquido": parseFloat(p.lucro_liquido.toFixed(2)),
  }));

  const pieData = planResults.length > 0 ? [
    { name: "Tutor", value: parseFloat(totals.tutor_cost?.toFixed(2)) },
    { name: "Taxa Cartão", value: parseFloat(planResults.reduce((s, p) => s + p.card_fee, 0).toFixed(2)) },
    { name: "Gateway", value: parseFloat(planResults.reduce((s, p) => s + p.gateway_fee, 0).toFixed(2)) },
    { name: "Lucro", value: parseFloat(totals.lucro_liquido?.toFixed(2)) },
  ].filter(d => d.value > 0) : [];

  // ── CSV Export ──
  const exportCSV = () => {
    const headers = ["Plano","Receita","Minutos","Horas","Custo Tutor","Taxas","Lucro Bruto","Lucro Líquido","Lucro/hora","Lucro/min","Margem %"];
    const rows = planResults.map(p => [
      p.name, p.receita, p.minutes, p.horas.toFixed(1),
      p.tutor_cost.toFixed(2), (p.card_fee + p.gateway_fee).toFixed(2),
      p.lucro_bruto.toFixed(2), p.lucro_liquido.toFixed(2),
      p.lucro_hora.toFixed(2), p.lucro_min.toFixed(4), p.margem.toFixed(1)
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "rentabilidade.csv"; a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Custos & Rentabilidade</h1>
          <p className="theme-subtext text-gray-500 text-sm">Simulador financeiro em tempo real · atualiza automaticamente</p>
        </div>
        <Button onClick={exportCSV} size="sm" className="bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10">
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* ── Dashboard cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Receita Total" value={fmtUSD(totals.receita)} icon={DollarSign} color="violet" />
        <MetricCard label="Pago aos Tutores" value={fmtUSD(totals.tutor_cost)} icon={Users} color="blue" />
        <MetricCard label="Total de Taxas" value={fmtUSD((totals.total_costs || 0) - (totals.tutor_cost || 0))} icon={CreditCard} color="amber" />
        <MetricCard label="Lucro Bruto" value={fmtUSD(totals.lucro_bruto)} icon={TrendingUp} color="emerald" />
        <MetricCard label="Lucro Líquido" value={fmtUSD(totals.lucro_liquido)} icon={TrendingUp} color="emerald" trend={totals.margem_media} />
        <MetricCard label="Margem Média" value={fmtPct(totals.margem_media)} icon={Percent} color="violet" />
        <MetricCard label="Lucro/hora médio" value={fmtUSD(totals.lucro_hora)} icon={BarChart3} color="blue" />
        <MetricCard label="Lucro/minuto médio" value={fmtUSD(totals.lucro_min)} icon={BarChart3} color="amber" />
      </div>

      <Tabs defaultValue="simulator">
        <TabsList className="mb-6 bg-white/5 border border-white/10 flex w-full sm:w-auto flex-wrap">
          <TabsTrigger value="simulator" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Simulador</TabsTrigger>
          <TabsTrigger value="tutors" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Tutores</TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Planos</TabsTrigger>
          <TabsTrigger value="costs" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Taxas</TabsTrigger>
          <TabsTrigger value="charts" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Gráficos</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 text-xs px-4">Config. Globais</TabsTrigger>
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
                      <p className="theme-subtext text-xs text-gray-500">{p.minutes} min/mês · {p.horas.toFixed(1)} horas</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-display text-2xl font-bold ${marginColor}`}>{fmtPct(p.margem)}</p>
                      <p className="theme-subtext text-xs text-gray-500">margem líquida</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Receita", value: fmtUSD(p.receita), color: "text-white" },
                      { label: "Custo Tutor", value: fmtUSD(p.tutor_cost), color: "text-blue-400" },
                      { label: "Taxas totais", value: fmtUSD(p.card_fee + p.gateway_fee + p.other_fee + p.tax_fee), color: "text-amber-400" },
                      { label: "Lucro Líquido", value: fmtUSD(p.lucro_liquido), color: marginColor },
                      { label: "Lucro Bruto", value: fmtUSD(p.lucro_bruto), color: "text-emerald-400" },
                      { label: "Lucro/hora", value: fmtUSD(p.lucro_hora), color: "text-violet-400" },
                      { label: "Lucro/min", value: fmtUSD(p.lucro_min), color: "text-violet-400" },
                      { label: "Taxa cartão", value: fmtUSD(p.card_fee), color: "text-gray-400" },
                    ].map(item => (
                      <div key={item.label} className="bg-white/3 border border-white/5 rounded-xl p-3">
                        <p className="theme-subtext text-[10px] text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                        <p className={`font-display font-bold text-sm ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Cost breakdown bar */}
                  <div className="mt-5">
                    <p className="theme-subtext text-xs text-gray-500 mb-2">Distribuição da receita</p>
                    <div className="flex h-3 rounded-full overflow-hidden gap-px">
                      <div className="bg-blue-500 transition-all" style={{ width: `${(p.tutor_cost / p.receita) * 100}%` }} title="Tutor" />
                      <div className="bg-amber-500 transition-all" style={{ width: `${((p.card_fee + p.gateway_fee) / p.receita) * 100}%` }} title="Taxas" />
                      <div className="bg-emerald-500 transition-all" style={{ width: `${Math.max(0, p.margem)}%` }} title="Lucro" />
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Tutor {fmtPct((p.tutor_cost / p.receita) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Taxas {fmtPct(((p.card_fee + p.gateway_fee) / p.receita) * 100)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Lucro {fmtPct(p.margem)}</span>
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
                <h2 className="theme-heading font-display font-bold text-white">Remuneração dos Tutores</h2>
                <p className="theme-subtext text-xs text-gray-500 mt-0.5">Edite os valores e clique em Salvar para persistir no banco</p>
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
                      {["Tutor", "USD/hora", "USD/minuto (auto)", "Status"].map(h => (
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
              <h2 className="theme-heading font-display font-bold text-white">Planos Vendidos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Plano", "Valor Aluno/mês", "Horas", "Minutos", "R$/hora", "R$/minuto"].map(h => (
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
              <h2 className="theme-heading font-display font-bold text-white mb-1">Custos de Transação</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Usados automaticamente nos cálculos de lucro</p>
              <EditableField label="Taxa do cartão (%)" value={txCosts.card_pct} onChange={v => setTxCosts(p => ({ ...p, card_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Taxa fixa por transação (R$)" value={txCosts.card_fixed} onChange={v => setTxCosts(p => ({ ...p, card_fixed: v }))} />
              <EditableField label="Taxa PIX (%)" value={txCosts.pix_pct} onChange={v => setTxCosts(p => ({ ...p, pix_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Taxa de boleto (R$)" value={txCosts.boleto} onChange={v => setTxCosts(p => ({ ...p, boleto: v }))} />
              <EditableField label="Taxa do gateway (%)" value={txCosts.gateway_pct} onChange={v => setTxCosts(p => ({ ...p, gateway_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Outras taxas (%)" value={txCosts.other_pct} onChange={v => setTxCosts(p => ({ ...p, other_pct: v }))} prefix="" suffix="%" />
            </div>
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
          <div className="max-w-lg">
            <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="theme-heading font-display font-bold text-white mb-1">Configurações Globais</h2>
              <p className="theme-subtext text-xs text-gray-500 mb-5">Afetam todos os cálculos em tempo real</p>
              <EditableField label="Taxa padrão dos tutores (USD/hora)" value={globals.default_tutor_rate_hour} onChange={v => setGlobals(p => ({ ...p, default_tutor_rate_hour: v }))} prefix="$" step="0.01" />
              <EditableField label="Comissão da plataforma (%)" value={globals.platform_commission} onChange={v => setGlobals(p => ({ ...p, platform_commission: v }))} prefix="" suffix="%" />
              <EditableField label="Impostos (%)" value={globals.tax_pct} onChange={v => setGlobals(p => ({ ...p, tax_pct: v }))} prefix="" suffix="%" />
              <EditableField label="Despesas operacionais (USD/mês)" value={globals.operational} onChange={v => setGlobals(p => ({ ...p, operational: v }))} prefix="$" />
            </div>
            <div className="theme-card bg-white/3 border border-white/5 rounded-2xl p-5 mt-4">
              <p className="theme-subtext text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-300">Fórmulas aplicadas:</strong><br />
                Receita = Valor mensal do plano<br />
                Custo tutor = (USD/hora ÷ 60) × minutos do plano × 4 semanas<br />
                Taxa cartão = Receita × % + fixo<br />
                Lucro líquido = Receita − (tutor + taxas + impostos + operacional)<br />
                Margem % = Lucro líquido ÷ Receita × 100
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}