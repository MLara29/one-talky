import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, ArrowUp, ArrowDown, XCircle, CheckCircle, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PLANS = [
  { id: "free", label: "Free", minutes: 15, price: "R$ 0", color: "from-gray-500 to-gray-600" },
  { id: "basic", label: "Basic", minutes: 60, price: "R$ 49/mês", color: "from-blue-500 to-cyan-500" },
  { id: "standard", label: "Standard", minutes: 200, price: "R$ 129/mês", color: "from-orange-500 to-amber-500" },
  { id: "premium", label: "Premium", minutes: 600, price: "R$ 299/mês", color: "from-amber-400 to-orange-500" },
];

const ORDER = ["free", "basic", "standard", "premium"];

export default function PlanManageModal({ profile, onClose, onUpdated }) {
  const { toast } = useToast();
  const currentIdx = ORDER.indexOf(profile.plan || "free");
  const [selected, setSelected] = useState(profile.plan || "free");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const selectedIdx = ORDER.indexOf(selected);
  const isUpgrade = selectedIdx > currentIdx;
  const isDowngrade = selectedIdx < currentIdx;
  const isSame = selected === profile.plan;

  const handleConfirm = async () => {
    if (isSame) { onClose(); return; }
    setSaving(true);
    try {
      if (selected === "free") {
        // Cancellation goes through the server — it enforces the "no free credits on cancel" rule
        const response = await base44.functions.invoke("cancelMyPlan", {});
        if (response.data?.error) throw new Error(response.data.error);
        onUpdated({ ...profile, plan: "free", credits_minutes: 0, subscription_status: "cancelled" });
      } else {
        const newPlan = PLANS.find(p => p.id === selected);
        await base44.entities.StudentProfile.update(profile.id, {
          plan: selected,
          credits_minutes: newPlan.minutes,
        });
        onUpdated({ ...profile, plan: selected, credits_minutes: newPlan.minutes });
      }
      setDone(true);
    } catch (e) {
      toast({ title: "Erro ao atualizar plano", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-800 text-base">Gerenciar plano</h2>
              <p className="text-slate-500 text-xs">Plano atual: <span className="text-orange-500 font-semibold capitalize">{profile.plan || "free"}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="font-display font-bold text-slate-800 mb-2">Plano atualizado!</h3>
            <p className="text-slate-500 text-sm mb-6">Seu plano foi alterado com sucesso.</p>
            <Button onClick={onClose} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0">Fechar</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {PLANS.map(plan => {
                const isActive = selected === plan.id;
                const isCurrent = profile.plan === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelected(plan.id)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      isActive
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${plan.color} mb-2`}>
                      {plan.label}
                      {isCurrent && <span className="ml-1 opacity-80">(atual)</span>}
                    </div>
                    <p className="text-slate-800 font-semibold text-sm">{plan.minutes} min</p>
                    <p className="text-slate-500 text-xs">{plan.price}</p>
                  </button>
                );
              })}
            </div>

            {!isSame && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-4 ${
                isUpgrade ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600" :
                isDowngrade ? "bg-amber-500/10 border border-amber-500/20 text-amber-600" : ""
              }`}>
                {isUpgrade ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                {isUpgrade ? `Upgrade para ${selected} — você ganhará mais minutos` : `Downgrade para ${selected} — seus minutos serão ajustados`}
              </div>
            )}

            <div className="flex gap-3">
              {profile.plan !== "free" && (
                <Button
                  variant="ghost"
                  onClick={() => setSelected("free")}
                  className="flex-1 border border-red-200 text-red-500 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar plano
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                disabled={saving || isSame}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20"
              >
                {saving ? "Salvando..." : isSame ? "Nenhuma alteração" : isUpgrade ? "Fazer upgrade" : "Fazer downgrade"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}