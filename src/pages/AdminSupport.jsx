import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Clock, CheckCircle, XCircle, Send, ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_STYLES = {
  open: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  replied: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  closed: "bg-gray-500/10 border-gray-500/20 text-gray-400",
};

const STATUS_LABELS = { open: "Aberto", replied: "Respondido", closed: "Encerrado" };

export default function AdminSupport() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [sending, setSending] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [data, profilesMapLoaded] = await Promise.all([
        base44.entities.SupportMessage.list("-created_date", 100),
        loadProfilesMap(),
      ]);
      setMessages(data);
      setProfilesMap(profilesMapLoaded);
    } finally {
      setLoading(false);
    }
  };

  const loadProfilesMap = async () => {
    const [tutors, students] = await Promise.all([
      base44.entities.TutorProfile.list("-created_date", 500),
      base44.entities.StudentProfile.list("-created_date", 500),
    ]);
    const map = {};
    [...tutors, ...students].forEach(p => { map[p.user_id] = p.full_name; });
    return map;
  };

  const displayName = (msg) => profilesMap[msg.sender_id] || msg.sender_name;

  const sendReply = async (msg) => {
    const reply = replyText[msg.id]?.trim();
    if (!reply) return;
    setSending(msg.id);
    try {
      const response = await base44.functions.invoke("adminReplySupportTicket", { message_id: msg.id, action: "reply", reply });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Resposta enviada!" });
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

  const deleteMessage = async (id) => {
    if (!confirm("Excluir esta mensagem permanentemente?")) return;
    const response = await base44.functions.invoke("adminReplySupportTicket", { message_id: id, action: "delete" });
    if (response.data?.error) {
      toast({ title: "Erro", description: response.data.error, variant: "destructive" });
      return;
    }
    load();
  };

  const filteredMessages = messages.filter(m => {
    const q = search.toLowerCase();
    if (!q) return true;
    return displayName(m)?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q);
  });

  const activeMessages = filteredMessages.filter(m => m.status !== "closed");
  const closedMessages = filteredMessages.filter(m => m.status === "closed");

  const counts = { open: messages.filter(m => m.status === "open").length, total: messages.length };

  const renderMessage = (msg) => (
    <div key={msg.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="w-full flex items-center justify-between gap-4 p-4">
        <button
          onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
          className="flex-1 text-left flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{msg.subject}</p>
            <p className="text-gray-500 text-xs">{displayName(msg)} · <span className="capitalize">{msg.sender_role}</span></p>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[msg.status]}`}>
            {STATUS_LABELS[msg.status]}
          </span>
          {msg.status !== "closed" && (
            <button
              onClick={() => closeTicket(msg.id)}
              title="Marcar como resolvido e mover para o histórico"
              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => deleteMessage(msg.id)} title="Excluir mensagem" className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(expanded === msg.id ? null : msg.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors">
            {expanded === msg.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded === msg.id && (
        <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
          <div className="bg-white/3 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(msg.created_date).toLocaleString("pt-BR")}</p>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.message}</p>
          </div>

          {msg.admin_reply && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
              <p className="text-xs text-orange-400 mb-1 font-semibold">Sua resposta</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.admin_reply}</p>
            </div>
          )}

          {msg.status !== "closed" && (
            <div className="flex gap-2">
              <textarea
                value={replyText[msg.id] || ""}
                onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                placeholder="Escreva uma resposta..."
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
                  title="Encerrar chamado"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {msg.status === "closed" && (
            <p className="text-xs text-gray-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Chamado encerrado</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Suporte</h1>
          <p className="text-gray-500 text-sm mt-1">{counts.open} aberto(s) · {counts.total} total</p>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou assunto..."
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-white/5 bg-white/3">
          <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Nenhuma mensagem de suporte</p>
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Ativos ({activeMessages.length})</TabsTrigger>
            <TabsTrigger value="history">Histórico ({closedMessages.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {activeMessages.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-16">Nenhuma mensagem ativa</p>
            ) : (
              <div className="space-y-3">{activeMessages.map(renderMessage)}</div>
            )}
          </TabsContent>
          <TabsContent value="history">
            {closedMessages.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-16">Nenhuma mensagem no histórico</p>
            ) : (
              <div className="space-y-3">{closedMessages.map(renderMessage)}</div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}