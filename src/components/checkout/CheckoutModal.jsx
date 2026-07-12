import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CheckoutModal({ item, onClose, onSuccess, userEmail }) {
  const [step, setStep] = useState("form"); // form | processing | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const cardFormRef = useRef(null);
  const mpRef = useRef(null);

  // Load MP SDK + mount CardForm
  useEffect(() => {
    let mounted = true;

    const mountCardForm = (mp) => {
      if (!mounted) return;

      cardFormRef.current = mp.cardForm({
        amount: String(item.price),
        iframe: true,
        form: {
          id: "mp-card-form",
          cardholderName: { id: "mp-cardholder-name", placeholder: "NOME NO CARTÃO" },
          cardholderEmail: { id: "mp-cardholder-email", value: userEmail || "" },
          cardNumber: { id: "mp-card-number", placeholder: "Número do cartão" },
          cardExpirationDate: { id: "mp-card-expiry", placeholder: "MM/AA" },
          securityCode: { id: "mp-card-cvv", placeholder: "CVV" },
          installments: { id: "mp-installments" },
          identificationType: { id: "mp-identification-type" },
          identificationNumber: { id: "mp-identification-number", placeholder: "CPF do titular" },
        },
        callbacks: {
          onFormMounted: (err) => {
            if (err) console.error("CardForm mount error", err);
          },
          onSubmit: async (event) => {
            event.preventDefault();
            if (!mounted) return;
            setStep("processing");
            setErrorMsg("");

            try {
              const {
                paymentMethodId,
                issuerId,
                cardholderEmail,
                amount,
                token,
                installments,
                identificationNumber,
                identificationType,
              } = cardFormRef.current.getCardFormData();

              const res = await base44.functions.invoke("mpProcessPayment", {
                token,
                payment_method_id: paymentMethodId,
                issuer_id: issuerId,
                installments: parseInt(installments) || 1,
                external_reference: item.external_reference,
                payer_email: cardholderEmail || userEmail,
                description: item.title,
                transaction_amount: item.price,
                identification_type: identificationType,
                identification_number: identificationNumber,
              });

              if (res.data?.success) {
                setStep("success");
                setTimeout(() => { onSuccess?.(); onClose?.(); }, 2500);
              } else if (res.data?.status === "pending" || res.data?.status === "in_process") {
                setStep("success");
                setTimeout(() => { onSuccess?.("pending"); onClose?.(); }, 2500);
              } else {
                throw new Error(res.data?.status_detail || res.data?.error || "Pagamento recusado");
              }
            } catch (err) {
              setErrorMsg(err.message || "Erro ao processar pagamento");
              setStep("error");
            }
          },
          onError: (errors) => {
            console.error("CardForm errors", errors);
          },
        },
      });
    };

    const initWithKey = (publicKey) => {
      if (!mounted) return;
      if (window.MercadoPago) {
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        mountCardForm(mpRef.current);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        if (!mounted) return;
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        mountCardForm(mpRef.current);
      };
      document.body.appendChild(script);
    };

    base44.functions.invoke("mpGetPublicKey", {}).then(res => {
      const key = res.data?.public_key;
      if (!key) {
        setErrorMsg("Chave pública do Mercado Pago não configurada.");
        setStep("error");
        return;
      }
      initWithKey(key);
    }).catch(() => {
      setErrorMsg("Erro ao carregar configuração de pagamento.");
      setStep("error");
    });

    return () => {
      mounted = false;
      if (cardFormRef.current) {
        cardFormRef.current.unmount?.();
        cardFormRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-violet-600/20 to-indigo-600/10">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-400" />
            <span className="text-white font-semibold text-sm">Pagamento Seguro</span>
            <span className="text-xs text-gray-500">· Mercado Pago</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item summary */}
        <div className="px-6 py-4 bg-white/3 border-b border-white/10">
          <p className="text-gray-400 text-xs">{item.title}</p>
          <p className="text-white font-display font-bold text-2xl">{fmtBRL(item.price)}</p>
        </div>

        {/* Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="text-white font-semibold">Processando pagamento…</p>
            <p className="text-gray-500 text-sm">Aguarde alguns segundos</p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <p className="text-white font-semibold text-lg">Pagamento aprovado! 🎉</p>
            <p className="text-gray-500 text-sm">Seus créditos foram adicionados</p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center py-10 px-6 gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-white font-semibold">Pagamento não processado</p>
            <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            <Button
              onClick={() => setStep("form")}
              className="bg-violet-600 hover:bg-violet-700 text-white border-0 w-full"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* CardForm - always in DOM so MP can mount iframes, hidden when not on form step */}
        <div style={{ display: step === "form" ? "block" : "none" }}>
          <form id="mp-card-form" className="px-6 py-5 space-y-4">
            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Nome no cartão</Label>
              <input
                id="mp-cardholder-name"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Número do cartão</Label>
              <div
                id="mp-card-number"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Validade</Label>
                <div
                  id="mp-card-expiry"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm h-10"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">CVV</Label>
                <div
                  id="mp-card-cvv"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Tipo doc.</Label>
                <select
                  id="mp-identification-type"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f1a] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors h-10"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">CPF / Documento</Label>
                <input
                  id="mp-identification-number"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Parcelas</Label>
              <select
                id="mp-installments"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f1a] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors h-10"
              />
            </div>

            {/* Hidden email field */}
            <input id="mp-cardholder-email" type="hidden" value={userEmail || ""} />

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 h-11 text-base font-semibold shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-all"
            >
              Pagar {fmtBRL(item.price)}
            </Button>

            <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Pagamento criptografado pelo Mercado Pago
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}