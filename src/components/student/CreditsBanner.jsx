import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREPAID_PACKS, PLANS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import CheckoutModal from "@/components/checkout/CheckoutModal";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PlanShield({ plan, size = 42 }) {
  if (plan === "premium") {
    return (
      <svg width={size} height={Math.round(size * 1.12)} viewBox="0 0 24 27" fill="none">
        <defs>
          <linearGradient id="blackFill" x1="3" y1="1" x2="21" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3a3a3a"/><stop offset="0.5" stopColor="#1a1a1a"/><stop offset="1" stopColor="#050505"/>
          </linearGradient>
          <linearGradient id="goldStroke" x1="3" y1="1" x2="21" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f7e08a"/><stop offset="0.5" stopColor="#d4af37"/><stop offset="1" stopColor="#a67c1a"/>
          </linearGradient>
          <linearGradient id="goldCheck" x1="8" y1="10" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f9e59a"/><stop offset="1" stopColor="#d4af37"/>
          </linearGradient>
        </defs>
        <path d="M12 1l9 3.5v7C21 18 17 22.5 12 25 7 22.5 3 18 3 11.5v-7L12 1z" fill="url(#blackFill)" stroke="url(#goldStroke)" strokeWidth="1.1"/>
        <path d="M12 3.3l6.9 2.7v5.5c0 5-3 8.5-6.9 10.5V3.3z" fill="#fff" opacity="0.05"/>
        <path d="M8.3 13.2l2.6 2.6 4.8-5.2" stroke="url(#goldCheck)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    );
  }
  if (plan === "standard") {
    return (
      <svg width={size} height={Math.round(size * 1.12)} viewBox="0 0 24 27" fill="none">
        <defs>
          <linearGradient id="bronzeFill" x1="3" y1="1" x2="21" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e8b487"/><stop offset="0.5" stopColor="#c17d3f"/><stop offset="1" stopColor="#8a4f22"/>
          </linearGradient>
        </defs>
        <path d="M12 1l9 3.5v7C21 18 17 22.5 12 25 7 22.5 3 18 3 11.5v-7L12 1z" fill="url(#bronzeFill)" stroke="#6d3d18" strokeWidth="0.7"/>
        <path d="M12 1l9 3.5v7C21 18 17 22.5 12 25V1z" fill="#000" opacity="0.08"/>
        <path d="M8.3 13.2l2.6 2.6 4.8-5.2" stroke="#fff2e2" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    );
  }
  if (plan === "basic") {
    return (
      <svg width={size} height={Math.round(size * 1.12)} viewBox="0 0 24 27" fill="none">
        <defs>
          <linearGradient id="basicFill" x1="3" y1="1" x2="21" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f1f3f6"/><stop offset="0.5" stopColor="#c3c8d1"/><stop offset="1" stopColor="#8f96a3"/>
          </linearGradient>
        </defs>
        <path d="M12 1l9 3.5v7C21 18 17 22.5 12 25 7 22.5 3 18 3 11.5v-7L12 1z" fill="url(#basicFill)" stroke="#6b7280" strokeWidth="0.7"/>
        <path d="M12 1l9 3.5v7C21 18 17 22.5 12 25V1z" fill="#000" opacity="0.06"/>
        <path d="M8.3 13.2l2.6 2.6 4.8-5.2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    );
  }
  // free (default) — green shield with lines
  return (
    <svg width={size} height={Math.round(size * 1.12)} viewBox="0 0 24 27" fill="none">
      <defs>
        <linearGradient id="freeFill" x1="3" y1="1" x2="21" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a7f3d0"/><stop offset="1" stopColor="#4ade80"/>
        </linearGradient>
      </defs>
      <path d="M12 1l9 3.5v7C21 18 17 22.5 12 25 7 22.5 3 18 3 11.5v-7L12 1z" fill="url(#freeFill)" stroke="#22c55e" strokeWidth="0.7"/>
      <path d="M9.5 8.6h5M9.5 11.6h5M9.5 14.6h3" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export default function CreditsBanner({ profile, onUpdate }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showTopup, setShowTopup] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);

  const mins = profile?.credits_minutes || 0;
  const plan = profile?.plan || "free";
  const planObj = PLANS.find(p => p.id === plan);
  const isLow = mins < 30;
  const pct = Math.min(100, Math.round((mins / 120) * 100));

  const buyPack = (pack) => {
    setCheckoutItem({
      title: `One Talky — ${pack.label}`,
      price: pack.price_brl,
      external_reference: `pack:${pack.id}`,
    });
  };

  const handleCheckoutSuccess = async () => {
    toast({ title: "Pagamento aprovado! 🎉", description: "Seus créditos foram adicionados." });
    setShowTopup(false);
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) onUpdate(profiles[0]);
    } catch (e) {
      console.error("[CreditsBanner] failed to refresh profile:", e);
    }
  };

  return (
    <div
      className="mb-6"
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(249,115,22,0.14)",
        borderRadius: 20,
        padding: "14px 16px",
        boxShadow: "0 8px 24px rgba(249,115,22,0.12)",
      }}
    >
      {/* Top row: shield + plan name + buttons */}
      <div className="flex items-center gap-3">
        {/* Shield */}
        <div className="shrink-0" style={{ lineHeight: 0 }}>
          <PlanShield plan={plan} />
        </div>

        {/* Plan name + low-credits badge */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap" }}>
              {planObj?.name || "Plano Free"}
            </span>
            {isLow && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316", whiteSpace: "nowrap", background: "#fff7ed", padding: "2px 7px", borderRadius: 999, border: "1px solid #fed7aa" }}>
                ⚠ Baixo
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 1 }}>R$ 2,20/min</div>
        </div>

        {/* Buttons — compact on mobile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowTopup(!showTopup)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "linear-gradient(135deg, #fb923c, #f97316)",
              color: "#fff", border: "none", padding: "8px 13px",
              borderRadius: 999, fontFamily: "inherit", fontSize: 12, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span className="hidden sm:inline">Adicionar minutos</span>
            <span className="sm:hidden">Minutos</span>
          </button>
          <Link to="/plans">
            <button style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "#fff", color: "#374151",
              border: "1px solid rgba(0,0,0,0.1)", padding: "8px 12px",
              borderRadius: 999, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
              whiteSpace: "nowrap",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f97316"><path d="M13 2L3 14h7v8l10-12h-7z"/></svg>
              <span className="hidden sm:inline">Ver planos</span>
              <span className="sm:hidden">Planos</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Progress bar — always visible, full width */}
      <div className="mt-3">
        <div style={{
          width: "100%", height: 22, borderRadius: 999,
          border: "1px solid rgba(249,115,22,0.25)",
          background: "#fff5ee",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: "0 auto 0 0",
            width: `${Math.max(pct, 3)}%`,
            background: "repeating-linear-gradient(115deg, rgba(249,115,22,0.55) 0 6px, rgba(249,115,22,0.18) 6px 13px)",
            borderRadius: 999,
            transition: "width 0.5s ease",
          }} />
          <span style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: 11, fontWeight: 800, color: "#f97316",
            whiteSpace: "nowrap",
          }}>{Math.floor(mins)} min restantes</span>
        </div>
      </div>

      {showTopup && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(249,115,22,0.1)" }}>
          <p className="text-xs text-gray-500 mb-3 font-medium">Escolha um pacote pré-pago:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PREPAID_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => buyPack(pack)}
                disabled={!!checkoutItem}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-400 hover:bg-orange-100 transition-all text-center"
              >
                <span className="font-bold text-gray-900 text-sm">{pack.label}</span>
                {pack.badge && <span className="text-[10px] text-emerald-600 font-semibold">{pack.badge}</span>}
                <span className="text-xs text-gray-500">{fmtBRL(pack.price_brl)}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 text-center">Créditos não expiram · Pagamento via Mercado Pago</p>
        </div>
      )}

      {checkoutItem && (
        <CheckoutModal
          item={checkoutItem}
          userEmail={user?.email}
          onClose={() => setCheckoutItem(null)}
          onSuccess={handleCheckoutSuccess}
          affiliateCoupon={profile?.coupon_code}
        />
      )}
    </div>
  );
}