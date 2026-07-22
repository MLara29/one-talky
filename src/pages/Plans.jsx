import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, CreditCard } from "lucide-react";
import { PLANS, PREPAID_PACKS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckoutModal from "@/components/checkout/CheckoutModal";

const ACCENT = "#F26A1B";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutItem, setCheckoutItem] = useState(null);

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch {} finally { setLoading(false); }
  };

  const handleSuccess = (status) => {
    if (status === "pending") {
      toast({ title: "Pagamento pendente", description: "Assim que confirmado, seus créditos serão adicionados." });
    } else {
      toast({ title: "Pagamento aprovado! 🎉", description: "Seus créditos foram adicionados." });
    }
    loadProfile();
  };

  const selectPlan = (plan) => {
    if (!profile || plan.price_monthly === 0) return;
    setCheckoutItem({
      title: `One Talky — Plano ${plan.name} (${plan.minutes} min/mês)`,
      price: plan.price_monthly,
      external_reference: `plan:${plan.id}`,
    });
  };

  const buyPack = (pack) => {
    if (!profile) return;
    const ref = pack.id === "teste" ? "pack:teste" : `pack:${pack.id}`;
    setCheckoutItem({
      title: `One Talky — ${pack.label}`,
      price: pack.price_brl,
      external_reference: ref,
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: "#EEE7DD", borderTopColor: ACCENT }} />
    </div>
  );

  return (
    <div>
      {checkoutItem && (
        <CheckoutModal
          item={checkoutItem}
          userEmail={user?.email}
          onClose={() => setCheckoutItem(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="text-center mb-10">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold mb-2">Planos & Créditos</h1>
        <p className="theme-subtext text-sm" style={{ color: "#5A5B66" }}>R$ 29,90 por 30 minutos · Sem fidelidade obrigatória</p>
        {profile && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "rgba(242,106,27,0.10)", border: "1px solid rgba(242,106,27,0.25)", color: ACCENT }}>
            <Clock className="w-4 h-4" /> {profile.credits_minutes || 0} minutos disponíveis
          </div>
        )}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-8 mx-auto flex w-fit shadow-sm" style={{ background: "#fff", border: "1px solid #EEE7DD" }}>
          <TabsTrigger
            value="plans"
            className="px-6 data-[state=active]:text-white"
            style={{ fontWeight: 600 }}
          >
            Planos mensais
          </TabsTrigger>
          <TabsTrigger
            value="prepaid"
            className="px-6 data-[state=active]:text-white"
            style={{ fontWeight: 600 }}
          >
            Pré-pago
          </TabsTrigger>
        </TabsList>

        {/* ── PLANOS MENSAIS ── */}
        <TabsContent value="plans">
          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            {PLANS.map(plan => {
              const isCurrent = profile?.plan === plan.id;
              const isHighlight = plan.popular;

              return (
                <div
                  key={plan.id}
                  className="relative flex flex-col"
                  style={{
                    background: isHighlight ? "#FFF7F1" : "#fff",
                    border: `2px solid ${isCurrent ? "#22c55e" : isHighlight ? ACCENT : "#EEE7DD"}`,
                    borderRadius: 22,
                    padding: "28px 22px",
                    gap: 14,
                    boxShadow: "0 14px 34px -24px rgba(23,24,28,.25)",
                    transition: "box-shadow .2s",
                  }}
                >
                  {isHighlight && (
                    <span style={{ position: "absolute", top: -13, left: 22, background: ACCENT, color: "#fff", fontSize: 11.5, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>
                      ⚡ Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span style={{ position: "absolute", top: -13, right: 16, background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999 }}>
                      ✓ Atual
                    </span>
                  )}

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#A29A8C" }}>One Talky</div>
                    <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4, color: "#17181C" }}>{plan.name}</div>
                    <div style={{ fontSize: 12.5, color: "#8A8B94", marginTop: 2 }}>{plan.description}</div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", color: "#17181C" }}>{fmtBRL(plan.price_weekly)}</span>
                      <span style={{ fontSize: 13, color: "#8A8B94", fontWeight: 700 }}>/semana</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#8A8B94", fontWeight: 600 }}>{fmtBRL(plan.price_monthly)}/mês</div>
                  </div>

                  <div style={{ height: 1, background: "#EEE7DD" }} />

                  <ul className="flex flex-col gap-2 flex-1" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>{plan.minutes} minutos/mês
                    </li>
                    {plan.id === "standard" && (
                      <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                        <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>4×30 min ou 2×1 hora
                      </li>
                    )}
                    {plan.id === "premium" && (
                      <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                        <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>8×30 min ou 4×1 hora
                      </li>
                    )}
                    <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>Todos os tutores nativos
                    </li>
                    <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>Acesso ao pré-pago
                    </li>
                  </ul>

                  <button
                    onClick={() => selectPlan(plan)}
                    disabled={isCurrent}
                    style={{
                      textAlign: "center", padding: "13px 0", borderRadius: 999, fontWeight: 700, fontSize: 14.5,
                      background: isCurrent ? "#f0fdf4" : isHighlight ? ACCENT : "#17181C",
                      color: isCurrent ? "#22c55e" : "#fff",
                      border: isCurrent ? "1.5px solid #86efac" : "none",
                      cursor: isCurrent ? "default" : "pointer",
                      fontFamily: "inherit", transition: "opacity .2s",
                    }}
                  >
                    <CreditCard className="inline w-4 h-4 mr-2 mb-0.5" />
                    {isCurrent ? "✓ Plano atual" : "Assinar agora"}
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── PRÉ-PAGO ── */}
        <TabsContent value="prepaid">
          <div className="max-w-2xl mx-auto">
            {/* Bloqueio para quem não tem plano mensal */}
            {(!profile?.plan || profile.plan === "free") && (
              <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl p-6 text-center" style={{ background: "#FFF7F1", border: "1.5px solid rgba(242,106,27,0.3)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FDECE0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔒</div>
                <p className="font-semibold" style={{ color: "#17181C" }}>Disponível apenas para assinantes</p>
                <p className="text-sm" style={{ color: "#5A5B66" }}>Assine qualquer plano mensal para desbloquear a compra de minutos avulsos.</p>
              </div>
            )}
            <p className="text-center text-sm mb-6" style={{ color: "#5A5B66" }}>Compre minutos sem mensalidade. Os créditos não expiram.</p>
            <div className="space-y-3">
              {PREPAID_PACKS.map(pack => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between gap-4"
                  style={{ background: "#fff", border: "1px solid #EEE7DD", borderRadius: 18, padding: "16px 20px", boxShadow: "0 4px 16px -8px rgba(23,24,28,.15)", transition: "box-shadow .2s" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 44, height: 44, borderRadius: 12, background: "#FDECE0", color: ACCENT }}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-display font-bold" style={{ color: "#17181C" }}>{pack.label}</p>
                      <p className="text-xs" style={{ color: "#8A8B94" }}>
                        {fmtBRL(pack.price_brl / pack.minutes * 30)}/30min
                        {pack.badge && <span className="ml-2 font-semibold" style={{ color: ACCENT }}>{pack.badge}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-lg" style={{ color: "#17181C" }}>{fmtBRL(pack.price_brl)}</p>
                    <button
                      onClick={() => buyPack(pack)}
                      disabled={!!checkoutItem || !profile?.plan || profile.plan === "free"}
                      style={{
                        marginTop: 4, padding: "7px 18px", borderRadius: 999, fontWeight: 700, fontSize: 13.5,
                        background: ACCENT, color: "#fff", border: "none",
                        cursor: (checkoutItem || !profile?.plan || profile.plan === "free") ? "not-allowed" : "pointer",
                        opacity: (checkoutItem || !profile?.plan || profile.plan === "free") ? 0.4 : 1, fontFamily: "inherit",
                      }}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: "#A29A8C" }}>
              Pagamento seguro via Mercado Pago · Cartão de crédito · Créditos não expiram
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}