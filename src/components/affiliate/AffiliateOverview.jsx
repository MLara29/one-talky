import React, { useMemo } from "react";
import { Users, DollarSign, Clock, TrendingUp, UserX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AffiliateOverview({ affiliate, earnings, freeStudents = [] }) {
  const totalHistoric = earnings.reduce((s, e) => s + (e.commission_amount || 0), 0);
  const available = earnings
    .filter(e => e.status === "liberado")
    .reduce((s, e) => s + (e.commission_amount || 0), 0);
  const pending = earnings
    .filter(e => e.status === "aguardando_7_dias")
    .reduce((s, e) => s + (e.commission_amount || 0), 0);

  const uniqueStudents = new Set(earnings.map(e => e.student_id)).size;

  const stats = [
    { label: "Alunos indicados", value: uniqueStudents, icon: Users, gradient: "from-violet-500 to-indigo-500" },
    { label: "Comissões históricas", value: fmtBRL(totalHistoric), icon: TrendingUp, gradient: "from-emerald-500 to-teal-500" },
    { label: "Disponível p/ resgate", value: fmtBRL(available), icon: DollarSign, gradient: "from-amber-500 to-orange-500" },
    { label: "Em carência (7 dias)", value: fmtBRL(pending), icon: Clock, gradient: "from-blue-500 to-cyan-500" },
  ];

  // Monthly chart data (last 6 months)
  const chartData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { month: d.toLocaleString("pt-BR", { month: "short" }), amount: 0 };
    }
    earnings.forEach(e => {
      if (!e.sale_date) return;
      const d = new Date(e.sale_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) months[key].amount += e.commission_amount || 0;
    });
    return Object.values(months);
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

      {/* Free students (used coupon but no paid plan) */}
      {freeStudents.length > 0 && (
        <div className="theme-card bg-white/5 border border-amber-500/20 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <UserX className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="theme-heading font-display font-bold text-sm">Alunos sem plano ativo</h3>
              <p className="text-xs text-gray-500">Usaram seu cupom no cadastro, mas ainda não assinaram</p>
            </div>
            <span className="ml-auto text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">
              {freeStudents.length}
            </span>
          </div>
          <div className="space-y-2">
            {freeStudents.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                  {s.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="theme-heading text-sm font-semibold truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.target_language} · {s.level === "beginner" ? "Iniciante" : s.level === "intermediate" ? "Intermediário" : "Avançado"}</p>
                </div>
                <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Plano free
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly chart */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
        <h3 className="theme-heading font-display font-bold mb-5">Comissões por Mês</h3>
        {earnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <TrendingUp className="w-8 h-8 text-gray-600" />
            <p className="theme-subtext text-gray-500 text-sm">Nenhuma comissão ainda. Compartilhe seu cupom!</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip
                contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12 }}
                labelStyle={{ color: "#fff" }}
                formatter={v => [fmtBRL(v), "Comissão"]}
              />
              {chartData.map((entry, idx) => (
                <Bar key={idx} dataKey="amount" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === idx ? "#7c3aed" : "rgba(124,58,237,0.3)"} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}