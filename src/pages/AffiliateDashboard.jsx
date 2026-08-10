import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Users } from "lucide-react";
import AffiliateOverview from "@/components/affiliate/AffiliateOverview";
import AffiliateEarningsTable from "@/components/affiliate/AffiliateEarningsTable";
import AffiliatePayoutTab from "@/components/affiliate/AffiliatePayoutTab";
import AffiliateStudents from "@/components/affiliate/AffiliateStudents";

const TABS = [
  { key: "overview", label: "Visão Geral" },
  { key: "students", label: "Alunos" },
  { key: "history", label: "Histórico" },
  { key: "payout", label: "Dados para Repasse" },
];

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [affiliate, setAffiliate] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [freeStudents, setFreeStudents] = useState([]);
  const [paidStudents, setPaidStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const affiliates = await base44.entities.Affiliate.filter({ user_id: user.id });
      if (affiliates.length > 0) {
        const aff = affiliates[0];
        setAffiliate(aff);
        const earns = await base44.entities.AffiliateEarning.filter(
          { affiliate_id: aff.id },
          "-sale_date",
          200
        );
        setEarnings(earns);

        // Busca os alunos que usaram o cupom via function segura (não expõe outros alunos)
        const studentsRes = await base44.functions.invoke("getMyReferredStudents", {});
        setFreeStudents(studentsRes.data?.freeStudents || []);
        setPaidStudents(studentsRes.data?.paidStudents || []);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!affiliate) return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Users className="w-8 h-8 text-violet-400" />
      </div>
      <h2 className="theme-heading font-display text-xl font-bold">Afiliado não encontrado</h2>
      <p className="theme-subtext text-gray-500 max-w-xs">
        Sua conta ainda não está vinculada a um perfil de afiliado. Entre em contato com o suporte.
      </p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold">
            Olá, {affiliate.full_name.split(" ")[0]}! 👋
          </h1>
          <p className="theme-subtext text-gray-500 mt-1">
            Seu cupom exclusivo:{" "}
            <span className="font-mono font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg text-sm">
              {affiliate.coupon_code}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="theme-subtext text-xs text-gray-500">Comissão por venda</p>
          <p className="theme-heading font-display text-2xl font-bold text-emerald-400">
            {affiliate.commission_percent}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "theme-subtext text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "overview" && <AffiliateOverview affiliate={affiliate} earnings={earnings} freeStudents={freeStudents} paidStudents={paidStudents} />}
      {tab === "students" && <AffiliateStudents paidStudents={paidStudents} freeStudents={freeStudents} />}
      {tab === "history" && <AffiliateEarningsTable earnings={earnings} />}
      {tab === "payout" && <AffiliatePayoutTab affiliate={affiliate} onSaved={loadData} />}
    </div>
  );
}