import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREPAID_PACKS, PLANS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CreditsBanner({ profile, onUpdate }) {
  const { toast } = useToast();
  const [showTopup, setShowTopup] = useState(false);
  const [processing, setProcessing] = useState(false);

  const mins = profile?.credits_minutes || 0;
  const planObj = PLANS.find(p => p.id === profile?.plan);
  const isLow = mins < 30;

  const buyPack = async (pack) => {
    if (processing) return;
    setProcessing(true);
    try {
      toast({ title: "Redirecionando para pagamento…", description: "Em breve: integração Stripe ativa." });
      await new Promise(r => setTimeout(r, 800));
      await base44.entities.StudentProfile.update(profile.id, {
        credits_minutes: mins + pack.minutes,
      });
      onUpdate({ ...profile, credits_minutes: mins + pack.minutes });
      toast({ title: `+${pack.minutes} minutos adicionados! ⏱️` });
      setShowTopup(false);
    } catch {
      toast({ title: "Erro ao processar", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  return (
    <div className={`theme-card rounded-2xl border px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
      isLow
        ? "bg-amber-500/10 border-amber-500/25"
        : "bg-white/5 border-white/10"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLow ? "bg-amber-500/20" : "bg-emerald-500/15"}`}>
          <Clock className={`w-5 h-5 ${isLow ? "text-amber-500" : "text-emerald-500"}`} />
        </div>
        <div>
          <p className="theme-heading font-display font-bold text-white">
            {mins} min disponíveis
            {isLow && <span className="ml-2 text-xs text-amber-500 font-normal">⚠ Créditos baixos</span>}
          </p>
          <p className="theme-subtext text-xs text-gray-500">
            Plano: <span className="capitalize font-medium">{planObj?.name || "Teste Grátis"}</span>
            {" · "}R$ 2,20/min · 30 min = R$ 66
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => setShowTopup(!showTopup)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar minutos
        </Button>
        <Link to="/plans">
          <Button size="sm" variant="ghost" className="theme-btn-ghost bg-white/5 border border-white/10 text-gray-400 hover:text-white">
            <Zap className="w-3.5 h-3.5 mr-1" /> Ver planos
          </Button>
        </Link>
      </div>

      {showTopup && (
        <div className="w-full mt-1 pt-4 border-t border-white/10">
          <p className="theme-subtext text-xs text-gray-500 mb-3 font-medium">Escolha um pacote pré-pago:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PREPAID_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => buyPack(pack)}
                disabled={processing}
                className="theme-card flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all text-center"
              >
                <span className="theme-heading font-display font-bold text-white text-sm">{pack.label}</span>
                {pack.badge && <span className="text-[10px] text-emerald-600 font-semibold">{pack.badge}</span>}
                <span className="theme-subtext text-xs text-gray-500">{fmtBRL(pack.price_brl)}</span>
              </button>
            ))}
          </div>
          <p className="theme-subtext text-[10px] text-gray-500 mt-3 text-center">Créditos não expiram · Pagamento via Stripe</p>
        </div>
      )}
    </div>
  );
}