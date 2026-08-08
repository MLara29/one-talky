import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const FREQUENCY_LABELS = { weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal" };

// Renders one payout-frequency tab's list of due tutors, reusing the
// existing adminManageWithdrawal action buttons (mark_processing / mark_paid).
export default function PayoutFrequencyTab({ tutors, onChanged, showFrequencyBadge = false, onTutorClick }) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(null);
  const [comments, setComments] = useState({});

  const setComment = (tutorId, value) => setComments(prev => ({ ...prev, [tutorId]: value }));

  const markProcessing = async (tutor) => {
    setProcessing(tutor.user_id + "_proc");
    try {
      const response = await base44.functions.invoke("adminManageWithdrawal", { tutor_id: tutor.user_id, action: "mark_processing", comment: comments[tutor.user_id] || "" });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Pagamento em processamento notificado ✅", description: `${tutor.full_name} verá o status de processamento.` });
      setComment(tutor.user_id, "");
      onChanged?.();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const markPaid = async (tutor) => {
    setProcessing(tutor.user_id + "_paid");
    try {
      const response = await base44.functions.invoke("adminManageWithdrawal", { tutor_id: tutor.user_id, action: "mark_paid", comment: comments[tutor.user_id] || "" });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Marcado como pago ✅", description: `${tutor.full_name} será solicitado a confirmar o recebimento.` });
      setComment(tutor.user_id, "");
      onChanged?.();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setProcessing(null); }
  };

  if (tutors.length === 0) {
    return (
      <div className="theme-empty text-center py-16 bg-white/3 border border-white/5 rounded-3xl mt-4">
        <p className="theme-subtext text-gray-600 text-sm">Nenhum tutor com pagamento pendente neste grupo</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {tutors.map(t => (
        <div key={t.user_id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=F26A1B&color=fff&size=48`}
                alt={t.full_name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="theme-heading font-semibold text-white text-sm">{t.full_name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-white/5 border-white/10 text-gray-500 capitalize">{t.contract_type || "direct"}</span>
                  {showFrequencyBadge && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/25 text-violet-300">
                      {FREQUENCY_LABELS[t.payout_frequency] || t.payout_frequency}
                    </span>
                  )}
                </div>
                <p className="theme-subtext text-xs text-gray-600">
                  {t.days_since_paid === null ? "Nunca recebeu pagamento" : `${t.days_since_paid} dia${t.days_since_paid === 1 ? "" : "s"} desde o último pagamento`}
                </p>
                {onTutorClick && (
                  <button
                    onClick={() => onTutorClick(t)}
                    className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 mt-1"
                  >
                    Ver histórico
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xl font-bold text-emerald-400">${t.earned.toFixed(2)}</p>

              {!t.active_status && (
                <Button
                  size="sm"
                  onClick={() => markProcessing(t)}
                  disabled={!!processing}
                  className="bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
                >
                  {processing === t.user_id + "_proc" ? "..." : "Marcar como processando"}
                </Button>
              )}

              {t.active_status === "processing" && (
                <>
                  <span className="text-xs px-3 py-1.5 rounded-full border bg-blue-500/15 border-blue-500/30 text-blue-300 font-medium">
                    ⏳ Pagamento em processamento
                  </span>
                  <Button
                    size="sm"
                    onClick={() => markPaid(t)}
                    disabled={!!processing}
                    className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                  >
                    {processing === t.user_id + "_paid" ? "..." : "Marcar como pago"}
                  </Button>
                </>
              )}

              {t.active_status === "paid" && (
                <span className="text-xs px-3 py-1.5 rounded-full border bg-amber-500/15 border-amber-500/30 text-amber-300 font-medium">
                  ⏳ Aguardando o tutor confirmar recebimento
                </span>
              )}
            </div>
          </div>

          {t.active_status !== "paid" && (
            <div className="mt-3">
              <textarea
                value={comments[t.user_id] || ""}
                onChange={e => setComment(t.user_id, e.target.value)}
                placeholder="Observação para o tutor (opcional) — ex: valor extra pago, motivo de ajuste"
                rows={2}
                className="w-full text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 px-3 py-2 resize-none focus:outline-none focus:border-orange-500/40"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}