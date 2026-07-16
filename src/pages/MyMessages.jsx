import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare, Clock, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

const STATUS_STYLES = {
  open: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  replied: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  closed: "bg-gray-500/10 border-gray-500/20 text-gray-500",
};
const STATUS_LABELS = { open: "Aberto", replied: "Respondido", closed: "Encerrado" };

export default function MyMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    try {
      const data = await base44.entities.SupportMessage.filter({ sender_id: user.id }, "-created_date", 50);
      setMessages(data);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold">Minhas Mensagens</h1>
        <p className="theme-subtext text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
          Acompanhe suas mensagens enviadas ao suporte e as respostas da equipe
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
          <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
          <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>Nenhuma mensagem</h3>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
            Você ainda não enviou mensagens ao suporte.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
              <button
                onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                className="w-full text-left flex items-center justify-between gap-4 p-4 transition-colors"
                style={{ color: "var(--app-text-primary)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <MessageSquare className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--app-text-primary)" }}>{msg.subject}</p>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
                      <Clock className="w-3 h-3" />
                      {new Date(msg.created_date).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {msg.status === "replied" && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Nova resposta" />
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[msg.status]}`}>
                    {STATUS_LABELS[msg.status]}
                  </span>
                  {expanded === msg.id
                    ? <ChevronUp className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                  }
                </div>
              </button>

              {expanded === msg.id && (
                <div className="px-4 pb-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--app-border)" }}>
                  {/* Original message */}
                  <div className="rounded-xl p-3" style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)" }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--app-text-secondary)" }}>Sua mensagem</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--app-text-primary)" }}>{msg.message}</p>
                  </div>

                  {/* Admin reply */}
                  {msg.admin_reply ? (
                    <div className="rounded-xl p-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      <p className="text-xs font-semibold text-violet-500 mb-1.5">Resposta do Suporte</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--app-text-primary)" }}>{msg.admin_reply}</p>
                      {msg.replied_at && (
                        <p className="text-[10px] mt-2" style={{ color: "var(--app-text-secondary)" }}>
                          {new Date(msg.replied_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl p-3 text-center" style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)" }}>
                      <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
                        {msg.status === "closed" ? "Ticket encerrado sem resposta." : "Aguardando resposta da equipe de suporte..."}
                      </p>
                    </div>
                  )}

                  {msg.status === "closed" && (
                    <p className="text-xs flex items-center gap-1" style={{ color: "var(--app-text-secondary)" }}>
                      <CheckCircle className="w-3 h-3" /> Ticket encerrado
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}