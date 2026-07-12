import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, CreditCard, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CheckoutModal({ item, onClose, onSuccess, userEmail }) {
  const [step, setStep] = useState("form"); // form | processing | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [mpReady, setMpReady] = useState(false);
  const mpRef = useRef(null);
  const cardFormRef = useRef(null);

  const [formData, setFormData] = useState({
    cardholderName: "",
    identificationNumber: "",
    identificationType: "CPF",
    installments: "1",
  });

  // Load MP SDK + fetch public key
  useEffect(() => {
    const loadSDK = (publicKey) => {
      if (window.MercadoPago) {
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        setMpReady(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        setMpReady(true);
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
      loadSDK(key);
    }).catch(() => {
      setErrorMsg("Erro ao carregar configuração de pagamento.");
      setStep("error");
    });

    return () => {
      if (cardFormRef.current) {
        cardFormRef.current.unmount?.();
        cardFormRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mpReady || !mpRef.current) return;

    setStep("processing");
    setErrorMsg("");

    try {
      // Create card token using MP SDK
      const cardTokenRes = await mpRef.current.createCardToken({
        cardholderName: formData.cardholderName,
        cardNumber: document.getElementById("mp-card-number")?.value?.replace(/\s/g, ""),
        cardExpirationMonth: document.getElementById("mp-expiry")?.value?.split("/")[0]?.trim(),
        cardExpirationYear: `20${document.getElementById("mp-expiry")?.value?.split("/")[1]?.trim()}`,
        securityCode: document.getElementById("mp-cvv")?.value,
        identificationType: formData.identificationType,
        identificationNumber: formData.identificationNumber.replace(/\D/g, ""),
      });

      if (cardTokenRes.error) {
        throw new Error(cardTokenRes.error.message || "Erro ao tokenizar cartão");
      }

      const token = cardTokenRes.id;

      // Detect payment method
      const cardNumber = document.getElementById("mp-card-number")?.value?.replace(/\s/g, "") || "";
      const pmRes = await mpRef.current.getPaymentMethods({ bin: cardNumber.slice(0, 6) });
      const paymentMethodId = pmRes?.results?.[0]?.id || "visa";

      // Process payment via backend
      const res = await base44.functions.invoke("mpProcessPayment", {
        token,
        payment_method_id: paymentMethodId,
        installments: parseInt(formData.installments),
        external_reference: item.external_reference,
        payer_email: userEmail,
        description: item.title,
        transaction_amount: item.price,
      });

      if (res.data?.success) {
        setStep("success");
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 2500);
      } else if (res.data?.status === "pending" || res.data?.status === "in_process") {
        setStep("success");
        setTimeout(() => {
          onSuccess?.("pending");
          onClose?.();
        }, 2500);
      } else {
        const detail = res.data?.status_detail || res.data?.error || "Pagamento recusado";
        throw new Error(detail);
      }
    } catch (err) {
      setErrorMsg(err.message || "Erro ao processar pagamento");
      setStep("error");
    }
  };

  const installmentOptions = [1, 2, 3, 6, 12];

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

        {/* Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Card number */}
            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Número do cartão</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="mp-card-number"
                  type="text"
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="0000 0000 0000 0000"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 16);
                    e.target.value = v.replace(/(.{4})/g, "$1 ").trim();
                  }}
                />
              </div>
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Validade</Label>
                <input
                  id="mp-expiry"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="MM/AA"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                    e.target.value = v;
                  }}
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">CVV</Label>
                <input
                  id="mp-cvv"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="123"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  onChange={e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4); }}
                />
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Nome no cartão</Label>
              <input
                type="text"
                placeholder="NOME SOBRENOME"
                required
                value={formData.cardholderName}
                onChange={e => setFormData(f => ({ ...f, cardholderName: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {/* CPF */}
            <div>
              <Label className="text-gray-400 text-xs mb-1 block">CPF do titular</Label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                required
                value={formData.identificationNumber}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 11);
                  if (v.length > 9) v = v.slice(0, 3) + "." + v.slice(3, 6) + "." + v.slice(6, 9) + "-" + v.slice(9);
                  else if (v.length > 6) v = v.slice(0, 3) + "." + v.slice(3, 6) + "." + v.slice(6);
                  else if (v.length > 3) v = v.slice(0, 3) + "." + v.slice(3);
                  setFormData(f => ({ ...f, identificationNumber: v }));
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {/* Parcelas */}
            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Parcelas</Label>
              <select
                value={formData.installments}
                onChange={e => setFormData(f => ({ ...f, installments: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
              >
                {installmentOptions.map(n => (
                  <option key={n} value={n} className="bg-[#0f0f1a]">
                    {n}x {fmtBRL(item.price / n)} {n === 1 ? "(sem juros)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={!mpReady}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 h-11 text-base font-semibold shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-all"
            >
              {mpReady ? `Pagar ${fmtBRL(item.price)}` : "Carregando…"}
            </Button>

            <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Pagamento criptografado pelo Mercado Pago
            </p>
          </form>
        )}
      </div>
    </div>
  );
}