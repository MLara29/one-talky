import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2, Ban, CheckCircle, Link2, Copy, UserCheck, Search, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import StudentDetailModal from "@/components/admin/StudentDetailModal";

const sortByName = (arr) => [...arr].sort((a, b) =>
  (a.full_name || "").localeCompare(b.full_name || "", "pt-BR")
);

const PLAN_COLORS = {
  free:     "bg-gray-500/10 border-gray-500/20 text-gray-400",
  basic:    "bg-blue-500/10 border-blue-500/20 text-blue-400",
  standard: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  premium:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
};

export default function AdminUsers() {
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [users, setUsers] = useState({});
  const [tutorStats, setTutorStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [t, s, a, allUsers] = await Promise.all([
        base44.entities.TutorProfile.list("-created_date", 50),
        base44.entities.StudentProfile.list("-created_date", 50),
        base44.entities.Affiliate.list("-created_date", 100),
        base44.entities.User.list("-created_date", 200),
      ]);
      const userMap = {};
      allUsers.forEach(u => { userMap[u.id] = u; });
      setTutors(sortByName(t));
      setStudents(sortByName(s));
      setAffiliates(sortByName(a));
      setUsers(userMap);
      loadTutorStats(); // não bloqueia a renderização inicial da lista
    } catch {} finally { setLoading(false); }
  };

  // Resumo de aulas por tutor (este mês / próximos meses / instantâneas já dadas).
  // Busca tudo de uma vez (2 queries no total) e agrupa no cliente — evita
  // fazer 1 query por tutor. "total_lessons" (dadas no total) já vem pronto
  // direto do TutorProfile, não precisa buscar aqui.
  const loadTutorStats = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [scheduledLessons, instantCompleted] = await Promise.all([
        base44.entities.Lesson.filter({ status: "scheduled" }),
        base44.entities.Lesson.filter({ status: "completed", type: "instant" }),
      ]);

      const stats = {};
      const bump = (tutorId, field) => {
        if (!stats[tutorId]) stats[tutorId] = { thisMonth: 0, futureMonths: 0, instantCompleted: 0 };
        stats[tutorId][field] += 1;
      };

      scheduledLessons.forEach(l => {
        if (!l.tutor_id || !l.scheduled_at) return;
        const d = new Date(l.scheduled_at);
        if (d >= monthStart && d < nextMonthStart) bump(l.tutor_id, "thisMonth");
        else if (d >= nextMonthStart) bump(l.tutor_id, "futureMonths");
      });

      instantCompleted.forEach(l => {
        if (!l.tutor_id) return;
        bump(l.tutor_id, "instantCompleted");
      });

      setTutorStats(stats);
    } catch {
      // Resumo é informativo — se falhar, a lista de tutores continua funcionando normal.
    }
  };

  const blockTutor = async (t) => {
    try {
      const response = await base44.functions.invoke("adminManageTutor", { tutor_id: t.id, action: "toggle_block" });
      if (response.data?.error) throw new Error(response.data.error);
      const newStatus = response.data.status;
      setTutors(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
      toast({ title: newStatus === "rejected" ? "Tutor bloqueado" : "Tutor desbloqueado" });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const deleteTutor = async (t) => {
    if (!confirm(`Deletar ${t.full_name}? Esta ação não pode ser desfeita.`)) return;
    try {
      const response = await base44.functions.invoke("adminManageTutor", { tutor_id: t.id, action: "delete" });
      if (response.data?.error) throw new Error(response.data.error);
      setTutors(prev => prev.filter(x => x.id !== t.id));
      toast({ title: "Tutor deletado" });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const toggleHidden = async (t) => {
    try {
      const response = await base44.functions.invoke("adminManageTutor", { tutor_id: t.id, action: "toggle_hidden" });
      if (response.data?.error) throw new Error(response.data.error);
      const newStatus = response.data.status;
      setTutors(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
      toast({ title: newStatus === "hidden" ? "Tutor escondido dos alunos" : "Tutor visível pros alunos novamente" });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const toggleContractType = async (t) => {
    try {
      const response = await base44.functions.invoke("adminManageTutor", { tutor_id: t.id, action: "toggle_contract_type" });
      if (response.data?.error) throw new Error(response.data.error);
      const newType = response.data.contract_type;
      setTutors(prev => prev.map(x => x.id === t.id ? { ...x, contract_type: newType } : x));
      toast({ title: `Contrato alterado para ${newType === "upwork" ? "Upwork" : "Direto"}` });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const dismissBanSuggestion = async (t) => {
    try {
      const response = await base44.functions.invoke("adminManageTutor", { tutor_id: t.id, action: "dismiss_ban_suggestion" });
      if (response.data?.error) throw new Error(response.data.error);
      setTutors(prev => prev.map(x => x.id === t.id ? { ...x, ban_suggested: false } : x));
      toast({ title: "Sugestão de banimento ignorada" });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const blockStudent = async (s) => {
    try {
      const response = await base44.functions.invoke("adminManageStudent", { student_id: s.id, action: "toggle_block" });
      if (response.data?.error) throw new Error(response.data.error);
      const newBlocked = response.data.is_blocked;
      setStudents(prev => prev.map(x => x.id === s.id ? { ...x, is_blocked: newBlocked } : x));
      toast({ title: newBlocked ? "Aluno bloqueado" : "Aluno desbloqueado" });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const deleteStudent = async (s) => {
    if (!confirm(`Deletar ${s.full_name}? Esta ação não pode ser desfeita.`)) return;
    try {
      const response = await base44.functions.invoke("adminManageStudent", { student_id: s.id, action: "delete" });
      if (response.data?.error) throw new Error(response.data.error);
      setStudents(prev => prev.filter(x => x.id !== s.id));
      toast({ title: "Aluno deletado" });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const changeUserRole = async (userId, role) => {
    if (!userId) {
      toast({ title: "Usuário sem conta vinculada", variant: "destructive" });
      return;
    }
    await base44.functions.invoke("setUserRole", { targetUserId: userId, role });
    toast({ title: `Role alterada para "${role}" ✅` });
  };

  const setAffiliateRole = async (a) => {
    let targetUser = users[a.user_id];
    if (!targetUser && a.email) {
      targetUser = Object.values(users).find(u => u.email === a.email);
    }
    if (!targetUser) {
      toast({ title: "Usuário não encontrado", description: "O afiliado precisa se registrar na plataforma primeiro.", variant: "destructive" });
      return;
    }
    try {
      const response = await base44.functions.invoke("adminManageAffiliateUser", {
        affiliate_id: a.id, action: "link_role", target_user_id: targetUser.id,
      });
      if (response.data?.error) throw new Error(response.data.error);
      setAffiliates(prev => prev.map(x => x.id === a.id ? { ...x, user_id: targetUser.id } : x));
      toast({ title: "Role affiliate definida!", description: `${a.full_name} já tem acesso ao painel de afiliado.` });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const deleteAffiliate = async (a) => {
    if (!confirm(`Deletar afiliado ${a.full_name}?`)) return;
    try {
      const response = await base44.functions.invoke("adminManageAffiliateUser", { affiliate_id: a.id, action: "delete" });
      if (response.data?.error) throw new Error(response.data.error);
      setAffiliates(prev => prev.filter(x => x.id !== a.id));
      toast({ title: "Afiliado deletado" });
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchTutor, setSearchTutor] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [searchAffiliate, setSearchAffiliate] = useState("");

  const filteredTutors = tutors.filter(t => {
    const q = searchTutor.toLowerCase();
    return !q || t.full_name?.toLowerCase().includes(q) || users[t.user_id]?.email?.toLowerCase().includes(q);
  });
  const filteredStudents = students.filter(s => {
    const q = searchStudent.toLowerCase();
    const matchesSearch = !q || s.full_name?.toLowerCase().includes(q) || users[s.user_id]?.email?.toLowerCase().includes(q);
    const matchesPlan = planFilter === "all" || (s.plan || "free") === planFilter;
    return matchesSearch && matchesPlan;
  });
  const filteredAffiliates = affiliates.filter(a => {
    const q = searchAffiliate.toLowerCase();
    return !q || a.full_name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
  });
  const tutorInviteLink = `${window.location.origin}/register?role=tutor`;
  const copyInviteLink = () => {
    navigator.clipboard.writeText(tutorInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copiado!", description: "Envie este link para o tutor se cadastrar." });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">Usuários</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 min-w-0">
            <Link2 className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-xs text-gray-400 truncate max-w-[180px]">{tutorInviteLink}</span>
          </div>
          <Button
            onClick={copyInviteLink}
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 shrink-0 hover:scale-105 transition-all"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            {copied ? "Copiado!" : "Copiar link de convite"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tutors">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="tutors" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Tutores ({tutors.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Alunos ({students.length})
          </TabsTrigger>
          <TabsTrigger value="affiliates" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Afiliados ({affiliates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutors">
          <div className="relative mb-4 max-w-sm">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTutor}
              onChange={e => setSearchTutor(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pl-9"
            />
          </div>
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {filteredTutors.map(t => {
                const isSuspended = t.scheduling_suspended_until && new Date(t.scheduling_suspended_until) > new Date();
                return (
                <div key={t.id} className="p-4 hover:bg-white/3 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=7c3aed&color=fff&size=40`} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="" />
                      <div className="min-w-0">
                        <p className="theme-heading font-medium text-sm text-white truncate">{t.full_name}</p>
                        <p className="theme-subtext text-xs text-gray-500 truncate">
                          {users[t.user_id]?.email || t.country || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select onValueChange={(role) => changeUserRole(users[t.user_id]?.id || t.user_id, role)}>
                        <SelectTrigger className="h-7 text-xs w-28 bg-white/5 border-white/10 text-gray-300 hidden sm:flex">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tutor">Tutor</SelectItem>
                          <SelectItem value="student">Aluno</SelectItem>
                          <SelectItem value="affiliate">Afiliado</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* Contract type badge + toggle */}
                      <button
                        onClick={() => toggleContractType(t)}
                        title={`Contrato: ${t.contract_type === "upwork" ? "Upwork" : "Direto"} — clique para alterar`}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors cursor-pointer hidden sm:inline ${
                          t.contract_type === "upwork"
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                        }`}
                      >
                        {t.contract_type === "upwork" ? "Upwork" : "Direto"}
                      </button>
                      {t.no_show_count > 0 && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                          t.ban_suggested ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : isSuspended ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                        }`}>
                          {t.no_show_count} no-show{t.no_show_count > 1 ? "s" : ""}
                          {isSuspended && " · suspenso"}
                        </span>
                      )}
                      {t.status !== "hidden" && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border hidden sm:inline ${
                          t.status === "approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                          t.status === "pending" ? "bg-amber-500/10 border-amber-500/20 text-amber-600" :
                          "bg-red-500/10 border-red-500/20 text-red-600"
                        }`}>{t.status}</span>
                      )}
                      {t.status === "hidden" && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-gray-500/10 border-gray-500/20 text-gray-400">
                          Escondido
                        </span>
                      )}
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => toggleHidden(t)}
                        className={`px-2 h-8 ${t.status === "hidden" ? "text-violet-500 hover:text-violet-400" : "text-gray-400 hover:text-gray-300"}`}
                        title={t.status === "hidden" ? "Mostrar pros alunos" : "Esconder dos alunos (sem bloquear)"}
                      >
                        {t.status === "hidden" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => blockTutor(t)}
                        className={`px-2 h-8 ${t.status === "rejected" ? "text-emerald-500 hover:text-emerald-400" : "text-amber-500 hover:text-amber-400"}`}
                        title={t.status === "rejected" ? "Desbloquear" : "Bloquear"}
                      >
                        {t.status === "rejected" ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => deleteTutor(t)}
                        className="px-2 h-8 text-red-500 hover:text-red-400"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Resumo de aulas — dadas no total, este mês, próximos meses, instantâneas já dadas */}
                  {(() => {
                    const st = tutorStats[t.user_id] || { thisMonth: 0, futureMonths: 0, instantCompleted: 0 };
                    return (
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                          🎓 {t.total_lessons ?? 0} dadas no total
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                          📅 {st.thisMonth} este mês
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                          🔮 {st.futureMonths} próximos meses
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                          ⚡ {st.instantCompleted} instantâneas dadas
                        </span>
                      </div>
                    );
                  })()}
                  {t.ban_suggested && (
                    <div className="mt-2 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      <span className="text-xs text-red-400 flex-1">
                        ⚠️ Sugestão do sistema: avaliar banimento (faltas repetidas após suspensão)
                      </span>
                      <button
                        onClick={() => blockTutor(t)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 shrink-0"
                      >
                        Banir agora
                      </button>
                      <button
                        onClick={() => dismissBanSuggestion(t)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 shrink-0"
                      >
                        Ignorar
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
              {filteredTutors.length === 0 && <p className="theme-subtext text-center text-sm text-gray-500 py-8">{searchTutor ? "Nenhum tutor encontrado para essa busca" : "Nenhum tutor ainda"}</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { id: "all", label: "Todos" },
              { id: "free", label: "Free" },
              { id: "basic", label: "Básico" },
              { id: "standard", label: "Standard" },
              { id: "premium", label: "Premium" },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPlanFilter(p.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                  planFilter === p.id
                    ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                    : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="relative mb-4 max-w-sm">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pl-9"
            />
          </div>
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {filteredStudents.map(s => {
                const planKey = s.plan || "free";
                const planColor = PLAN_COLORS[planKey] || PLAN_COLORS.free;

                // Indicadores de assinatura visíveis direto no card
                const subStartDate = s.subscription_start_date ? new Date(s.subscription_start_date) : null;
                const guaranteeEndDate = subStartDate ? new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
                const isInGuaranteePeriod = guaranteeEndDate && Date.now() < guaranteeEndDate.getTime();
                const isCancelled = s.subscription_status === "cancelled";
                const subDateFormatted = subStartDate
                  ? subStartDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : null;
                const guaranteeEndFormatted = guaranteeEndDate
                  ? guaranteeEndDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : null;
                return (
                  <div
                    key={s.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=7c3aed&color=fff&size=40`} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-white truncate">{s.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {users[s.user_id]?.email || "—"}
                        </p>
                        {subDateFormatted && (
                          <p className="text-[11px] text-gray-600 truncate">
                            Assinou {planKey !== "free" ? `plano ${planKey}` : ""} em {subDateFormatted}
                            {isInGuaranteePeriod
                              ? ` · garantia até ${guaranteeEndFormatted}`
                              : ` · garantia expirou em ${guaranteeEndFormatted}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 hidden sm:inline">{Math.round((s.plan_credits_minutes || 0) + (s.prepaid_credits_minutes || 0))} min</span>
                      {isInGuaranteePeriod && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-orange-500/10 border-orange-500/20 text-orange-400">
                          🔒 Garantia 7 dias
                        </span>
                      )}
                      {isCancelled && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-gray-500/10 border-gray-500/20 text-gray-400">
                          Cancelada
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${planColor}`}>
                        {planKey}
                      </span>
                      {s.first_week_lesson_id && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Desbloquear a primeira semana de ${s.full_name}?\n\nIsso CANCELA qualquer aula agendada dentro dos primeiros 7 dias e limpa o cadeado, permitindo agendar/iniciar uma nova aula imediatamente.`)) return;
                            const res = await base44.functions.invoke("adminUnlockFirstWeek", { student_profile_id: s.id });
                            if (res.data?.error) { toast({ title: "Erro", description: res.data.error, variant: "destructive" }); return; }
                            setStudents(prev => prev.map(x => x.id === s.id ? { ...x, first_week_lesson_id: null } : x));
                            toast({ title: "Cadeado liberado" });
                          }}
                          className="text-xs px-2.5 py-1 rounded-full font-medium border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                          title="Liberar para agendar/iniciar outra aula antes dos 7 dias"
                        >
                          🔓 Liberar cadeado
                        </button>
                      )}
                      {s.is_blocked && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-red-500/10 border-red-500/20 text-red-400">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && <p className="text-center text-sm text-gray-500 py-8">{searchStudent ? "Nenhum aluno encontrado para essa busca" : "Nenhum aluno ainda"}</p>}
            </div>
          </div>
          <StudentDetailModal
            student={selectedStudent}
            userEmail={selectedStudent ? users[selectedStudent.user_id]?.email : null}
            open={!!selectedStudent}
            onClose={() => setSelectedStudent(null)}
            onUpdated={(updated) => {
              setStudents(prev => prev.map(x => x.id === updated.id ? updated : x));
              setSelectedStudent(updated);
            }}
            onDeleted={(id) => {
              setStudents(prev => prev.filter(x => x.id !== id));
              setSelectedStudent(null);
            }}
          />
        </TabsContent>

        <TabsContent value="affiliates">
          <div className="relative mb-4 max-w-sm">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchAffiliate}
              onChange={e => setSearchAffiliate(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pl-9"
            />
          </div>
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {filteredAffiliates.map(a => {
                const linkedUser = users[a.user_id] || (a.email ? Object.values(users).find(u => u.email === a.email) : null);
                return (
                  <div key={a.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/3 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                        <span className="text-orange-400 font-bold text-sm">{a.full_name?.[0] || "A"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="theme-heading font-medium text-sm text-white truncate">{a.full_name}</p>
                        <p className="theme-subtext text-xs text-gray-500 truncate">{a.email} · cupom: <span className="font-mono text-orange-400">{a.coupon_code}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border hidden sm:inline ${
                        linkedUser ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                      }`}>
                        {linkedUser ? "Vinculado" : "Sem conta"}
                      </span>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setAffiliateRole(a)}
                        className="px-2 h-8 text-orange-400 hover:text-orange-300"
                        title="Vincular role de afiliado ao usuário"
                      >
                        <UserCheck className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => deleteAffiliate(a)}
                        className="px-2 h-8 text-red-500 hover:text-red-400"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filteredAffiliates.length === 0 && <p className="theme-subtext text-center text-sm text-gray-500 py-8">{searchAffiliate ? "Nenhum afiliado encontrado para essa busca" : "Nenhum afiliado ainda"}</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}