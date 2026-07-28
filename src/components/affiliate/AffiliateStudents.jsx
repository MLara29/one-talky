import React, { useState } from "react";
import { Users, UserCheck, UserX } from "lucide-react";

const LEVEL_LABEL = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" };
const PLAN_LABEL = { free: "Free", basic: "Basic", standard: "Standard", premium: "Premium" };
const PLAN_COLOR = {
  free: "text-gray-400 bg-gray-500/10",
  basic: "text-blue-400 bg-blue-500/10",
  standard: "text-violet-400 bg-violet-500/10",
  premium: "text-amber-400 bg-amber-500/10",
};

function StudentRow({ student, planColor }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0">
        {student.full_name?.charAt(0)?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="theme-heading text-sm font-semibold truncate">{student.full_name}</p>
        <p className="text-xs text-gray-500">
          {student.target_language} · {LEVEL_LABEL[student.level] || student.level}
        </p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${planColor}`}>
        {PLAN_LABEL[student.plan] || student.plan}
      </span>
    </div>
  );
}

export default function AffiliateStudents({ paidStudents = [], freeStudents = [] }) {
  const [activeTab, setActiveTab] = useState("paid");

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="theme-card bg-white/5 border border-emerald-500/20 rounded-3xl p-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-3">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="theme-heading font-display text-3xl font-bold text-emerald-400">{paidStudents.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Alunos com plano ativo</p>
        </div>
        <div className="theme-card bg-white/5 border border-amber-500/20 rounded-3xl p-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-3">
            <UserX className="w-5 h-5 text-amber-400" />
          </div>
          <p className="theme-heading font-display text-3xl font-bold text-amber-400">{freeStudents.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Alunos sem plano ativo</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("paid")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "paid"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Com plano
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "paid" ? "bg-white/20 text-white" : "bg-white/10 text-gray-400"}`}>
            {paidStudents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("free")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "free"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <UserX className="w-4 h-4" />
          Sem plano
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "free" ? "bg-white/20 text-white" : "bg-white/10 text-gray-400"}`}>
            {freeStudents.length}
          </span>
        </button>
      </div>

      {/* Lists */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
        {activeTab === "paid" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="theme-heading font-display font-bold text-sm">Alunos com plano ativo</h3>
            </div>
            {paidStudents.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">Nenhum aluno com plano ainda.</p>
            ) : (
              <div>
                {paidStudents.map(s => (
                  <StudentRow key={s.id} student={s} planColor={PLAN_COLOR[s.plan] || "text-gray-400 bg-gray-500/10"} />
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === "free" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <UserX className="w-4 h-4 text-amber-400" />
              <h3 className="theme-heading font-display font-bold text-sm">Alunos sem plano ativo</h3>
              <p className="text-xs text-gray-500 ml-1">— usaram seu cupom mas ainda não assinaram</p>
            </div>
            {freeStudents.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">Todos os seus indicados já têm um plano!</p>
            ) : (
              <div>
                {freeStudents.map(s => (
                  <StudentRow key={s.id} student={s} planColor={PLAN_COLOR.free} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}