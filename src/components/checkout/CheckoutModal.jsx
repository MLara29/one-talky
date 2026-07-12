import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, CreditCard, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function fmtBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCardNumber(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export default function CheckoutModal({ item, onClose, onSuccess, userEmail }) {
  const [step, setStep] = useState("loading"); // loading | form | processing | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const mpRef = useRef(null);

  const [form, setForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
    cpf: "",
    installments: "1",
  });

  const setField = (field) => (e) => {
    let val = e.target.value;
    if (field === "cardNumber") val = formatCardNumber(val);
    if (field === "expiry") val = formatExpiry(val);
    if (field === "cvv") val = val.replace(/\D/g, "").slice(0, 4);
    if (field === "cpf") {
      let d = val.replace(/\D/g, "").slice(0, 11);
      if (d.length > 9) d = d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6,9)+"-"+d.slice(9);
      else if (d.length > 6) d = d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6);
      else if (d.length > 3) d = d.slice(0,3)+"."+d.slice(3);
      val = d;
    }
    setForm(f => ({ ...f, [field]: val }));
  };

  // Load MP SDK and get public key
  useEffect(() => {
    const init = (publicKey) => {
      const load = () => {
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        setStep("form");
      };
      if (window.MercadoPago) { load(); return; }
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = load;
      script.onerror = () => { setErrorMsg("Falha ao carregar SDK do Mercado Pago."); setStep("error"); };
      document.body.appendChild(script);
    };

    base44.functions.invoke("mpGetPublicKey", {}).then(res => {
      const key = res.data?.public_key;
      if (!key) { setErrorMsg("Chave pública não configurada."); setStep("error"); return; }
      init(key);
    }).catch(() => { setErrorMsg("Erro ao carregar configuração de pagamento."); setStep("error"); });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mpRef.current) return;
    setStep("processing");
    setErrorMsg("");

    try {
      const mp = mpRef.current;
      const rawCard = form.cardNumber.replace(/\s/g, "");
      const [expMonth, expYear] = form.expiry.split("/");

      // 1. Get payment method by BIN
      const pmRes = await mp.getPaymentMethods({ bin: rawCard.slice(0, 6) });
      const paymentMethodId = pmRes?.results?.[0]?.id;
      if (!paymentMethodId) throw new Error("Bandeira do cartão não reconhecida. Verifique o número.");

      // 2. Create card token
      const tokenRes = await mp.createCardToken({
        cardNumber: rawCard,
        cardholderName: form.cardholderName,
        cardExpirationMonth: expMonth?.trim(),
        cardExpirationYear: `20${expYear?.trim()}`,
        securityCode: form.cvv,
        identificationType: "CPF",
        identificationNumber: form.cpf.replace(/\D/g, ""),
      });

      if (tokenRes?.cause?.length > 0) {
        const cause = tokenRes.cause[0];
        throw new Error(cause.description || "Dados do cartão inválidos");
      }
      if (!tokenRes?.id) throw new Error("Falha ao gerar token do cartão");

      // 3. Process payment
      const res = await base44.functions.invoke("mpProcessPayment", {
        token: tokenRes.id,
        payment_method_id: paymentMethodId,
        installments: parseInt(form.installments) || 1,
        external_reference: item.external_reference,
        payer_email: userEmail,
        description: item.title,
        transaction_amount: item.price,
        identification_type: "CPF",
        identification_number: form.cpf.replace(/\D/g, ""),
      });

      if (res.data?.success) {
        setStep("success");
        setTimeout(() => { onSuccess?.(); onClose?.(); }, 2500);
      } else if (["pending", "in_process"].includes(res.data?.status)) {
        setStep("success");
        setTimeout(() => { onSuccess?.("pending"); onClose?.(); }, 2500);
      } else {
        throw new Error(res.data?.status_detail || res.data?.error || "Pagamento recusado");
      }
    } catch (err) {
      setErrorMsg(err.message || "Erro ao processar pagamento");
      setStep("error");
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors";

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

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-gray-400 text-sm">Carregando...</p>
          </div>
        )}

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
            <Button onClick={() => setStep("form")} className="bg-violet-600 hover:bg-violet-700 text-white border-0 w-full">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Número do cartão</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  required
                  maxLength={19}
                  value={form.cardNumber}
                  onChange={setField("cardNumber")}
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Validade</Label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/AA"
                  required
                  maxLength={5}
                  value={form.expiry}
                  onChange={setField("expiry")}
                  className={inputCls}
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">CVV</Label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  required
                  maxLength={4}
                  value={form.cvv}
                  onChange={setField("cvv")}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Nome no cartão</Label>
              <input
                type="text"
                placeholder="NOME SOBRENOME"
                required
                value={form.cardholderName}
                onChange={e => setForm(f => ({ ...f, cardholderName: e.target.value.toUpperCase() }))}
                className={inputCls}
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1 block">CPF do titular</Label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                required
                maxLength={14}
                value={form.cpf}
                onChange={setField("cpf")}
                className={inputCls}
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Parcelas</Label>
              <select
                value={form.installments}
                onChange={e => setForm(f => ({ ...f, installments: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
              >
                {[1, 2, 3, 6, 12].map(n => (
                  <option key={n} value={n} className="bg-[#0f0f1a]">
                    {n}x {fmtBRL(item.price / n)}{n === 1 ? " (sem juros)" : ""}
                  </option>
                ))}
              </select>
            </div>

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
        )}
      </div>
    </div>
  );
}