import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Ticket, Send, Loader2, CheckCircle, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_STYLES = {
  open: "bg-amber-500/15 border-amber-500/20 text-amber-400",
  replied: "bg-blue-500/15 border-blue-500/20 text-blue-400",
  closed: "bg-gray-500/15 border-gray-500/20 text-gray-400",
};
const STATUS_LABELS = { open: "Aberto", replied: "Respondido", closed: "Fechado" };

export default function SupportTicketsPanel() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [replies, setReplies] = useState([]);

  const load = async () => {
    try {
      const data = await base44.entities.SupportMessage.list("-created_date", 200);
      setTickets(data);
    } catch (e) {
      console.error("[SupportTicketsPanel] load", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadReplies = async (ticketId) => {
    try {
      const data = await base44.entities.SupportTicketReply.filter({ ticket_id: ticketId }, "created_date", 100);
      setReplies(data);
    } catch {}
  };

  useEffect(() => {
    if (selectedTicket) loadReplies(selectedTicket.id);
    else setReplies([]);
  }, [selectedTicket?.id]);

  useEffect(() => {
    const unsubMsg = base44.entities.SupportMessage.subscribe(() => { load(); });
    const unsubReply = base44.entities.SupportTicketReply.subscribe(() => {
      if (selectedTicket) loadReplies(selectedTicket.id);
      load();
    });
    return () => { unsubMsg(); unsubReply(); };
  }, [selectedTicket?.id]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter(t => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setReplying(true);
    try {
      const res = await base44.functions.invoke("adminReplySupportTicket", {
        message_id: selectedTicket.id,
        action: "reply",
        reply: reply.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setSelectedTicket(prev => prev ? {
        ...prev,
        admin_reply: prev.admin_reply || reply.trim(),
        status: "replied",
        replied_at: prev.replied_at || new Date().toISOString(),
      } : null);
      setReply("");
      loadReplies(selectedTicket.id);
      toast({ title: "Resposta enviada", description: "O aluno/tutor foi notificado." });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e?.message || "Não foi possível responder", variant: "destructive" });
    } finally {
      setReplying(false);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke("adminReplySupportTicket", {
        message_id: selectedTicket.id,
        action: "close",
      });
      if (res.data?.error) throw new Error(res.data.error);
      setSelectedTicket(prev => prev ? { ...prev, status: "closed" } : null);
      toast({ title: "Ticket fechado" });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex gap-3 min-h-0 border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
      {/* LEFT — ticket list */}
      <div className={`w-full sm:w-96 border-r border-white/10 flex flex-col min-h-0 shrink-0 ${selectedTicket ? "hidden sm:flex" : "flex"}`}>
        {/* Status filter */}
        <div className="flex gap-1 p-2 shrink-0 border-b border-white/5">
          {["all", "open", "replied", "closed"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s ? "bg-orange-500/15 text-orange-400 border border-orange-500/20" : "text-gray-500 hover:bg-white/5 border border-transparent"
              }`}
            >
              {s === "all" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Ticket className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-xs">Nenhum ticket</p>
            </div>
          ) : (
            filteredTickets.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`w-full text-left px-3 py-3 border-b border-white/5 transition-colors ${
                  selectedTicket?.id === t.id ? "bg-orange-500/10" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_STYLES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{t.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-600">{t.sender_name}</span>
                  <span className="text-[10px] text-gray-700">·</span>
                  <span className="text-[10px] text-gray-600">{new Date(t.created_date).toLocaleDateString("pt-BR")}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT — ticket detail */}
      <div className={`flex-1 flex flex-col min-h-0 ${selectedTicket ? "flex" : "hidden sm:flex"}`}>
        {!selectedTicket ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Ticket className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Selecione um ticket para ver os detalhes</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
              <button onClick={() => setSelectedTicket(null)} className="sm:hidden p-1 rounded-lg hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{selectedTicket.subject}</p>
                <p className="text-xs text-gray-500">
                  {selectedTicket.sender_name} · {selectedTicket.sender_role === "tutor" ? "Tutor" : "Aluno"} · {new Date(selectedTicket.created_date).toLocaleString("pt-BR")}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_STYLES[selectedTicket.status]}`}>
                {STATUS_LABELS[selectedTicket.status]}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
              {/* Original message */}
              <div className="rounded-2xl p-4 bg-white border border-black/10 text-black rounded-bl-sm">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Mensagem do usuário</p>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Admin reply (first reply, stored in admin_reply field) */}
              {selectedTicket.admin_reply && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm">
                    <p className="text-xs font-semibold text-orange-100/70 mb-1">Resposta do suporte</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                    {selectedTicket.replied_at && (
                      <p className="text-[10px] mt-1 text-orange-100/70">
                        {new Date(selectedTicket.replied_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Subsequent replies (SupportTicketReply entity) */}
              {replies.map(r => (
                <div key={r.id} className={`flex ${r.is_from_admin ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        r.is_from_admin
                          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm"
                          : "bg-white border border-black/10 text-black rounded-bl-sm"
                      }`}
                    >
                      {r.message}
                    </div>
                    <p className={`text-[10px] mt-1 ${r.is_from_admin ? "text-orange-100/70 text-right" : "text-gray-600"}`}>
                      {r.is_from_admin ? "Suporte" : r.sender_name} · {new Date(r.created_date).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply form */}
            {selectedTicket.status !== "closed" && (
              <div className="p-3 border-t border-white/5 shrink-0 space-y-2">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 resize-none max-h-32"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={handleClose}
                    disabled={actionLoading}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-400 hover:bg-white/5 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Marcar como resolvido
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={replying || !reply.trim()}
                    className="text-xs font-medium px-4 py-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {replying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Enviar resposta
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}