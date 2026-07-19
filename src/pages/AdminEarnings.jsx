import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminEarnings() {
  const { toast } = useToast();
  const [tutors, setTutors] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tp, wr] = await Promise.all([
        base44.entities.TutorProfile.filter({ status: "approved" }, "-total_earnings", 100),
        base44.entities.WithdrawalRequest.filter({}, "-created_date", 100),
      ]);
      setTutors(tp);
      setWithdrawals(wr);
    } catch {} finally { setLoading(false); }
  };

  const markAsPaid = async (withdrawal) => {
    setProcessing(withdrawal.id);
    try {
      await base44.entities.WithdrawalRequest.update(withdrawal.id, { status: "paid" });

      const profiles = await base44.entities.TutorProfile.filter({ user_id: withdrawal.tutor_id });
      if (profiles.length > 0) {
        await base44.entities.TutorProfile.update(profiles[0].id, { total_earnings: 0 });
      }

      toast({ title: "Payment confirmed ✅", description: `${withdrawal.tutor_name} — $${withdrawal.amount?.toFixed(2)} USD marked as paid and earnings reset.` });
      loadData();
    } catch {
      toast({ title: "Error processing", variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const rejectWithdrawal = async (withdrawal) => {
    setProcessing(withdrawal.id);
    try {
      await base44.entities.WithdrawalRequest.update(withdrawal.id, { status: "rejected" });
      toast({ title: "Saque rejeitado" });
      loadData();
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    } finally { setProcessing(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Ganhos & Pagamentos</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-8">Gerencie os ganhos dos tutores e solicitações de saque</p>

      {/* Solicitações de saque pendentes */}
      {pendingWithdrawals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="theme-heading font-display font-bold text-white">Saques Pendentes</h2>
            <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">{pendingWithdrawals.length}</span>
          </div>
          <div className="space-y-3">
            {pendingWithdrawals.map(w => (
              <div key={w.id} className="theme-card bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="theme-heading font-semibold text-white">{w.tutor_name}</p>
                    <p className="theme-subtext text-xs text-gray-500 mt-0.5">{w.pioneer_email} · {w.period}</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">${w.amount?.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => markAsPaid(w)}
                      disabled={processing === w.id}
                      className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {processing === w.id ? "Processando..." : "Marcar como pago"}
                    </Button>
                    <Button
                      onClick={() => rejectWithdrawal(w)}
                      disabled={processing === w.id}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                      size="sm"
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ganhos de cada tutor */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-violet-400" />
          <h2 className="theme-heading font-display font-bold text-white">Ganhos por Tutor</h2>
        </div>
        {tutors.length === 0 ? (
          <div className="theme-empty text-center py-16 bg-white/3 border border-white/5 rounded-3xl">
            <p className="theme-subtext text-gray-600 text-sm">Nenhum tutor aprovado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tutors.map(t => {
              const tutorWithdrawals = withdrawals.filter(w => w.tutor_id === t.user_id);
              const hasPending = tutorWithdrawals.some(w => w.status === "pending");
              return (
                <div key={t.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=7c3aed&color=fff&size=48`}
                        alt={t.full_name}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                      />
                      <div>
                        <p className="theme-heading font-semibold text-white text-sm">{t.full_name}</p>
                        <p className="theme-subtext text-xs text-gray-600">{t.total_lessons || 0} aulas · {t.total_minutes || 0} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold text-emerald-400">${(t.total_earnings || 0).toFixed(2)}</p>
                      {hasPending && (
                        <span className="flex items-center gap-1 text-xs bg-amber-500/15 border border-amber-500/25 text-amber-400 px-2.5 py-1 rounded-full font-medium">
                          <Clock className="w-3 h-3" /> Saque pendente
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Histórico de saques do tutor */}
                  {tutorWithdrawals.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                      {tutorWithdrawals.slice(0, 3).map(w => (
                        <div key={w.id} className="flex items-center justify-between text-xs">
                          <span className="theme-subtext text-gray-600">{w.period}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">${w.amount?.toFixed(2)}</span>
                            <span className={`px-2 py-0.5 rounded-full font-medium border ${
                              w.status === "paid" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                              w.status === "rejected" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                              "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            } capitalize`}>{w.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}