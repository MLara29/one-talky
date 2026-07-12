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

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null); // item to pay

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
      external_reference: `plan:${plan.id}:${plan.minutes}`,
    });
  };

  const buyPack = (pack) => {
    if (!profile) return;
    setCheckoutItem({
      title: `One Talky — ${pack.label}`,
      price: pack.price_brl,
      external_reference: `pack:${pack.id}:${pack.minutes}`,
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
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-2">Planos & Créditos</h1>
        <p className="theme-subtext text-gray-500 text-sm">R$ 66 por 30 minutos · Sem fidelidade obrigatória</p>
        {profile && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-semibold">
            <Clock className="w-4 h-4" /> {profile.credits_minutes || 0} minutos disponíveis
          </div>
        )}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-8 bg-white/5 border border-white/10 mx-auto flex w-fit">
          <TabsTrigger value="plans" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 px-6">
            Planos mensais
          </TabsTrigger>
          <TabsTrigger value="prepaid" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500 px-6">
            Pré-pago
          </TabsTrigger>
        </TabsList>

        {/* ── PLANOS MENSAIS ── */}
        <TabsContent value="plans">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => {
              const isCurrent = profile?.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`theme-card relative rounded-3xl p-6 border transition-all ${
                    plan.popular
                      ? "bg-gradient-to-b from-violet-500/20 to-indigo-500/10 border-violet-500/40 shadow-xl shadow-violet-500/10"
                      : "bg-white/5 border-white/10 hover:bg-white/8"
                  } ${isCurrent ? "ring-2 ring-emerald-400/60" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg shadow-violet-500/30">
                      <Zap className="w-3 h-3" /> Popular
                    </div>
                  )}
                  <h3 className="theme-heading font-display font-bold text-white mb-1">{plan.name}</h3>
                  <p className="theme-subtext text-gray-500 text-xs mb-5">{plan.description}</p>
                  <div className="mb-5">
                    {plan.price_weekly === 0 ? (
                      <span className="theme-heading font-display text-2xl font-extrabold text-white">Grátis</span>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="theme-heading font-display text-2xl font-extrabold text-white">{fmtBRL(plan.price_weekly)}</span>
                          <span className="theme-subtext text-gray-500 text-sm">/semana</span>
                        </div>
                        <p className="theme-subtext text-gray-500 text-xs mt-1">{fmtBRL(plan.price_monthly)}/mês</p>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="theme-subtext flex items-center gap-2 text-sm text-gray-500">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {plan.minutes} minutos/mês
                    </li>
                    <li className="theme-subtext flex items-center gap-2 text-sm text-gray-500">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Todos os tutores nativos
                    </li>
                    <li className="theme-subtext flex items-center gap-2 text-sm text-gray-500">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Gravação de aulas
                    </li>
                  </ul>
                  <Button
                    onClick={() => selectPlan(plan)}
                    disabled={isCurrent || plan.price_monthly === 0}
                    className={`w-full border-0 transition-all hover:scale-105 ${
                      isCurrent ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-600" :
                      plan.popular ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20" :
                      "bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isCurrent ? "✓ Plano atual" : plan.price_monthly === 0 ? "Grátis" : "Pagar com cartão"}
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── PRÉ-PAGO ── */}
        <TabsContent value="prepaid">
          <div className="max-w-2xl mx-auto">
            <p className="theme-subtext text-center text-sm text-gray-500 mb-6">Compre minutos sem mensalidade. Os créditos não expiram.</p>
            <div className="space-y-3">
              {PREPAID_PACKS.map(pack => (
                <div key={pack.id} className="theme-card flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 hover:bg-white/8 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="theme-heading font-display font-bold text-white">{pack.label}</p>
                      <p className="theme-subtext text-xs text-gray-500">
                        {fmtBRL(pack.price_brl / pack.minutes * 30)}/30min
                        {pack.badge && <span className="ml-2 text-emerald-600 font-semibold">{pack.badge}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="theme-heading font-display font-bold text-white text-lg">{fmtBRL(pack.price_brl)}</p>
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
            <p className="theme-subtext text-center text-xs text-gray-500 mt-6">
              Pagamento seguro via Mercado Pago · PIX, Cartão e Boleto · Créditos não expiram
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}