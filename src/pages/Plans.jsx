import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, Zap, Clock, CreditCard } from "lucide-react";
import { PLANS, PREPAID_PACKS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckoutModal from "@/components/checkout/CheckoutModal";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Configurações dinâmicas do plano básico
const BASIC_OPTIONS = {
  2: { sessions: 2, minutes: 60,  price_monthly: 59.80,  price_weekly: 29.90,  description: "60 min/mês · 2 aulas de 30 min" },
  4: { sessions: 4, minutes: 120, price_monthly: 119.60, price_weekly: 29.90,  description: "120 min/mês · 4 aulas de 30 min" },
};

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [basicSessions, setBasicSessions] = useState(4); // 2 ou 4 aulas/mês

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

  const selectPlan = (plan, overrides = {}) => {
    if (!profile || (overrides.price_monthly ?? plan.price_monthly) === 0) return;
    const price = overrides.price_monthly ?? plan.price_monthly;
    const minutes = overrides.minutes ?? plan.minutes;
    setCheckoutItem({
      title: `One Talky — Plano ${plan.name} (${minutes} min/mês)`,
      price,
      external_reference: `plan:${plan.id}`,
    });
  };

  const buyPack = (pack) => {
    if (!profile) return;
    setCheckoutItem({
      title: `One Talky — ${pack.label}`,
      price: pack.price_brl,
      external_reference: `pack:${pack.id}`,
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
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
        <p className="theme-subtext text-gray-500 text-sm">R$ 29,90 por 30 minutos · Sem fidelidade obrigatória</p>
        {profile && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-semibold">
            <Clock className="w-4 h-4" /> {profile.credits_minutes || 0} minutos disponíveis
          </div>
        )}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-8 bg-white border border-gray-200 mx-auto flex w-fit shadow-sm">
          <TabsTrigger value="plans" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 text-gray-500 px-6">
            Planos mensais
          </TabsTrigger>
          <TabsTrigger value="prepaid" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 text-gray-500 px-6">
            Pré-pago
          </TabsTrigger>
        </TabsList>

        {/* ── PLANOS MENSAIS ── */}
        <TabsContent value="plans">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => {
              const isBasic = plan.id === "basic";
              const basicOpt = BASIC_OPTIONS[basicSessions];
              const isCurrent = profile?.plan === plan.id;
              const displayMinutes = isBasic ? basicOpt.minutes : plan.minutes;
              const displayPrice = isBasic ? basicOpt.price_monthly : plan.price_monthly;
              const displayWeekly = isBasic ? basicOpt.price_weekly : plan.price_weekly;
              const displayDesc = isBasic ? basicOpt.description : plan.description;

              return (
                <div
                  key={plan.id}
                  className={`theme-card relative rounded-3xl p-6 border transition-all ${
                    plan.popular
                      ? "bg-gradient-to-b from-violet-50 to-indigo-50 border-violet-300 shadow-xl shadow-violet-100"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                  } ${isCurrent ? "ring-2 ring-emerald-400/60" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg shadow-violet-500/30">
                      <Zap className="w-3 h-3" /> Popular
                    </div>
                  )}

                  <h3 className="font-display font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-xs mb-4">{displayDesc}</p>

                  {/* Seletor de aulas — apenas no plano Básico */}
                  {isBasic && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Aulas por mês:</p>
                      <div className="flex gap-2">
                        {[2, 4].map(n => (
                          <button
                            key={n}
                            onClick={() => setBasicSessions(n)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              basicSessions === n
                                ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600"
                            }`}
                          >
                            {n} aulas
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-5">
                    {displayPrice === 0 ? (
                      <span className="font-display text-2xl font-extrabold text-gray-900">Grátis</span>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-2xl font-extrabold text-gray-900">{fmtBRL(displayWeekly)}</span>
                          <span className="text-gray-400 text-sm">/semana</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{fmtBRL(displayPrice)}/mês</p>
                      </>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {displayMinutes} minutos/mês
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Todos os tutores nativos
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Gravação de aulas
                    </li>
                  </ul>

                  <Button
                    onClick={() => selectPlan(plan, isBasic ? { price_monthly: displayPrice, minutes: displayMinutes } : {})}
                    disabled={isCurrent || displayPrice === 0}
                    className={`w-full border-0 transition-all hover:scale-105 ${
                      isCurrent ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-700" :
                      plan.popular ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20" :
                      "bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-600"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isCurrent ? "✓ Plano atual" : displayPrice === 0 ? "Grátis" : "Pagar com cartão"}
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── PRÉ-PAGO ── */}
        <TabsContent value="prepaid">
          <div className="max-w-2xl mx-auto">
            <p className="text-center text-sm text-gray-500 mb-6">Compre minutos sem mensalidade. Os créditos não expiram.</p>
            <div className="space-y-3">
              {PREPAID_PACKS.map(pack => (
                <div key={pack.id} className="theme-card flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-gray-900">{pack.label}</p>
                      <p className="text-xs text-gray-500">
                        {fmtBRL(pack.price_brl / pack.minutes * 30)}/30min
                        {pack.badge && <span className="ml-2 text-emerald-600 font-semibold">{pack.badge}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-gray-900 text-lg">{fmtBRL(pack.price_brl)}</p>
                    <Button
                      size="sm"
                      onClick={() => buyPack(pack)}
                      disabled={!!checkoutItem}
                      className="mt-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
                    >
                      Comprar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">
              Pagamento seguro via Mercado Pago · PIX, Cartão e Boleto · Créditos não expiram
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}