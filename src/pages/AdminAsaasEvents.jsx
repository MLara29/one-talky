import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";

const STATUS_COLOR = {
  CONFIRMED: "bg-emerald-50 text-emerald-600",
  RECEIVED: "bg-emerald-50 text-emerald-600",
  OVERDUE: "bg-red-50 text-red-600",
  PENDING: "bg-amber-50 text-amber-600",
};

export default function AdminAsaasEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    base44.entities.AsaasTestEvent.list("-received_at", 100)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
        Teste Asaas — Cobrança Recorrente
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Eventos recebidos via webhook. Aparecerá um novo evento a cada semana automaticamente se a recorrência funcionar.
      </p>

      {events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Zap className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum evento recebido ainda.</p>
          <p className="text-gray-400 text-xs mt-1">
            Confirme a assinatura de teste no Asaas e cadastre a URL do webhook nas configurações.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const open = expanded === ev.id;
            return (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : ev.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50"
                >
                  {open ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] text-gray-500">
                        {ev.received_at
                          ? new Date(ev.received_at).toLocaleString("pt-BR")
                          : new Date(ev.created_date).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                        {ev.event_type}
                      </span>
                      {ev.status && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            STATUS_COLOR[ev.status?.toUpperCase()] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ev.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {ev.value != null && `R$ ${Number(ev.value).toFixed(2)} · `}
                      {ev.subscription_id
                        ? `Assinatura ${ev.subscription_id}`
                        : "Sem assinatura"}
                      {ev.payment_id && ` · Pagamento ${ev.payment_id}`}
                    </p>
                  </div>
                </button>
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