import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Loader2, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Zap, Ban } from "lucide-react";

function formatCardNumber(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}
function formatCpf(v) {
  let d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length > 9) d = d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
  else if (d.length > 6) d = d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6);
  else if (d.length > 3) d = d.slice(0, 3) + "." + d.slice(3);
  return d;
}

const STATUS_COLOR = {
  authorized: "bg-emerald-50 text-emerald-600",
  confirmed: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  cancelled: "bg-red-50 text-red-600",
};

export default function AdminRecurringTest() {
  const [form, setForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
    cpf: "",
    payerEmail: "",
  });
  const [step, setStep] = useState("form"); // form | processing | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);
  const mpRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [frequencyType, setFrequencyType] = useState("days"); // days | weeks | months

  // preapproval_ids que já foram cancelados (status ou evento manual)
  const cancelledIds = new Set(
    events
      .filter(
        (ev) =>
          ev.preapproval_id &&
          (ev.status?.toLowerCase() === "cancelled" ||
            ev.event_type === "cancelled_manually")
      )
      .map((ev) => ev.preapproval_id)
  );

  const handleCancel = async (preapprovalId) => {
    if (!window.confirm(`Cancelar a assinatura ${preapprovalId}? As cobranças recorrentes serão interrompidas.`)) return;
    setCancellingId(preapprovalId);
    try {
      const res = await base44.functions.invoke("testCancelRecurringSubscription", {
        preapproval_id: preapprovalId,
      });
      if (res.data?.success) {
        loadEvents();
      } else {
        alert(res.data?.error || "Não foi possível cancelar a assinatura.");
      }
    } catch (err) {
      console.error("[AdminRecurringTest] cancel error:", err);
      alert(err.message || "Erro ao cancelar assinatura.");
    } finally {
      setCancellingId(null);
    }
  };

  const loadEvents = () => {
    setLoadingEvents(true);
    base44.entities.RecurringSubscriptionTest.list("-received_at", 100)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  };

  useEffect(() => {
    loadEvents();
    const init = (publicKey) => {
      const load = () => {
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      };
      if (window.MercadoPago) {
        load();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = load;
      document.body.appendChild(script);
    };
    base44.functions.invoke("mpGetPublicKey", {}).then((res) => {
      const key = res.data?.public_key;
      if (key) init(key);
    });
  }, []);

  const setField = (field) => (e) => {
    let val = e.target.value;
    if (field === "cardNumber") val = formatCardNumber(val);
    if (field === "expiry") val = formatExpiry(val);
    if (field === "cvv") val = val.replace(/\D/g, "").slice(0, 4);
    if (field === "cpf") val = formatCpf(val);
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mpRef.current) {
      setErrorMsg("SDK do Mercado Pago ainda carregando. Aguarde um instante.");
      return;
    }
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

      const res = await base44.functions.invoke("testCreateRecurringSubscription", {
        card_token_id: tokenRes.id,
        payer_email: form.payerEmail,
        frequency_type: frequencyType,
      });
      if (res.data?.success) {
        setResult(res.data);
        setStep("success");
        loadEvents();
      } else {
        throw new Error(res.data?.error || "Falha ao criar assinatura");
      }
    } catch (err) {
      console.error("[AdminRecurringTest] error:", err);
      setErrorMsg(err.message || "Não foi possível criar a assinatura. Verifique os dados e tente novamente.");
      setStep("error");
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors theme-input";

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
        Teste Mercado Pago — Assinatura Recorrente
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Cria uma assinatura de teste de R$1/dia via Preapproval API. O cartão é tokenizado no navegador — nenhum dado sensível passa pelo backend.
      </p>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-8 max-w-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <Lock className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-sm text-gray-800">Pagamento Seguro · Mercado Pago</span>
        </div>

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm text-gray-600">Criando assinatura...</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="font-semibold text-gray-800">Assinatura criada! 🎉</p>
            <p className="text-xs text-gray-500">
              Preapproval ID: <span className="font-mono">{result?.preapproval_id}</span>
            </p>
            <p className="text-xs text-gray-500">Status: {result?.status}</p>
            <Button onClick={() => { setStep("form"); setResult(null); }} variant="outline" className="mt-2">
              Criar outra
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="font-semibold text-gray-800">Não foi possível criar</p>
            <p className="text-red-500 text-sm text-center">{errorMsg}</p>
            <Button onClick={() => setStep("form")} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              Tentar novamente
            </Button>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block text-gray-600">Número do cartão</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" required maxLength={19}
                  value={form.cardNumber} onChange={setField("cardNumber")} className={`${inputCls} pl-10`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block text-gray-600">Validade</Label>
                <input type="text" inputMode="numeric" placeholder="MM/AA" required maxLength={5}
                  value={form.expiry} onChange={setField("expiry")} className={inputCls} />
              </div>
              <div>
                <Label className="text-xs mb-1 block text-gray-600">CVV</Label>
                <input type="text" inputMode="numeric" placeholder="123" required maxLength={4}
                  value={form.cvv} onChange={setField("cvv")} className={inputCls} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-gray-600">Nome no cartão</Label>
              <input type="text" placeholder="NOME SOBRENOME" required value={form.cardholderName}
                onChange={(e) => setForm((f) => ({ ...f, cardholderName: e.target.value.toUpperCase() }))} className={inputCls} />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-gray-600">CPF do titular</Label>
              <input type="text" inputMode="numeric" placeholder="000.000.000-00" required maxLength={14}
                value={form.cpf} onChange={setField("cpf")} className={inputCls} />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-gray-600">E-mail do pagador</Label>
              <input type="email" placeholder="pagador@email.com" required value={form.payerEmail}
                onChange={(e) => setForm((f) => ({ ...f, payerEmail: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-gray-600">Frequência da cobrança</Label>
              <select value={frequencyType} onChange={(e) => setFrequencyType(e.target.value)} className={inputCls}>
                <option value="days">Diário (a cada 1 dia)</option>
                <option value="weeks">Semanal (a cada 7 dias)</option>
                <option value="months">Mensal (a cada 1 mês)</option>
              </select>
            </div>
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 h-11 text-base font-semibold">
              Criar assinatura de teste · R$ 1,00
            </Button>
            <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Cartão tokenizado pelo Mercado Pago
            </p>
          </form>
        )}
      </div>

      {/* Events list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold text-gray-900">Eventos recebidos</h2>
        <button onClick={loadEvents} className="text-gray-500 hover:text-orange-500 transition-colors" title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loadingEvents ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loadingEvents ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Zap className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum evento recebido ainda.</p>
          <p className="text-gray-400 text-xs mt-1">
            Cadastre a URL do webhook no Mercado Pago → Suas integrações → Webhooks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const open = expanded === ev.id;
            return (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                  <button onClick={() => setExpanded(open ? null : ev.id)} className="flex items-start gap-3 flex-1 min-w-0">
                    {open ? <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] text-gray-500">
                          {ev.received_at ? new Date(ev.received_at).toLocaleString("pt-BR") : new Date(ev.created_date).toLocaleString("pt-BR")}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                          {ev.event_type}
                        </span>
                        {ev.status && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[ev.status?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
                            {ev.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        {ev.preapproval_id ? `Assinatura ${ev.preapproval_id}` : ""}
                        {ev.payment_id ? ` · Pagamento ${ev.payment_id}` : ""}
                        {!ev.preapproval_id && !ev.payment_id ? "—" : ""}
                      </p>
                    </div>
                  </button>
                  {ev.preapproval_id && !cancelledIds.has(ev.preapproval_id) && (
                    <button
                      onClick={() => handleCancel(ev.preapproval_id)}
                      disabled={cancellingId === ev.preapproval_id}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Cancelar assinatura recorrente"
                    >
                      {cancellingId === ev.preapproval_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Ban className="w-3.5 h-3.5" />
                      )}
                      Cancelar
                    </button>
                  )}
                </div>
                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 mb-1">Payload completo</p>
                    <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-80">
                      {ev.raw_payload || "—"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}