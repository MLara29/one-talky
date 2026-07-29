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

  const pct = Math.min(100, Math.round((mins / 120) * 100));

  return (
    <div className="bg-white rounded-2xl border border-orange-100 px-5 py-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-500">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 flex items-center gap-2">
            <span className="capitalize">{planObj?.name || "Plano Basic"}</span>
            {isLow && <span className="text-xs text-amber-500 font-semibold">⚠ Créditos baixos</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">R$ 2,20/min · 30 min = R$ 66</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: isLow ? "#f59e0b" : "#F26A1B" }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">{Math.floor(mins)} min restantes</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => setShowTopup(!showTopup)}
          className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow rounded-full px-4"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar minutos
        </Button>
        <Link to="/plans">
          <Button size="sm" variant="outline" className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 px-4">
            <Zap className="w-3.5 h-3.5 mr-1" /> Ver planos
          </Button>
        </Link>
      </div>

      {showTopup && (
        <div className="w-full mt-1 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-3 font-medium">Escolha um pacote pré-pago:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PREPAID_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => buyPack(pack)}
                disabled={processing}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-400 hover:bg-orange-100 transition-all text-center"
              >
                <span className="font-bold text-gray-900 text-sm">{pack.label}</span>
                {pack.badge && <span className="text-[10px] text-emerald-600 font-semibold">{pack.badge}</span>}
                <span className="text-xs text-gray-500">{fmtBRL(pack.price_brl)}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 text-center">Créditos não expiram · Pagamento via Stripe</p>
        </div>
      )}
    </div>
  );
}