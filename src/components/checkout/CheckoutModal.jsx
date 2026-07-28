import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, CreditCard, Lock, CheckCircle, AlertCircle, Loader2, QrCode, Copy, Check, Tag } from "lucide-react";

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

export default function CheckoutModal({ item, onClose, onSuccess, userEmail, affiliateCoupon }) {
  const [tab, setTab] = useState("card"); // "card" | "pix" — pix temporarily disabled
  const [step, setStep] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const mpRef = useRef(null);

  // Card form
  const [form, setForm] = useState({
    cardNumber: "", expiry: "", cvv: "", cardholderName: "", cpf: "", installments: "1",
  });

  // Pix state
  const [pixCpf, setPixCpf] = useState("");
  const [pixData, setPixData] = useState(null); // { payment_id, qr_code, qr_code_base64 }
  const [pixStatus, setPixStatus] = useState("pending"); // pending | approved | cancelled
  const [copied, setCopied] = useState(false);
  const pixPollRef = useRef(null);

  const setField = (field) => (e) => {
    let val = e.target.value;
    if (field === "cardNumber") val = formatCardNumber(val);
    if (field === "expiry") val = formatExpiry(val);
    if (field === "cvv") val = val.replace(/\D/g, "").slice(0, 4);
    if (field === "cpf" || field === "pixCpf") {
      let d = val.replace(/\D/g, "").slice(0, 11);
      if (d.length > 9) d = d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6,9)+"-"+d.slice(9);
      else if (d.length > 6) d = d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6);
      else if (d.length > 3) d = d.slice(0,3)+"."+d.slice(3);
      val = d;
    }
    if (field === "pixCpf") { setPixCpf(val); return; }
    setForm(f => ({ ...f, [field]: val }));
  };

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

  // Cleanup pix polling on unmount
  useEffect(() => () => { if (pixPollRef.current) clearInterval(pixPollRef.current); }, []);

  // Card submit
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!mpRef.current) return;
    setStep("processing");
    setErrorMsg("");
    try {
      const mp = mpRef.current;
      const rawCard = form.cardNumber.replace(/\s/g, "");
      const [expMonth, expYear] = form.expiry.split("/");
      const pmRes = await mp.getPaymentMethods({ bin: rawCard.slice(0, 6) });
      const paymentMethodId = pmRes?.results?.[0]?.id;
      if (!paymentMethodId) throw new Error("Bandeira do cartão não reconhecida.");
      const tokenRes = await mp.createCardToken({
        cardNumber: rawCard,
        cardholderName: form.cardholderName,
        cardExpirationMonth: expMonth?.trim(),
        cardExpirationYear: `20${expYear?.trim()}`,
        securityCode: form.cvv,
        identificationType: "CPF",
        identificationNumber: form.cpf.replace(/\D/g, ""),
      });
      if (tokenRes?.cause?.length > 0) throw new Error(tokenRes.cause[0].description || "Dados do cartão inválidos");
      if (!tokenRes?.id) throw new Error("Falha ao gerar token do cartão");
      const res = await base44.functions.invoke("mpProcessPayment", {
        token: tokenRes.id,
        payment_method_id: paymentMethodId,
        installments: parseInt(form.installments) || 1,
        external_reference: item.external_reference,
        payer_email: userEmail,
        coupon_code: affiliateCoupon || undefined,
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

  // Pix submit
  const handlePixSubmit = async (e) => {
    e.preventDefault();
    const rawCpf = pixCpf.replace(/\D/g, "");
    if (rawCpf.length !== 11) {
      setErrorMsg("CPF inválido. Digite os 11 dígitos.");
      return;
    }
    setErrorMsg("");
    setStep("processing");
    try {
      const nameParts = (userEmail || "Usuario Linguify").split("@")[0].split(".");
      const res = await base44.functions.invoke("mpCreatePixPayment", {
        external_reference: item.external_reference,
        payer_email: userEmail,
        payer_first_name: nameParts[0] || "Usuario",
        payer_last_name: nameParts[1] || "Linguify",
        payer_cpf: pixCpf,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setPixData(res.data);
      setPixStatus("pending");
      setStep("pix_qr");
      // Poll for payment status every 5s
      pixPollRef.current = setInterval(async () => {
        const check = await base44.functions.invoke("mpCheckPixStatus", {
          payment_id: res.data.payment_id,
          external_reference: item.external_reference,
        });
        const st = check.data?.status;
        if (st === "approved") {
          clearInterval(pixPollRef.current);
          setPixStatus("approved");
          setTimeout(() => { onSuccess?.(); onClose?.(); }, 2500);
        } else if (st === "cancelled" || st === "rejected") {
          clearInterval(pixPollRef.current);
          setPixStatus("cancelled");
        }
      }, 5000);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao gerar Pix");
      setStep("error");
    }
  };

  const handleCopy = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-500 transition-colors theme-input";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600/20 to-indigo-600/10" style={{ borderBottom: "1px solid var(--app-border)" }}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-400" />
            <span className="theme-heading font-semibold text-sm">Pagamento Seguro</span>
            <span className="theme-subtext text-xs" style={{ color: "var(--app-text-muted)" }}>· Mercado Pago</span>
          </div>
          <button onClick={onClose} className="theme-subtext hover:opacity-70 transition-opacity">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item summary */}
        <div className="px-6 py-4" style={{ background: "var(--app-nav-hover-bg)", borderBottom: "1px solid var(--app-border)" }}>
          <p className="theme-subtext text-xs" style={{ color: "var(--app-text-secondary)" }}>{item.title}</p>
          <p className="theme-heading font-display font-bold text-2xl">{fmtBRL(item.price)}</p>
          {affiliateCoupon && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-500">
              <Tag className="w-3 h-3" />
              Cupom de afiliado aplicado: <span className="font-mono">{affiliateCoupon}</span>
            </div>
          )}
        </div>

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="theme-subtext text-sm" style={{ color: "var(--app-text-secondary)" }}>Carregando...</p>
          </div>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="theme-heading font-semibold">Processando...</p>
            <p className="theme-subtext text-sm" style={{ color: "var(--app-text-secondary)" }}>Aguarde alguns segundos</p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <p className="theme-heading font-semibold text-lg">Pagamento aprovado! 🎉</p>
            <p className="theme-subtext text-sm" style={{ color: "var(--app-text-secondary)" }}>Seus créditos foram adicionados</p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center py-10 px-6 gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="theme-heading font-semibold">Pagamento não processado</p>
            <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            <Button onClick={() => setStep("form")} className="bg-violet-600 hover:bg-violet-700 text-white border-0 w-full">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Pix QR Code */}
        {step === "pix_qr" && pixData && (
          <div className="flex flex-col items-center py-6 px-6 gap-4">
            {pixStatus === "approved" ? (
              <>
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <p className="theme-heading font-semibold text-lg">Pix confirmado! 🎉</p>
                <p className="theme-subtext text-sm" style={{ color: "var(--app-text-secondary)" }}>Seus créditos foram adicionados</p>
              </>
            ) : pixStatus === "cancelled" ? (
              <>
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="theme-heading font-semibold">Pix expirado ou cancelado</p>
                <Button onClick={() => setStep("form")} className="bg-violet-600 hover:bg-violet-700 text-white border-0 w-full">Tentar novamente</Button>
              </>
            ) : (
              <>
                <p className="theme-heading font-semibold text-center">Escaneie o QR Code para pagar</p>
                <p className="theme-subtext text-xs text-center" style={{ color: "var(--app-text-secondary)" }}>
                  Abra o app do seu banco → Pix → Ler QR Code
                </p>
                {pixData.qr_code_base64 && (
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 rounded-xl border-4 border-white"
                  />
                )}
                <div className="w-full">
                  <p className="theme-subtext text-xs mb-1" style={{ color: "var(--app-text-secondary)" }}>Ou copie o código Pix:</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={pixData.qr_code || ""}
                      className={`${inputCls} text-xs flex-1`}
                    />
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Aguardando confirmação do pagamento…
                </div>
              </>
            )}
          </div>
        )}

        {/* Form (card + pix tabs) */}
        {step === "form" && (
          <div>
            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid var(--app-border)" }}>
              <button
                onClick={() => setTab("card")}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === "card" ? "text-violet-400 border-b-2 border-violet-500" : "theme-subtext"}`}
                style={{ color: tab === "card" ? undefined : "var(--app-text-secondary)" }}
              >
                <CreditCard className="w-4 h-4" /> Cartão de crédito
              </button>
              {/* PIX DISABLED — remove the comment below to re-enable */}
              {/* <button
                onClick={() => setTab("pix")}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === "pix" ? "text-violet-400 border-b-2 border-violet-500" : "theme-subtext"}`}
                style={{ color: tab === "pix" ? undefined : "var(--app-text-secondary)" }}
              >
                <QrCode className="w-4 h-4" /> Pix
              </button> */}
            </div>

            {/* Card form */}
            {tab === "card" && (
              <form onSubmit={handleCardSubmit} className="px-6 py-5 space-y-4">
                <div>
                  <Label className="theme-subtext text-xs mb-1 block">Número do cartão</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" required maxLength={19}
                      value={form.cardNumber} onChange={setField("cardNumber")} className={`${inputCls} pl-10`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="theme-subtext text-xs mb-1 block">Validade</Label>
                    <input type="text" inputMode="numeric" placeholder="MM/AA" required maxLength={5}
                      value={form.expiry} onChange={setField("expiry")} className={inputCls} />
                  </div>
                  <div>
                    <Label className="theme-subtext text-xs mb-1 block">CVV</Label>
                    <input type="text" inputMode="numeric" placeholder="123" required maxLength={4}
                      value={form.cvv} onChange={setField("cvv")} className={inputCls} />
                  </div>
                </div>
                <div>
                  <Label className="theme-subtext text-xs mb-1 block">Nome no cartão</Label>
                  <input type="text" placeholder="NOME SOBRENOME" required value={form.cardholderName}
                    onChange={e => setForm(f => ({ ...f, cardholderName: e.target.value.toUpperCase() }))} className={inputCls} />
                </div>
                <div>
                  <Label className="theme-subtext text-xs mb-1 block">CPF do titular</Label>
                  <input type="text" inputMode="numeric" placeholder="000.000.000-00" required maxLength={14}
                    value={form.cpf} onChange={setField("cpf")} className={inputCls} />
                </div>
                <div>
                  <Label className="theme-subtext text-xs mb-1 block">Parcelas</Label>
                  <select value={form.installments} onChange={e => setForm(f => ({ ...f, installments: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-500 transition-colors theme-input">
                    {[1, 2, 3, 6, 12].map(n => (
                      <option key={n} value={n}>{n}x {fmtBRL(item.price / n)}{n === 1 ? " (sem juros)" : ""}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 h-11 text-base font-semibold shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-all">
                  Pagar {fmtBRL(item.price)}
                </Button>
                <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Pagamento criptografado pelo Mercado Pago
                </p>
              </form>
            )}

            {/* Pix form */}
            {tab === "pix" && (
              <form onSubmit={handlePixSubmit} className="px-6 py-5 space-y-4">
                <div className="rounded-2xl p-4 text-center" style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)" }}>
                  <QrCode className="w-10 h-10 text-violet-400 mx-auto mb-2" />
                  <p className="theme-heading font-semibold">Pague com Pix</p>
                  <p className="theme-subtext text-xs mt-1" style={{ color: "var(--app-text-secondary)" }}>
                    Aprovação instantânea · Sem taxas extras
                  </p>
                </div>
                <div>
                  <Label className="theme-subtext text-xs mb-1 block">CPF do pagador</Label>
                  <input type="text" inputMode="numeric" placeholder="000.000.000-00" required maxLength={14}
                    value={pixCpf} onChange={e => { setErrorMsg(""); setField("pixCpf")(e); }} className={inputCls} />
                  {errorMsg && <p className="text-red-400 text-xs mt-1">{errorMsg}</p>}
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 h-11 text-base font-semibold shadow-lg hover:scale-[1.02] transition-all">
                  Gerar QR Code · {fmtBRL(item.price)}
                </Button>
                <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Pix processado pelo Mercado Pago
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}