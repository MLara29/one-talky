import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, Mail, ChevronDown, ChevronUp, Inbox } from "lucide-react";

const SOURCE_LABELS = {
  otp: "Código OTP (2FA)",
  admin_new_user: "Novo cadastro → admin",
  tutor_booking: "Agendamento → tutor",
  support_message: "Mensagem de suporte",
  withdrawal_status: "Status de pagamento",
  admin_compose: "Composição manual",
  admin_send_email: "Envio direto (admin)",
  reschedule_propose: "Proposta de reagendamento",
  reschedule_respond: "Resposta de reagendamento",
  reschedule_message: "Mensagem de reagendamento",
  lesson_reminder: "Lembrete de aula",
};

function sourceLabel(source) {
  return SOURCE_LABELS[source] || source || "—";
}

export default function EmailHistorySection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    base44.entities.EmailLog.list("-sent_at", 100)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-white/10 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="w-10 h-10 text-gray-600 mb-3" />
        <p className="text-gray-400 text-sm">Nenhum e-mail enviado ainda.</p>
        <p className="text-gray-600 text-xs mt-1">Os e-mails enviados aparecerão aqui automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const expanded = expandedId === log.id;
        return (
          <div
            key={log.id}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(log.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium truncate">{log.subject || "(sem assunto)"}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-gray-300 shrink-0">
                    {sourceLabel(log.source)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5 truncate">Para: {log.to}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-gray-600 text-xs hidden sm:block">
                  {log.sent_at ? new Date(log.sent_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}
                </span>
                {expanded
                  ? <ChevronUp className="w-4 h-4 text-gray-500" />
                  : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>

            {expanded && (
              <div className="border-t border-white/10">
                <div className="px-4 py-2.5 bg-white/3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                  <span><strong className="text-gray-300">Destinatário:</strong> {log.to}</span>
                  <span><strong className="text-gray-300">Origem:</strong> {sourceLabel(log.source)}</span>
                  <span><strong className="text-gray-300">Enviado por:</strong> {log.sent_by === "system" ? "Sistema" : "Admin"}</span>
                  <span><strong className="text-gray-300">Data:</strong> {log.sent_at ? new Date(log.sent_at).toLocaleString("pt-BR") : "—"}</span>
                </div>
                {log.html_preview ? (
                  <iframe
                    srcDoc={log.html_preview}
                    sandbox=""
                    className="w-full"
                    style={{ height: 320, border: "none", background: "#fff" }}
                    title="Corpo do e-mail"
                  />
                ) : (
                  <p className="px-4 py-6 text-gray-600 text-xs text-center">Sem conteúdo salvo.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}