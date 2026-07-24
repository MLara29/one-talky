import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2, Ban, CheckCircle, Link2, Copy, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import StudentDetailModal from "@/components/admin/StudentDetailModal";

const PLAN_COLORS = {
  free:     "bg-gray-500/10 border-gray-500/20 text-gray-400",
  basic:    "bg-blue-500/10 border-blue-500/20 text-blue-400",
  standard: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  premium:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
  blocked:  "bg-red-500/10 border-red-500/20 text-red-400",
};

export default function AdminUsers() {
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [users, setUsers] = useState({});
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
      setTutors(t);
      setStudents(s);
      setAffiliates(a);
      setUsers(userMap);
    } catch {} finally { setLoading(false); }
  };

  const blockTutor = async (t) => {
    const newStatus = t.status === "rejected" ? "approved" : "rejected";
    await base44.entities.TutorProfile.update(t.id, { status: newStatus });
    setTutors(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
    toast({ title: newStatus === "rejected" ? "Tutor bloqueado" : "Tutor desbloqueado" });
  };

  const deleteTutor = async (t) => {
    if (!confirm(`Deletar ${t.full_name}? Esta ação não pode ser desfeita.`)) return;
    await base44.entities.TutorProfile.delete(t.id);
    setTutors(prev => prev.filter(x => x.id !== t.id));
    toast({ title: "Tutor deletado" });
  };

  const toggleContractType = async (t) => {
    const newType = t.contract_type === "upwork" ? "direct" : "upwork";
    await base44.entities.TutorProfile.update(t.id, { contract_type: newType });
    setTutors(prev => prev.map(x => x.id === t.id ? { ...x, contract_type: newType } : x));
    toast({ title: `Contrato alterado para ${newType === "upwork" ? "Upwork" : "Direto"}` });
  };

  const blockStudent = async (s) => {
    const newPlan = s.plan === "blocked" ? "free" : "blocked";
    await base44.entities.StudentProfile.update(s.id, { plan: newPlan });
    setStudents(prev => prev.map(x => x.id === s.id ? { ...x, plan: newPlan } : x));
    toast({ title: newPlan === "blocked" ? "Aluno bloqueado" : "Aluno desbloqueado" });
  };

  const deleteStudent = async (s) => {
    if (!confirm(`Deletar ${s.full_name}? Esta ação não pode ser desfeita.`)) return;
    await base44.entities.StudentProfile.delete(s.id);
    setStudents(prev => prev.filter(x => x.id !== s.id));
    toast({ title: "Aluno deletado" });
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
    // Link user_id on affiliate record if missing
    if (!a.user_id || a.user_id !== targetUser.id) {
      await base44.entities.Affiliate.update(a.id, { user_id: targetUser.id });
      setAffiliates(prev => prev.map(x => x.id === a.id ? { ...x, user_id: targetUser.id } : x));
    }
    // Set role = "affiliate" on the User record using the backend function
    await base44.functions.invoke("setUserRole", { targetUserId: targetUser.id, role: "affiliate" });
    toast({ title: "Role affiliate definida!", description: `${a.full_name} já tem acesso ao painel de afiliado.` });
  };

  const deleteAffiliate = async (a) => {
    if (!confirm(`Deletar afiliado ${a.full_name}?`)) return;
    await base44.entities.Affiliate.delete(a.id);
    setAffiliates(prev => prev.filter(x => x.id !== a.id));
    toast({ title: "Afiliado deletado" });
  };

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copied, setCopied] = useState(false);
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
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">Users</h1>
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
            Tutors ({tutors.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="affiliates" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Affiliates ({affiliates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutors">
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {tutors.map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/3 transition-all">
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
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
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
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border hidden sm:inline ${
                      t.status === "approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                      t.status === "pending" ? "bg-amber-500/10 border-amber-500/20 text-amber-600" :
                      "bg-red-500/10 border-red-500/20 text-red-600"
                    }`}>{t.status}</span>
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
              ))}
              {tutors.length === 0 && <p className="theme-subtext text-center text-sm text-gray-500 py-8">No tutors yet</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {students.map(s => {
                const planKey = s.plan || "free";
                const planColor = PLAN_COLORS[planKey] || PLAN_COLORS.free;
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 hidden sm:inline">{s.credits_minutes ?? 0} min</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${planColor}`}>
                        {planKey}
                      </span>
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && <p className="text-center text-sm text-gray-500 py-8">Nenhum aluno ainda</p>}
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
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {affiliates.map(a => {
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
              {affiliates.length === 0 && <p className="theme-subtext text-center text-sm text-gray-500 py-8">No affiliates yet</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}