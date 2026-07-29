import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREPAID_PACKS, PLANS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Striped progress bar like in the design
function StripedBar({ pct, isLow }) {
  return (
    <div className="relative w-36 h-6 rounded-full overflow-hidden bg-orange-100 border border-orange-200">
      {/* Diagonal stripes background */}
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            45deg,
            #fdba74 0px,
            #fdba74 6px,
            #fed7aa 6px,
            #fed7aa 12px
          )`,
          width: `${pct}%`,
          transition: "width 0.5s ease",
        }}
      />
      {/* Percentage label */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-orange-700">
        {pct}%
      </span>
    </div>
  );
}

export default function CreditsBanner({ profile, onUpdate }) {
  const { toast } = useToast();
  const [showTopup, setShowTopup] = useState(false);
  const [processing, setProcessing] = useState(false);

  const mins = profile?.credits_minutes || 0;
  const planObj = PLANS.find(p => p.id === profile?.plan);
  const isLow = mins < 30;
  // Use 120 min as "full" reference for % display
  const pct = Math.min(100, Math.round((mins / 120) * 100));

  const buyPack = async (pack) => {
    if (processing) return;
    setProcessing(true);
    try {
      toast({ title: "Redirecionando para pagamento…" });
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
    <div className="bg-white rounded-2xl border border-orange-100 px-5 py-3.5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: shield icon + plan info */}
        <div className="flex items-center gap-3">
          {/* Shield icon */}
          <div className="relative w-10 h-10 shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}>
              {/* Shield SVG */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2zm-1 13l-3-3 1.41-1.41L11 13.17l5.59-5.59L18 9l-7 6z"/>
              </svg>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span>{planObj?.name || "Plano Basic"}</span>
              {isLow && (
                <span className="text-xs text-amber-500 font-semibold flex items-center gap-0.5">
                  ⚠ Créditos baixos
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">R$ 2,20/min · 30 min = R$ 66</p>
          </div>
        </div>

        {/* Center: striped progress bar + label */}
        <div className="flex flex-col items-center gap-0.5">
          <StripedBar pct={pct} isLow={isLow} />
          <span className="text-xs text-gray-500 mt-1">
            <span className="font-bold text-gray-700">{Math.floor(mins)} min</span> restantes
          </span>
        </div>

        {/* Right: buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setShowTopup(!showTopup)}
            className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-md rounded-full px-4 font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar minutos
          </Button>
          <Link to="/plans">
            <Button size="sm" variant="outline" className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 px-4 font-semibold">
              <Zap className="w-3.5 h-3.5 mr-1" /> Ver planos
            </Button>
          </Link>
        </div>
      </div>

      {showTopup && (
        <div className="mt-4 pt-4 border-t border-gray-100">
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