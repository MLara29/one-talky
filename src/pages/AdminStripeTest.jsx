import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Zap, Ban, CreditCard, ExternalLink } from "lucide-react";

const STATUS_COLOR = {
  paid: "bg-emerald-50 text-emerald-600",
  open: "bg-amber-50 text-amber-600",
  canceled: "bg-red-50 text-red-600",
  active: "bg-emerald-50 text-emerald-600",
  complete: "bg-emerald-50 text-emerald-600",
  incomplete: "bg-amber-50 text-amber-600",
  failed: "bg-red-50 text-red-600",
};

export default function AdminStripeTest() {
  const [amount, setAmount] = useState(5);
  const [interval, setIntervalType] = useState("day");
  const [step, setStep] = useState("form"); // form | processing | error
  const [errorMsg, setErrorMsg] = useState("");
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [redirectMsg, setRedirectMsg] = useState("");

  const loadEvents = () => {
    setLoadingEvents(true);
    base44.entities.StripeTestEvent.list("-received_at", 100)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  };

  useEffect(() => {
    loadEvents();
    // Verifica se voltou do Stripe Checkout com status na query.
    const params = new URLSearchParams(window.location.search);
    const status = params.get("stripe_status");
    if (status === "success") {
      setRedirectMsg("Checkout concluído! Aguarde os eventos de webhook chegarem abaixo.");
      loadEvents();
    } else if (status === "cancel") {
      setRedirectMsg("Checkout cancelado pelo usuário.");
    }
    if (status) {
      // Limpa a query string.
      window.history.replaceState({}, "", "/admin/stripe-test");
      setTimeout(() => setRedirectMsg(""), 6000);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep("processing");
    setErrorMsg("");
    try {
      const res = await base44.functions.invoke("stripeCreateTestSubscription", {
        amount: Number(amount),
        interval,
      });
      if (res.data?.success && res.data?.checkout_url) {
        // Redireciona para a página hospedada do Stripe Checkout.
        window.location.href = res.data.checkout_url;
      } else {
        throw new Error(res.data?.error || "Falha ao criar Checkout Session");
      }
    } catch (err) {
      console.error("[AdminStripeTest] error:", err);
      setErrorMsg(err.message || "Não foi possível iniciar o checkout. Tente novamente.");
      setStep("error");
    }
  };

  const handleCancel = async (subscriptionId) => {
    if (!window.confirm(`Cancelar a assinatura ${subscriptionId} no Stripe?`)) return;
    setCancellingId(subscriptionId);
    try {
      const res = await base44.functions.invoke("stripeCancelTestSubscription", {
        subscription_id: subscriptionId,
      });
      if (res.data?.success) {
        loadEvents();
      } else {
        alert(res.data?.error || "Não foi possível cancelar a assinatura.");
      }
    } catch (err) {
      console.error("[AdminStripeTest] cancel error:", err);
      alert(err.message || "Erro ao cancelar assinatura.");
    } finally {
      setCancellingId(null);
    }
  };

  // subscription_ids que já foram cancelados.
  const cancelledIds = new Set(
    events
      .filter(
        (ev) =>
          ev.subscription_id &&
          (ev.status?.toLowerCase() === "canceled" ||
            ev.event_type === "subscription.cancelled_manually" ||
            ev.event_type === "customer.subscription.deleted")
      )
      .map((ev) => ev.subscription_id)
  );

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors theme-input";

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
        Teste Stripe — Assinatura Recorrente
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Cria uma assinatura de teste via Stripe Checkout (página hospedada pela Stripe). Use cartão de teste: <span className="font-mono">4242 4242 4242 4242</span>, validade futura, CVV qualquer.
      </p>

      {redirectMsg && (
        <div className="mb-6 p-3 rounded-xl bg-orange-50 border border-orange-200 text-sm text-orange-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {redirectMsg}
        </div>
      )}

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-8 max-w-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <CreditCard className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-sm text-gray-800">Stripe Checkout · Assinatura de Teste</span>
        </div>

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm text-gray-600">Criando Checkout Session...</p>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="font-semibold text-gray-800">Não foi possível iniciar</p>
            <p className="text-red-500 text-sm text-center">{errorMsg}</p>
            <Button onClick={() => setStep("form")} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              Tentar novamente
            </Button>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block text-gray-600">Valor da cobrança (R$)</Label>
              <input type="number" min="5" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="Valor (R$)" className={inputCls} />
              <p className="text-[11px] text-gray-400 mt-1">Mínimo R$ 5,00 (taxa fixa da Stripe pesa em valores menores).</p>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-gray-600">Intervalo da recorrência</Label>
              <select value={interval} onChange={(e) => setIntervalType(e.target.value)} className={inputCls}>
                <option value="day">Diário (a cada 1 dia)</option>
                <option value="week">Semanal (a cada 7 dias)</option>
                <option value="month">Mensal (a cada 1 mês)</option>
              </select>
            </div>
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 h-11 text-base font-semibold">
              <ExternalLink className="w-4 h-4" />
              Ir para Stripe Checkout
            </Button>
            <p className="text-center text-xs text-gray-500">
              Você será redirecionado para a Stripe e voltará após concluir o pagamento.
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
            Cadastre a URL do webhook na Stripe Dashboard → Developers → Webhooks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const open = expanded === ev.id;
            const subId = ev.subscription_id;
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
                        {subId ? `Assinatura ${subId}` : ""}
                        {ev.invoice_id ? ` · Invoice ${ev.invoice_id}` : ""}
                        {ev.checkout_session_id ? ` · Session ${ev.checkout_session_id}` : ""}
                        {!subId && !ev.invoice_id && !ev.checkout_session_id ? "—" : ""}
                      </p>
                      {ev.amount_paid != null && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Valor: R$ {(ev.amount_paid / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </button>
                  {subId && !cancelledIds.has(subId) && ev.event_type !== "checkout.session.created" && (
                    <button
                      onClick={() => handleCancel(subId)}
                      disabled={cancellingId === subId}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Cancelar assinatura no Stripe"
                    >
                      {cancellingId === subId ? (
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