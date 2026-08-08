import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X, Lock, Loader2, AlertCircle, CheckCircle, CreditCard } from "lucide-react";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Stripe Embedded Checkout — renders the Stripe-hosted form inline (no redirect).
// Mirrors the CheckoutModal interface so it's a drop-in swap on the Plans page.
// Calls stripeCreateCheckout once to get the client_secret + publishable_key,
// then hands them to <EmbeddedCheckoutProvider>/<EmbeddedCheckout>.
export default function StripeCheckoutModal({ item, onClose, onSuccess, userEmail, affiliateCoupon }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("stripeCreateCheckout", {
          external_reference: item.external_reference,
          coupon_code: affiliateCoupon || undefined,
        });
        if (cancelled) return;
        if (res.data?.error) throw new Error(res.data.error);
        if (!res.data?.client_secret) throw new Error("Falha ao iniciar checkout");
        setClientSecret(res.data.client_secret);
        setPublishableKey(res.data.publishable_key);
      } catch (err) {
        console.error("[StripeCheckoutModal] init error:", err);
        if (!cancelled) setError(err.message || "Erro ao carregar checkout");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // loadStripe is stable per publishable key — memoized so the provider
  // doesn't re-init on every render.
  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const handleComplete = () => {
    setDone(true);
    setTimeout(() => { onSuccess?.(); onClose?.(); }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(242,106,27,0.12), rgba(242,106,27,0.04))",
            borderBottom: "1px solid var(--app-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: "#F26A1B" }} />
            <span className="theme-heading font-semibold text-sm">Pagamento Seguro</span>
            <span className="theme-subtext text-xs" style={{ color: "var(--app-text-muted)" }}>· Stripe</span>
          </div>
          <button onClick={onClose} className="theme-subtext hover:opacity-70 transition-opacity">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item summary */}
        <div className="px-6 py-4 shrink-0" style={{ background: "var(--app-nav-hover-bg)", borderBottom: "1px solid var(--app-border)" }}>
          <p className="theme-subtext text-xs" style={{ color: "var(--app-text-secondary)" }}>{item.title}</p>
          <div className="flex items-baseline gap-2">
            <p className="theme-heading font-display font-bold text-2xl">{fmtBRL(item.price)}</p>
            {item.original_price && item.original_price > item.price && (
              <span className="text-sm line-through" style={{ color: "var(--app-text-muted)" }}>{fmtBRL(item.original_price)}</span>
            )}
          </div>
          {item.bonus_minutes > 0 && (
            <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-500">
              <CreditCard className="w-3 h-3" /> +{item.bonus_minutes} min de bônus
            </div>
          )}
          {affiliateCoupon && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-500">
              <CreditCard className="w-3 h-3" /> Cupom aplicado: <span className="font-mono">{affiliateCoupon}</span>
            </div>
          )}
        </div>

        {/* Body — scrollable if Stripe form is tall */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F26A1B" }} />
              <p className="theme-subtext text-sm" style={{ color: "var(--app-text-secondary)" }}>Carregando checkout…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center py-10 px-6 gap-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="theme-heading font-semibold">Não foi possível iniciar o pagamento</p>
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {done && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
              <p className="theme-heading font-semibold text-lg">Pagamento aprovado! 🎉</p>
              <p className="theme-subtext text-sm" style={{ color: "var(--app-text-secondary)" }}>Seus créditos foram adicionados</p>
            </div>
          )}

          {!loading && !error && !done && clientSecret && stripePromise && (
            <div style={{ minHeight: 420 }}>
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret, onComplete: handleComplete }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}