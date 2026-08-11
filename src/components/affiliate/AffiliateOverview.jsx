import React, { useMemo } from "react";
import { Users, DollarSign, Clock, TrendingUp, UserX, UserCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AffiliateOverview({ affiliate, earnings, freeStudents = [], paidStudents = [] }) {
  const totalHistoric = earnings.reduce((s, e) => s + (e.commission_amount || 0), 0);
  const available = earnings
    .filter(e => e.status === "liberado")
    .reduce((s, e) => s + (e.commission_amount || 0), 0);
  const pending = earnings
    .filter(e => e.status === "aguardando_7_dias")
    .reduce((s, e) => s + (e.commission_amount || 0), 0);

  const totalStudents = paidStudents.length + freeStudents.length;

  const stats = [
    { label: "Total de indicados", value: totalStudents, icon: Users, gradient: "from-violet-500 to-indigo-500" },
    { label: "Comissões históricas", value: fmtBRL(totalHistoric), icon: TrendingUp, gradient: "from-emerald-500 to-teal-500" },
    { label: "Disponível p/ resgate", value: fmtBRL(available), icon: DollarSign, gradient: "from-amber-500 to-orange-500" },
    { label: "Em carência (7 dias)", value: fmtBRL(pending), icon: Clock, gradient: "from-blue-500 to-cyan-500" },
  ];

  // Cumulative commission growth over time
  const chartData = useMemo(() => {
    const sorted = [...earnings]
      .filter(e => e.sale_date)
      .sort((a, b) => new Date(a.sale_date) - new Date(b.sale_date));

    let cumulative = 0;
    return sorted.map(e => {
      cumulative += e.commission_amount || 0;
      return {
        date: new Date(e.sale_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        total: parseFloat(cumulative.toFixed(2)),
      };
    });
  }, [earnings]);

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(s => (
          <div key={s.label} className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/8 transition-all">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-lg`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="theme-heading font-display text-2xl font-bold">{s.value}</p>
            <p className="theme-subtext text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Students summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="theme-card bg-white/5 border border-emerald-500/20 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="theme-heading font-display text-2xl font-bold text-emerald-400">{paidStudents.length}</p>
            <p className="text-xs text-gray-500">Com plano ativo</p>
          </div>
        </div>
        <div className="theme-card bg-white/5 border border-amber-500/20 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="theme-heading font-display text-2xl font-bold text-amber-400">{freeStudents.length}</p>
            <p className="text-xs text-gray-500">Sem plano ativo</p>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
        <h3 className="theme-heading font-display font-bold mb-5">Crescimento das Comissões</h3>
        {earnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <TrendingUp className="w-8 h-8 text-gray-600" />
            <p className="theme-subtext text-gray-500 text-sm">Nenhuma comissão ainda. Compartilhe seu cupom!</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="affiliateGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} orientation="right" />
              <Tooltip
                contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12 }}
                labelStyle={{ color: "#fff" }}
                formatter={v => [fmtBRL(v), "Total acumulado"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#affiliateGrowth)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}