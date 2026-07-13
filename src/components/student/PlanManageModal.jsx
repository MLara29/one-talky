import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, ArrowUp, ArrowDown, XCircle, CheckCircle, Zap } from "lucide-react";

const PLANS = [
  { id: "free", label: "Free", minutes: 15, price: "R$ 0", color: "from-gray-500 to-gray-600" },
  { id: "basic", label: "Basic", minutes: 60, price: "R$ 49/mês", color: "from-blue-500 to-cyan-500" },
  { id: "standard", label: "Standard", minutes: 200, price: "R$ 129/mês", color: "from-violet-500 to-indigo-500" },
  { id: "premium", label: "Premium", minutes: 600, price: "R$ 299/mês", color: "from-amber-400 to-orange-500" },
];

const ORDER = ["free", "basic", "standard", "premium"];

export default function PlanManageModal({ profile, onClose, onUpdated }) {
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
    const newPlan = PLANS.find(p => p.id === selected);
    await base44.entities.StudentProfile.update(profile.id, {
      plan: selected,
      credits_minutes: newPlan.minutes,
    });
    setSaving(false);
    setDone(true);
    onUpdated({ ...profile, plan: selected, credits_minutes: newPlan.minutes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#0d0d1a] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-base">Gerenciar plano</h2>
              <p className="text-gray-500 text-xs">Plano atual: <span className="text-violet-400 font-semibold capitalize">{profile.plan || "free"}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="font-display font-bold text-white mb-2">Plano atualizado!</h3>
            <p className="text-gray-500 text-sm mb-6">Seu plano foi alterado com sucesso.</p>
            <Button onClick={onClose} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">Fechar</Button>
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
                        ? "border-violet-500/60 bg-violet-500/10"
                        : "border-white/10 bg-white/3 hover:border-white/20"
                    }`}
                  >
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${plan.color} mb-2`}>
                      {plan.label}
                      {isCurrent && <span className="ml-1 opacity-80">(atual)</span>}
                    </div>
                    <p className="text-white font-semibold text-sm">{plan.minutes} min</p>
                    <p className="text-gray-500 text-xs">{plan.price}</p>
                  </button>
                );
              })}
            </div>

            {!isSame && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-4 ${
                isUpgrade ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
                isDowngrade ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : ""
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
                  className="flex-1 border border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar plano
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                disabled={saving || isSame}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20"
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