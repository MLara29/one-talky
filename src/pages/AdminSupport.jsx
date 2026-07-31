import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, CheckCircle, XCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_STYLES = {
  open: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  replied: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  closed: "bg-gray-500/10 border-gray-500/20 text-gray-400",
};

const STATUS_LABELS = { open: "Open", replied: "Replied", closed: "Closed" };

export default function AdminSupport() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [sending, setSending] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.SupportMessage.list("-created_date", 100);
    setMessages(data);
    setLoading(false);
  };

  const sendReply = async (msg) => {
    const reply = replyText[msg.id]?.trim();
    if (!reply) return;
    setSending(msg.id);
    try {
      const response = await base44.functions.invoke("adminReplySupportTicket", { message_id: msg.id, action: "reply", reply });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Reply sent!" });
      setReplyText(prev => ({ ...prev, [msg.id]: "" }));
      load();
    } catch (e) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const closeTicket = async (id) => {
    const response = await base44.functions.invoke("adminReplySupportTicket", { message_id: id, action: "close" });
    if (response.data?.error) {
      toast({ title: "Erro", description: response.data.error, variant: "destructive" });
      return;
    }
    load();
  };

  const counts = { open: messages.filter(m => m.status === "open").length, total: messages.length };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Support</h1>
          <p className="text-gray-500 text-sm mt-1">{counts.open} open · {counts.total} total</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-white/5 bg-white/3">
          <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No support messages</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                className="w-full text-left flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{msg.subject}</p>
                    <p className="text-gray-500 text-xs">{msg.sender_name} · <span className="capitalize">{msg.sender_role}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[msg.status]}`}>
                    {STATUS_LABELS[msg.status]}
                  </span>
                  {expanded === msg.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </button>

              {expanded === msg.id && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  <div className="bg-white/3 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(msg.created_date).toLocaleString("pt-BR")}</p>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  {msg.admin_reply && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                      <p className="text-xs text-orange-400 mb-1 font-semibold">Your reply</p>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.admin_reply}</p>
                    </div>
                  )}

                  {msg.status !== "closed" && (
                    <div className="flex gap-2">
                      <textarea
                        value={replyText[msg.id] || ""}
                        onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        rows={3}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 resize-none"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => sendReply(msg)}
                          disabled={sending === msg.id || !replyText[msg.id]?.trim()}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => closeTicket(msg.id)}
                          className="border border-gray-500/20 text-gray-500 hover:text-gray-300"
                          title="Close ticket"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {msg.status === "closed" && (
                    <p className="text-xs text-gray-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ticket closed</p>
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