import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, GraduationCap, Video, BookOpen, AlertCircle, DollarSign,
  TrendingUp, TrendingDown, Calendar, Trophy, BarChart3, PieChart,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell,
} from "recharts";
import { PLANS } from "@/lib/constants";

const COLORS = ["#7c3aed", "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({ label, value, sub, icon: Icon, color = "violet", trendPct }) {
  const colors = {
    violet: { bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.25)", icon: "#7c3aed" },
    emerald: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", icon: "#10b981" },
    amber: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", icon: "#f59e0b" },
    red: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", icon: "#ef4444" },
    blue: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", icon: "#3b82f6" },
    orange: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)", icon: "#f97316" },
  };
  const c = colors[color] || colors.violet;
  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/8 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className="w-5 h-5" style={{ color: c.icon }} />
        </div>
        {trendPct !== undefined && trendPct !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendPct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {trendPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trendPct).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="theme-heading font-display text-2xl font-bold text-white">{value}</p>
      <p className="theme-subtext text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    tutorsActive: 0, students: 0, lessonsCompleted: 0, inProgress: 0,
    newStudentsThisMonth: 0, revenueThisMonth: 0, revenueTrendPct: null,
    lessonsScheduledThisMonth: 0, pendingApprovals: 0,
  });
  const [topTutors, setTopTutors] = useState([]);
  const [topInstantTutors, setTopInstantTutors] = useState([]);
  const [topScheduledTutors, setTopScheduledTutors] = useState([]);
  const [newStudentsByMonth, setNewStudentsByMonth] = useState([]);
  const [plansThisMonth, setPlansThisMonth] = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState({ planRevenueThisMonth: 0, packRevenueThisMonth: 0, packTrendPct: null });

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [tutors, students, completedLessons, inProgressLessons, scheduledLessons, pendingTutors, payments] = await Promise.all([
        base44.entities.TutorProfile.list("-created_date", 200),
        base44.entities.StudentProfile.list("-created_date", 500),
        base44.entities.Lesson.filter({ status: "completed" }),
        base44.entities.Lesson.filter({ status: "in_progress" }),
        base44.entities.Lesson.filter({ status: "scheduled" }),
        base44.entities.TutorProfile.filter({ status: "pending" }),
        base44.entities.PaymentRecord.list("-created_at", 1000),
      ]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const approvedTutors = tutors.filter(t => t.status === "approved");
      const tutorNameById = {};
      tutors.forEach(t => { tutorNameById[t.user_id] = t.display_name || t.full_name || "Tutor"; });

      // Aulas agendadas neste mês
      const lessonsScheduledThisMonth = scheduledLessons.filter(l => {
        if (!l.scheduled_at) return false;
        const d = new Date(l.scheduled_at);
        return d >= monthStart && d < nextMonthStart;
      }).length;

      // Tutores com mais aulas CONCLUÍDAS este mês (performance real, não só agenda)
      const tutorLessonCounts = {};
      completedLessons.forEach(l => {
        const d = l.started_at ? new Date(l.started_at) : (l.scheduled_at ? new Date(l.scheduled_at) : null);
        if (!d || d < monthStart || d >= nextMonthStart || !l.tutor_id) return;
        tutorLessonCounts[l.tutor_id] = (tutorLessonCounts[l.tutor_id] || 0) + 1;
      });
      const topTutorsData = Object.entries(tutorLessonCounts)
        .map(([tutorId, count]) => ({ name: tutorNameById[tutorId] || "Tutor", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Tutores com mais aulas INSTANTÂNEAS concluídas este mês
      const instantCounts = {};
      completedLessons.forEach(l => {
        if (l.type !== "instant") return;
        const d = l.started_at ? new Date(l.started_at) : null;
        if (!d || d < monthStart || d >= nextMonthStart || !l.tutor_id) return;
        instantCounts[l.tutor_id] = (instantCounts[l.tutor_id] || 0) + 1;
      });
      const topInstantTutorsData = Object.entries(instantCounts)
        .map(([tutorId, count]) => ({ name: tutorNameById[tutorId] || "Tutor", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Tutores com mais aulas AGENDADAS (futuras, ainda não aconteceram) — total
      // atual na agenda de cada um, não restrito a este mês.
      const scheduledCounts = {};
      scheduledLessons.forEach(l => {
        if (!l.tutor_id) return;
        scheduledCounts[l.tutor_id] = (scheduledCounts[l.tutor_id] || 0) + 1;
      });
      const topScheduledTutorsData = Object.entries(scheduledCounts)
        .map(([tutorId, count]) => ({ name: tutorNameById[tutorId] || "Tutor", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Novos alunos por mês (últimos 6 meses)
      const monthMeta = [];
      const monthBuckets = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        let label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        label = label.charAt(0).toUpperCase() + label.slice(1);
        monthMeta.push({ key, label });
        monthBuckets[key] = 0;
      }
      students.forEach(s => {
        if (!s.created_date) return;
        const d = new Date(s.created_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in monthBuckets) monthBuckets[key] += 1;
      });
      const newStudentsByMonthData = monthMeta.map(m => ({ month: m.label, Alunos: monthBuckets[m.key] }));
      const newStudentsThisMonth = monthBuckets[monthMeta[monthMeta.length - 1].key] || 0;

      // Pagamentos deste mês / mês passado
      const paymentsThisMonth = payments.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d >= monthStart && d < nextMonthStart;
      });
      const paymentsLastMonth = payments.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d >= lastMonthStart && d < monthStart;
      });

      const revenueThisMonth = paymentsThisMonth.reduce((sum, p) => sum + (p.gross_amount || 0), 0);
      const revenueLastMonth = paymentsLastMonth.reduce((sum, p) => sum + (p.gross_amount || 0), 0);
      const revenueTrendPct = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : null;

      const planRevenueThisMonth = paymentsThisMonth.filter(p => p.type === "plan").reduce((sum, p) => sum + (p.gross_amount || 0), 0);
      const packRevenueThisMonth = paymentsThisMonth.filter(p => p.type === "pack").reduce((sum, p) => sum + (p.gross_amount || 0), 0);
      const packRevenueLastMonth = paymentsLastMonth.filter(p => p.type === "pack").reduce((sum, p) => sum + (p.gross_amount || 0), 0);
      const packTrendPct = packRevenueLastMonth > 0 ? ((packRevenueThisMonth - packRevenueLastMonth) / packRevenueLastMonth) * 100 : null;

      // Planos assinados este mês (novas assinaturas, por tipo de plano)
      const planCounts = {};
      paymentsThisMonth.filter(p => p.type === "plan").forEach(p => {
        const planId = (p.reference || "").replace("plan:", "");
        planCounts[planId] = (planCounts[planId] || 0) + 1;
      });
      const plansThisMonthData = PLANS.map(p => ({ name: p.name, id: p.id, count: planCounts[p.id] || 0 }));

      setKpis({
        tutorsActive: approvedTutors.length,
        students: students.length,
        lessonsCompleted: completedLessons.length,
        inProgress: inProgressLessons.length,
        newStudentsThisMonth,
        revenueThisMonth,
        revenueTrendPct,
        lessonsScheduledThisMonth,
        pendingApprovals: pendingTutors.length,
      });
      setTopTutors(topTutorsData);
      setTopInstantTutors(topInstantTutorsData);
      setTopScheduledTutors(topScheduledTutorsData);
      setNewStudentsByMonth(newStudentsByMonthData);
      setPlansThisMonth(plansThisMonthData);
      setRevenueBreakdown({ planRevenueThisMonth, packRevenueThisMonth, packTrendPct });
    } catch (e) {
      console.error("[AdminDashboard] failed to load stats", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const plansWithData = plansThisMonth.filter(p => p.count > 0);
  const totalPlansThisMonth = plansThisMonth.reduce((sum, p) => sum + p.count, 0);
  const revenueBarData = [{
    name: "Receita",
    Assinaturas: revenueBreakdown.planRevenueThisMonth,
    "Minutos avulsos": revenueBreakdown.packRevenueThisMonth,
  }];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">Painel do Administrador</h1>
        <Link to="/admin/costs">
          <Button size="sm" variant="outline" className="text-xs border-white/10 text-gray-300 hover:bg-white/5">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Dashboard financeiro completo
          </Button>
        </Link>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Tutores ativos" value={kpis.tutorsActive} icon={GraduationCap} color="violet" />
        <StatCard label="Alunos" value={kpis.students} icon={Users} color="blue" sub={`+${kpis.newStudentsThisMonth} novos este mês`} />
        <StatCard label="Aulas concluídas" value={kpis.lessonsCompleted} icon={BookOpen} color="emerald" />
        <StatCard label="Em andamento agora" value={kpis.inProgress} icon={Video} color="orange" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Receita este mês" value={fmtBRL(kpis.revenueThisMonth)} icon={DollarSign} color="emerald" trendPct={kpis.revenueTrendPct} />
        <StatCard label="Aulas agendadas (mês)" value={kpis.lessonsScheduledThisMonth} icon={Calendar} color="blue" />
        <StatCard label="Candidaturas pendentes" value={kpis.pendingApprovals} icon={AlertCircle} color="amber" />
      </div>

      {kpis.pendingApprovals > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-600">{kpis.pendingApprovals} candidatura{kpis.pendingApprovals > 1 ? "s" : ""} pendente{kpis.pendingApprovals > 1 ? "s" : ""}</p>
              <p className="theme-subtext text-sm text-amber-600/70">Revise e aprove novos tutores</p>
            </div>
          </div>
          <Link to="/admin/approvals">
            <Button size="sm" className="bg-amber-500 text-white border-0 hover:bg-amber-600">Revisar</Button>
          </Link>
        </div>
      )}

      {/* Gráficos — desempenho */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-violet-400" /> Tutores com mais aulas este mês
          </h3>
          {topTutors.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-16">Nenhuma aula concluída este mês ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, topTutors.length * 34)}>
              <BarChart data={topTutors} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
                <Bar dataKey="count" name="Aulas" fill="#7c3aed" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" /> Novos alunos por mês
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={newStudentsByMonth} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
              <Bar dataKey="Alunos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos — financeiro */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-violet-400" /> Planos assinados este mês
          </h3>
          {plansWithData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-16">Nenhuma assinatura nova este mês ainda.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <RPieChart>
                  <Pie data={plansWithData} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {plansWithData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
                </RPieChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 text-center mt-2">{totalPlansThisMonth} assinatura{totalPlansThisMonth > 1 ? "s" : ""} nova{totalPlansThisMonth > 1 ? "s" : ""} este mês</p>
            </>
          )}
        </div>

        <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-400" /> Assinatura vs. minutos avulsos (este mês)
          </h3>
          <div className="flex items-center gap-8 mb-4">
            <div>
              <p className="theme-heading font-display text-xl font-bold text-white">{fmtBRL(revenueBreakdown.planRevenueThisMonth)}</p>
              <p className="text-xs text-gray-500">Assinaturas</p>
            </div>
            <div>
              <p className="theme-heading font-display text-xl font-bold text-white">{fmtBRL(revenueBreakdown.packRevenueThisMonth)}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                Minutos avulsos
                {revenueBreakdown.packTrendPct !== null && (
                  <span className={`flex items-center gap-0.5 font-semibold ${revenueBreakdown.packTrendPct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                    {revenueBreakdown.packTrendPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(revenueBreakdown.packTrendPct).toFixed(0)}%
                  </span>
                )}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={revenueBarData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip contentStyle={{ background: "#0f0f1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} formatter={v => fmtBRL(v)} />
              <Bar dataKey="Assinaturas" stackId="a" fill="#7c3aed" radius={[6, 0, 0, 6]} />
              <Bar dataKey="Minutos avulsos" stackId="a" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
