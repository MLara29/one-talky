import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Search, MessageSquare, Users, GraduationCap, Loader2, ArrowLeft, Sparkles, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import SupportAIAssistant from "@/components/admin/SupportAIAssistant";
import SupportTicketsPanel from "@/components/admin/SupportTicketsPanel";

const timeAgo = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const Avatar = ({ name, photoUrl, role }) => {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  const bg = role === "tutor" ? "bg-blue-500/15 text-blue-300 border-blue-500/20" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${bg}`}>
      {initial}
    </div>
  );
};

export default function AdminSupport() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState("tutor");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [profilesMap, setProfilesMap] = useState({});
  const [showAI, setShowAI] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [viewMode, setViewMode] = useState("chat"); // "chat" | "tickets"
  const scrollRef = useRef(null);

  const load = async () => {
    try {
      const data = await base44.entities.SupportChatMessage.list("-created_date", 500);
      setMessages(data);
      // Load profiles for avatars/names
      const [tutors, students] = await Promise.all([
        base44.entities.TutorProfile.list("-created_date", 500),
        base44.entities.StudentProfile.list("-created_date", 500),
      ]);
      const map = {};
      tutors.forEach(p => { map[p.user_id] = { ...p, _role: "tutor" }; });
      students.forEach(p => { map[p.user_id] = { ...p, _role: "student" }; });
      setProfilesMap(map);
    } catch (e) {
      console.error("[AdminSupport] load", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Realtime: refresh when new messages arrive
  useEffect(() => {
    const unsub = base44.entities.SupportChatMessage.subscribe(() => { load(); });
    return unsub;
  }, []);

  // Group messages by user_id into conversations
  const conversations = useMemo(() => {
    const map = {};
    const sorted = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    sorted.forEach(m => {
      if (!map[m.user_id]) {
        map[m.user_id] = {
          user_id: m.user_id,
          user_name: m.user_name || profilesMap[m.user_id]?.full_name || "Usuário",
          user_role: m.user_role,
          messages: [],
          unreadCount: 0,
          lastMessageAt: null,
          lastMessage: null,
        };
      }
      map[m.user_id].messages.push(m);
      if (!m.is_from_admin && !m.is_read_by_admin) map[m.user_id].unreadCount++;
      if (!map[m.user_id].lastMessageAt || new Date(m.created_date) > new Date(map[m.user_id].lastMessageAt)) {
        map[m.user_id].lastMessageAt = m.created_date;
        map[m.user_id].lastMessage = m;
      }
    });
    return Object.values(map).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }, [messages, profilesMap]);

  const filteredConversations = conversations.filter(c => {
    if (c.user_role !== roleFilter) return false;
    if (search) return c.user_name?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const allProfilesForRole = useMemo(() => {
    return Object.values(profilesMap)
      .filter(p => p && p.user_id && p.full_name && p._role === roleFilter)
      .filter(p => !newChatSearch || p.full_name?.toLowerCase().includes(newChatSearch.toLowerCase()))
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profilesMap, roleFilter, newChatSearch]);

  const selectedConversation = conversations.find(c => c.user_id === selectedUserId) ||
    (selectedUserId && profilesMap[selectedUserId] ? {
      user_id: selectedUserId,
      user_name: profilesMap[selectedUserId].full_name || "Usuário",
      user_role: profilesMap[selectedUserId]._role || roleFilter,
      messages: [],
      unreadCount: 0,
      lastMessageAt: null,
      lastMessage: null,
    } : null);
  const unreadByRole = {
    tutor: conversations.filter(c => c.user_role === "tutor").reduce((s, c) => s + c.unreadCount, 0),
    student: conversations.filter(c => c.user_role === "student").reduce((s, c) => s + c.unreadCount, 0),
  };

  const selectConversation = async (userId) => {
    setSelectedUserId(userId);
    setDraft("");
    setShowAI(false);
    setShowNewChat(false);
    const conv = conversations.find(c => c.user_id === userId);
    if (conv && conv.unreadCount > 0) {
      try {
        await base44.functions.invoke("markChatReadByAdmin", { user_id: userId });
        setMessages(prev => prev.map(m =>
          m.user_id === userId && !m.is_from_admin ? { ...m, is_read_by_admin: true } : m
        ));
      } catch (e) { console.error(e); }
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedUserId, selectedConversation?.messages.length]);

  const sendMessage = async () => {
    if (!draft.trim() || !selectedConversation) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke("adminSendChatMessage", {
        user_id: selectedConversation.user_id,
        user_name: selectedConversation.user_name,
        user_role: selectedConversation.user_role,
        message: draft.trim(),
      });
      if (res.data?.error === "otp_required") {
        toast({ title: "Confirmação 2FA necessária", description: "Verifique seu código de autenticação para enviar mensagens.", variant: "destructive" });
        return;
      }
      if (res.data?.error) throw new Error(res.data.error);
      setDraft("");
      load();
    } catch (e) {
      toast({ title: "Erro", description: e?.message || "Não foi possível enviar", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const [togglingChat, setTogglingChat] = useState(false);
  const toggleInstantChat = async (userId, enable) => {
    setTogglingChat(true);
    try {
      const res = await base44.functions.invoke("adminToggleInstantChat", { user_id: userId, enabled: enable });
      if (res.data?.error === "otp_required") {
        toast({ title: "Confirmação 2FA necessária", description: "Verifique seu código de autenticação.", variant: "destructive" });
        return;
      }
      if (res.data?.error) throw new Error(res.data.error);
      setProfilesMap(prev => ({
        ...prev,
        [userId]: { ...prev[userId], instant_chat_enabled: enable },
      }));
      toast({ title: enable ? "Chat liberado" : "Chat desativado", description: enable ? "O aluno agora vê a aba Mensagem Instantânea." : "O aluno não vê mais a aba Mensagem Instantânea." });
    } catch (e) {
      toast({ title: "Erro", description: e?.message || "Não foi possível alterar", variant: "destructive" });
    } finally {
      setTogglingChat(false);
    }
  };

  const lastIncomingMessage = useMemo(() => {
    if (!selectedConversation) return null;
    for (let i = selectedConversation.messages.length - 1; i >= 0; i--) {
      if (!selectedConversation.messages[i].is_from_admin) {
        return selectedConversation.messages[i].message;
      }
    }
    return null;
  }, [selectedConversation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] min-h-[500px]">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Suporte</h1>
          <p className="text-gray-500 text-xs mt-0.5">{viewMode === "chat" ? `${unreadByRole.tutor + unreadByRole.student} não lida(s)` : "Tickets de suporte"}</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setViewMode("chat")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === "chat" ? "bg-orange-500/20 text-orange-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            Chat
          </button>
          <button
            onClick={() => setViewMode("tickets")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === "tickets" ? "bg-orange-500/20 text-orange-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            Tickets
          </button>
        </div>
      </div>

      {viewMode === "tickets" ? (
        <SupportTicketsPanel />
      ) : (
      <div className="flex-1 flex gap-3 min-h-0 border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
        {/* LEFT COLUMN — conversation list */}
        <div className={`w-full sm:w-80 border-r border-white/10 flex flex-col min-h-0 shrink-0 ${selectedUserId ? "hidden sm:flex" : "flex"}`}>
          {/* Role tabs */}
          <div className="flex gap-1 p-2 shrink-0 border-b border-white/5">
            <button
              onClick={() => setRoleFilter("tutor")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                roleFilter === "tutor" ? "bg-blue-500/15 text-blue-300 border border-blue-500/20" : "text-gray-500 hover:bg-white/5 border border-transparent"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Tutores
              {unreadByRole.tutor > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadByRole.tutor}</span>}
            </button>
            <button
              onClick={() => setRoleFilter("student")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                roleFilter === "student" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "text-gray-500 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Alunos
              {unreadByRole.student > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadByRole.student}</span>}
            </button>
          </div>

          {/* Search */}
          <div className="relative p-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pl-8 pr-8 h-8 text-xs"
            />
            <button
              onClick={() => { setShowNewChat(true); setNewChatSearch(""); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors"
              title="Nova conversa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {showNewChat ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
                  <button onClick={() => setShowNewChat(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Input
                    autoFocus
                    value={newChatSearch}
                    onChange={e => setNewChatSearch(e.target.value)}
                    placeholder={`Buscar ${roleFilter === "tutor" ? "tutor" : "aluno"}...`}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-8 text-xs flex-1"
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {allProfilesForRole.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-600 text-xs">Nenhum {roleFilter === "tutor" ? "tutor" : "aluno"} encontrado</p>
                    </div>
                  ) : (
                    allProfilesForRole.map(p => (
                      <button
                        key={p.user_id}
                        onClick={() => selectConversation(p.user_id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 border-b border-white/5 transition-colors"
                      >
                        <Avatar name={p.full_name} photoUrl={p.photo_url} role={roleFilter} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.full_name}</p>
                          <p className="text-xs text-gray-600">
                            {conversations.find(c => c.user_id === p.user_id) ? "Continuar conversa" : "Iniciar nova conversa"}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-xs">Nenhuma conversa {roleFilter === "tutor" ? "de tutor" : "de aluno"}</p>
              </div>
            ) : (
              filteredConversations.map(c => {
                const profile = profilesMap[c.user_id];
                const photoUrl = profile?.photo_url;
                const isActive = c.user_id === selectedUserId;
                return (
                  <button
                    key={c.user_id}
                    onClick={() => selectConversation(c.user_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-white/5 ${
                      isActive ? "bg-orange-500/10" : "hover:bg-white/5"
                    }`}
                  >
                    <Avatar name={c.user_name} photoUrl={photoUrl} role={c.user_role} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${c.unreadCount > 0 ? "text-white" : "text-gray-400"}`}>{c.user_name}</p>
                        <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${c.unreadCount > 0 ? "text-gray-300" : "text-gray-600"}`}>
                          {c.lastMessage?.is_from_admin ? "Você: " : ""}{c.lastMessage?.message}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL — chat */}
        <div className={`flex-1 flex flex-col min-h-0 ${selectedUserId ? "flex" : "hidden sm:flex"}`}>
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
                <button onClick={() => setSelectedUserId(null)} className="sm:hidden p-1 rounded-lg hover:bg-white/10 text-gray-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar name={selectedConversation.user_name} photoUrl={profilesMap[selectedConversation.user_id]?.photo_url} role={selectedConversation.user_role} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{selectedConversation.user_name}</p>
                  <p className={`text-xs ${selectedConversation.user_role === "tutor" ? "text-blue-400" : "text-emerald-400"}`}>
                    {selectedConversation.user_role === "tutor" ? "Tutor" : "Aluno"}
                  </p>
                </div>
                {selectedConversation.user_role === "student" && (
                  <button
                    onClick={() => toggleInstantChat(selectedConversation.user_id, !profilesMap[selectedConversation.user_id]?.instant_chat_enabled)}
                    disabled={togglingChat}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border whitespace-nowrap ${
                      profilesMap[selectedConversation.user_id]?.instant_chat_enabled
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 border-transparent"
                    }`}
                  >
                    {togglingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {profilesMap[selectedConversation.user_id]?.instant_chat_enabled ? "Chat liberado ✓" : "Liberar chat"}
                  </button>
                )}
                <button
                  onClick={() => setShowAI(s => !s)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    showAI ? "bg-violet-500/15 text-violet-300 border border-violet-500/20" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> IA
                </button>
              </div>

              {/* Chat history */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-2">
                {selectedConversation.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-gray-600 text-sm">Nenhuma mensagem ainda. Envie a primeira!</p>
                  </div>
                ) : selectedConversation.messages.map(m => (
                  <div key={m.id} className={`flex ${m.is_from_admin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                      m.is_from_admin
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm"
                        : "bg-white border border-black/10 text-black rounded-bl-sm"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                      <p className={`text-[10px] mt-1 ${m.is_from_admin ? "text-orange-100/70" : "text-gray-500"}`}>
                        {new Date(m.created_date).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Assistant */}
              {showAI && (
                <SupportAIAssistant
                  lastIncomingMessage={lastIncomingMessage}
                  draft={draft}
                  setDraft={setDraft}
                  userRole={selectedConversation.user_role}
                />
              )}

              {/* Input */}
              <div className="p-3 border-t border-white/5 shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                    rows={1}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 resize-none max-h-32"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0 hover:opacity-90 transition-opacity"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}