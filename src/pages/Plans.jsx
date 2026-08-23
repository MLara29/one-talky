import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Clock, CreditCard } from "lucide-react";
import { PlanShield } from "@/components/student/CreditsBanner";
import { PLANS, PREPAID_PACKS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import StripeCheckoutModal from "@/components/checkout/StripeCheckoutModal";
import CancelPlanModal from "@/components/student/CancelPlanModal";
import { isFirstWeekActive } from "@/lib/firstWeekWindow";
import { detectAndCacheRegion, getRegionalConfig, formatRegionalPrice, getCachedRegion } from "@/lib/regionPricing";

const ACCENT = "#F26A1B";

// Nome/descrição de cada plano e pacote vêm do dicionário de idiomas, não
// dos dados fixos em constants.js — os dados fixos (id, minutos, preço)
// continuam vindo de lá, só o texto exibido muda com o idioma escolhido.
const planName = (lang, id) => t(lang, `planName${id.charAt(0).toUpperCase()}${id.slice(1)}`);
const planDesc = (lang, id) => t(lang, `planDesc${id.charAt(0).toUpperCase()}${id.slice(1)}`);
const packLabel = (lang, packId) => t(lang, `packLabel${packId.replace("pp_", "")}`);
const packBadgeText = (lang, badge) => {
  if (!badge) return null;
  const pct = badge.match(/\d+/)?.[0];
  return pct ? t(lang, `packBadge${pct}`) : badge;
};

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Plans() {
  const { user } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [regionData, setRegionData] = useState(() => getCachedRegion());

  useEffect(() => {
    if (!regionData) detectAndCacheRegion().then(setRegionData);
  }, []);

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        // Fetch coupon discount info for display (discount_percent is coupon-level,
        // so one probe call is enough to calculate the discounted price for any item).
        if (profiles[0].coupon_code) {
          try {
            const res = await base44.functions.invoke('validateCoupon', {
              coupon_code: profiles[0].coupon_code,
              external_reference: 'plan:standard',
            });
            if (res.data?.valid) {
              setCouponDiscount({
                discount_percent: res.data.discount_percent || 0,
                bonus_minutes: res.data.bonus_minutes || 0,
              });
            }
          } catch {}
        }
      }
    } catch {} finally { setLoading(false); }
  };

  const applyDiscount = (price) => {
    if (!couponDiscount || couponDiscount.discount_percent <= 0) return price;
    return Math.round(price * (1 - couponDiscount.discount_percent / 100) * 100) / 100;
  };

  // Preço regional: Brasil/desconhecido → BRL (sem mudança). Internacional →
  // moeda local (EUR/JPY/KRW/USD). Pacotes pré-pagos continuam sempre em BRL.
  const isBR = !regionData || regionData.region === "br";
  const regionConfig = isBR ? null : getRegionalConfig(regionData.region);

  const planMonthlyDisplay = (plan) => {
    if (isBR || !regionConfig) return fmtBRL(plan.price_monthly);
    const regional = regionConfig.plans[plan.id];
    if (regional === undefined) return fmtBRL(plan.price_monthly);
    return formatRegionalPrice(regional, regionConfig.currency, regionConfig.locale);
  };

  const planWeeklyDisplay = (plan) => {
    if (isBR || !regionConfig) return fmtBRL(plan.price_weekly);
    const regional = regionConfig.plans[plan.id];
    if (regional === undefined) return fmtBRL(plan.price_weekly);
    const weekly = plan.id === "basic" ? regional / 2 : regional / 4;
    return formatRegionalPrice(weekly, regionConfig.currency, regionConfig.locale);
  };

  const handleSuccess = (status) => {
    if (status === "pending") {
      toast({ title: t(lang, "pendingPaymentTitle"), description: t(lang, "pendingPaymentDesc") });
    } else {
      toast({ title: t(lang, "approvedPaymentTitle"), description: t(lang, "approvedPaymentDesc") });
    }
    loadProfile();
  };

  const selectPlan = (plan) => {
    if (!profile || plan.price_monthly === 0) return;
    const discountedPrice = applyDiscount(plan.price_monthly);
    const currency = isBR || !regionConfig ? "BRL" : regionConfig.currency;
    let displayPrice, displayOriginal;
    if (isBR || !regionConfig) {
      displayPrice = discountedPrice;
      displayOriginal = discountedPrice < plan.price_monthly ? plan.price_monthly : null;
    } else {
      const regionalMonthly = regionConfig.plans[plan.id] || plan.price_monthly;
      displayPrice = applyDiscount(regionalMonthly);
      displayOriginal = displayPrice < regionalMonthly ? regionalMonthly : null;
    }
    setCheckoutItem({
      title: t(lang, "checkoutPlanTitle").replace("{name}", planName(lang, plan.id)).replace("{minutes}", plan.minutes),
      price: discountedPrice,
      original_price: discountedPrice < plan.price_monthly ? plan.price_monthly : null,
      bonus_minutes: couponDiscount?.bonus_minutes || 0,
      external_reference: `plan:${plan.id}`,
      currency,
      display_price: displayPrice,
      display_original: displayOriginal,
    });
  };

  const buyPack = (pack) => {
    if (!profile) return;
    const ref = pack.id === "teste" ? "pack:teste" : `pack:${pack.id}`;
    const discountedPrice = applyDiscount(pack.price_brl);
    setCheckoutItem({
      title: `One Talky — ${pack.label}`,
      price: discountedPrice,
      original_price: discountedPrice < pack.price_brl ? pack.price_brl : null,
      bonus_minutes: couponDiscount?.bonus_minutes || 0,
      external_reference: ref,
      // Pacotes são sempre BRL (sem precificação internacional).
      currency: "BRL",
      display_price: discountedPrice,
      display_original: discountedPrice < pack.price_brl ? pack.price_brl : null,
    });
  };

  const affiliateCoupon = profile?.coupon_code || null;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: "#EEE7DD", borderTopColor: ACCENT }} />
    </div>
  );

  return (
    <div>
      {checkoutItem && paymentMethod === "stripe" && (
        <StripeCheckoutModal
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
          onSuccess={handleSuccess}
          affiliateCoupon={affiliateCoupon}
        />
      )}
      {checkoutItem && paymentMethod === "mercadopago" && (
        <CheckoutModal
          item={checkoutItem}
          userEmail={user?.email}
          onClose={() => setCheckoutItem(null)}
          onSuccess={handleSuccess}
          affiliateCoupon={affiliateCoupon}
        />
      )}

      {showCancelModal && (
        <CancelPlanModal
          profile={profile}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            const wasWithinGuarantee = isFirstWeekActive(profile);
            setProfile(prev => ({
              ...prev,
              plan: wasWithinGuarantee ? "free" : prev.plan,
              subscription_status: "cancelled",
            }));
          }}
        />
      )}

      <div className="text-center mb-10">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold mb-2">Planos & Créditos</h1>
        <p className="theme-subtext text-sm" style={{ color: "#5A5B66" }}>R$ 29,90 por 30 minutos · Sem fidelidade obrigatória</p>
        {profile && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "rgba(242,106,27,0.10)", border: "1px solid rgba(242,106,27,0.25)", color: ACCENT }}>
            <Clock className="w-4 h-4" /> {Math.round((profile.plan_credits_minutes || 0) + (profile.prepaid_credits_minutes || 0))} minutos disponíveis
          </div>
        )}
      </div>

      {/* ── Seletor de método de pagamento ──────────────────────────────────────
          TEMPORARIAMENTE só Stripe: o botão do Mercado Pago foi escondido
          (não removido) enquanto uma vulnerabilidade em mpConfirmPayment não
          é corrigida. Pra reativar: descomentar o bloco abaixo e trocar
          "false &&" por nada nessa condição. Nenhuma lógica de MP foi apagada. */}
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        {false && (
          <>
            <span className="text-xs font-semibold" style={{ color: "#8A8B94" }}>Pagamento via:</span>
            <div className="inline-flex rounded-full overflow-hidden" style={{ border: "1px solid #EEE7DD", background: "#fff" }}>
              <button
                onClick={() => setPaymentMethod("stripe")}
                style={{
                  padding: "7px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  background: paymentMethod === "stripe" ? "#635BFF" : "transparent",
                  color: paymentMethod === "stripe" ? "#fff" : "#8A8B94",
                  border: "none", cursor: "pointer", transition: "all .2s",
                }}
              >
                Stripe {paymentMethod === "stripe" && "✓"}
              </button>
              <button
                onClick={() => setPaymentMethod("mercadopago")}
                style={{
                  padding: "7px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  background: paymentMethod === "mercadopago" ? "#00B1EA" : "transparent",
                  color: paymentMethod === "mercadopago" ? "#fff" : "#8A8B94",
                  border: "none", cursor: "pointer", transition: "all .2s",
                }}
              >
                Mercado Pago
              </button>
            </div>
          </>
        )}
        {paymentMethod === "stripe" && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(99,91,255,0.10)", color: "#635BFF" }}>
            Recomendado
          </span>
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
              const isCancelledButActive = isCurrent && profile?.subscription_status === "cancelled" && profile?.subscription_valid_until && new Date(profile.subscription_valid_until) > new Date();

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
                  {isCurrent && !isCancelledButActive && (
                    <span style={{ position: "absolute", top: -13, right: 16, background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999 }}>
                      ✓ Atual
                    </span>
                  )}
                  {isCancelledButActive && (
                    <span style={{ position: "absolute", top: -13, right: 16, background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                      Cancelado · até {new Date(profile.subscription_valid_until).toLocaleDateString('pt-BR')}
                    </span>
                  )}

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#A29A8C" }}>One Talky</div>
                    <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4, color: "#17181C" }}>{plan.name}</div>
                    <div style={{ fontSize: 12.5, color: "#8A8B94", marginTop: 2 }}>{plan.description}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <PlanShield plan={plan.id} size={44} />
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", color: "#17181C" }}>{planMonthlyDisplay(plan)}</span>
                        <span style={{ fontSize: 13, color: "#8A8B94", fontWeight: 700 }}>/mês</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#8A8B94", fontWeight: 600 }}>{planWeeklyDisplay(plan)}/semana</div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: "#EEE7DD" }} />

                  <ul className="flex flex-col gap-2 flex-1" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>{plan.minutes} minutos/mês
                    </li>
                    <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>{plan.description}
                    </li>
                    <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>Todos os tutores nativos
                    </li>
                    <li className="flex gap-2 items-start" style={{ fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>Acesso ao pré-pago
                    </li>
                  </ul>

                  <button
                    onClick={() => selectPlan(plan)}
                    disabled={isCurrent && !isCancelledButActive}
                    style={{
                      textAlign: "center", padding: "13px 0", borderRadius: 999, fontWeight: 700, fontSize: 14.5,
                      background: isCancelledButActive ? "#fff7ed" : isCurrent ? "#f0fdf4" : isHighlight ? ACCENT : "#17181C",
                      color: isCancelledButActive ? "#f59e0b" : isCurrent ? "#22c55e" : "#fff",
                      border: isCancelledButActive ? "1.5px solid #fdba74" : isCurrent ? "1.5px solid #86efac" : "none",
                      cursor: (isCurrent && !isCancelledButActive) ? "default" : "pointer",
                      fontFamily: "inherit", transition: "opacity .2s",
                    }}
                  >
                    <CreditCard className="inline w-4 h-4 mr-2 mb-0.5" />
                    {isCancelledButActive
                      ? `Acesso até ${new Date(profile.subscription_valid_until).toLocaleDateString('pt-BR')}`
                      : isCurrent ? "✓ Plano atual" : "Assinar agora"}
                  </button>

                  {isCurrent && plan.id !== "free" && !isCancelledButActive && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      style={{ textAlign: "center", padding: "8px 0", fontWeight: 600, fontSize: 13, background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Cancelar assinatura
                    </button>
                  )}
                  {isCancelledButActive && (
                    <button
                      onClick={() => selectPlan(plan)}
                      style={{ textAlign: "center", padding: "8px 0", fontWeight: 600, fontSize: 13, background: "transparent", color: ACCENT, border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Reativar assinatura
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "#A29A8C" }}>
            Você pode cancelar a qualquer momento, sem multa. Ao cancelar, seu plano volta para Free, mas você mantém os minutos do plano por até 60 dias. Créditos pré-pagos não são afetados pelo cancelamento, mas sempre expiram 60 dias após a data da compra, independente do status da sua assinatura.
          </p>
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
              Pagamento seguro via {paymentMethod === "stripe" ? "Stripe" : "Mercado Pago"} · Cartão de crédito · Créditos não expiram
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}