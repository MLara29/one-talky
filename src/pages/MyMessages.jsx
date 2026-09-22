import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare, Clock, CheckCircle, Send, Plus, X, Loader2, Ticket, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_STYLES = {
  open: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  replied: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  closed: "bg-gray-500/10 border-gray-500/20 text-gray-500",
};
const STATUS_LABELS = { open: "Open", replied: "Replied", closed: "Closed" };

export default function MyMessages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "ticket" ? "ticket" : "chat");

  // Chat state
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Ticket state
  const [tickets, setTickets] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState(null);

  // Window timer: re-evaluate every 60 seconds
  const [now, setNow] = useState(Date.now());

  // Mark support notifications (link starts with /my-messages) as read
  const markSupportNotifsRead = async () => {
    try {
      const notifs = await base44.entities.Notification.filter({ user_id: user.id, is_read: false });
      const supportNotifs = notifs.filter(n => n.link?.startsWith("/my-messages"));
      await Promise.all(supportNotifs.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    } catch {}
  };

  useEffect(() => { load(); markSupportNotifsRead(); }, [user]);

  // Re-evaluate window active status every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Realtime: reload when new messages or ticket replies arrive
  useEffect(() => {
    if (!user?.id) return;
    const unsubChat = base44.entities.SupportChatMessage.subscribe((event) => {
      if (event?.data?.user_id === user.id) { load(); markSupportNotifsRead(); }
    });
    const unsubTicket = base44.entities.SupportMessage.subscribe((event) => {
      if (event?.data?.sender_id === user.id) { load(); markSupportNotifsRead(); }
    });
    return () => { unsubChat(); unsubTicket(); };
  }, [user?.id]);

  const load = async () => {
    try {
      const [chat, supportMsgs] = await Promise.all([
        base44.entities.SupportChatMessage.filter({ user_id: user.id }, "-created_date", 100),
        base44.entities.SupportMessage.filter({ sender_id: user.id }, "-created_date", 50),
      ]);
      setMessages(chat.slice().reverse());
      setTickets(supportMsgs);
    } catch {} finally { setLoading(false); }
  };

  // Chat send
  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await base44.entities.SupportChatMessage.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_role: user.role === "tutor" ? "tutor" : "student",
      is_from_admin: false,
      sender_name: user.full_name || user.email,
      message: message.trim(),
      is_read_by_admin: false,
    });
    try {
      const admins = await base44.entities.User.filter({ role: "admin" });
      await base44.entities.Notification.bulkCreate(
        admins.map(a => ({
          user_id: a.id,
          title: `💬 Nova mensagem de suporte`,
          message: `${user.full_name || user.email} (${user.role === "tutor" ? "tutor" : "student"}) enviou uma mensagem de suporte.`,
          type: "general",
          is_read: false,
          link: "/admin/support",
        }))
      );
    } catch {}
    setSending(false);
    setMessage("");
    setShowForm(false);
    load();
  };

  // Ticket send
  const handleTicketSend = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketSending(true);
    try {
      await base44.entities.SupportMessage.create({
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role === "tutor" ? "tutor" : "student",
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });
      try {
        const admins = await base44.entities.User.filter({ role: "admin" });
        await base44.entities.Notification.bulkCreate(
          admins.map(a => ({
            user_id: a.id,
            title: `🎫 Novo ticket: ${ticketSubject.trim()}`,
            message: `${user.full_name || user.email} abriu um ticket de suporte`,
            type: "general",
            is_read: false,
            link: "/admin/support",
          }))
        );
      } catch {}
      setTicketSending(false);
      setTicketSent(true);
      setTicketSubject("");
      setTicketMessage("");
      load();
    } catch (e) {
      console.error("[MyMessages] ticket", e);
      setTicketSending(false);
    }
  };

  // Chat window: active if last message < 30 min ago
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isWindowActive = lastMessage && (now - new Date(lastMessage.created_date).getTime()) < 30 * 60 * 1000;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold">My Messages</h1>
          <p className="theme-subtext text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
            Chat with support or open a support ticket
          </p>
        </div>
        {tab === "chat" && !isWindowActive && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> New message
          </Button>
        )}
        {tab === "ticket" && (
          <Button
            onClick={() => { setShowTicketForm(true); setTicketSent(false); }}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> New ticket
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "chat"
              ? "bg-orange-500/20 border-orange-500/30 text-orange-500"
              : "border-transparent text-gray-400 hover:bg-white/5"
          }`}
          style={{ background: tab === "chat" ? undefined : "var(--app-card-bg)" }}
        >
          <MessageSquare className="w-4 h-4" />
          Instant Message
        </button>
        <button
          onClick={() => setTab("ticket")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "ticket"
              ? "bg-orange-500/20 border-orange-500/30 text-orange-500"
              : "border-transparent text-gray-400 hover:bg-white/5"
          }`}
          style={{ background: tab === "ticket" ? undefined : "var(--app-card-bg)" }}
        >
          <Ticket className="w-4 h-4" />
          Ticket
          {tickets.filter(t => t.status === "replied").length > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {tickets.filter(t => t.status === "replied").length}
            </span>
          )}
        </button>
      </div>

      {/* === CHAT TAB === */}
      {tab === "chat" && (
        messages.length === 0 && !showForm ? (
          <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
            <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
            <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>No messages yet</h3>
            <p className="text-sm mb-4" style={{ color: "var(--app-text-secondary)" }}>
              Start a conversation with our support team.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" /> New message
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
            {/* Messages */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_from_admin ? "justify-start" : "justify-end"}`}>
                  <div className="max-w-[80%]">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
                      style={
                        msg.is_from_admin
                          ? { background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }
                          : { background: "#F26A1B", color: "#fff" }
                      }
                    >
                      {msg.message}
                    </div>
                    <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "var(--app-text-muted)" }}>
                      {msg.is_from_admin ? "Support" : "You"} · {new Date(msg.created_date).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply area */}
            <div className="p-3 border-t" style={{ borderColor: "var(--app-border)" }}>
              {isWindowActive ? (
                <div className="flex items-end gap-2">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none max-h-32"
                    style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0 hover:opacity-90 transition-opacity"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              ) : showForm ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Describe your issue or question..."
                    rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                    style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => { setShowForm(false); setMessage(""); }}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: "var(--app-text-secondary)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                      className="text-xs font-medium px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send message
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--app-text-secondary)" }}>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Conversation ended — start a new one if you need more help.
                  </div>
                  <Button
                    onClick={() => { setShowForm(true); setMessage(""); }}
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> New message
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* === TICKET TAB === */}
      {tab === "ticket" && showTicketForm && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base" style={{ color: "var(--app-text-primary)" }}>Open a Ticket</h2>
            <button onClick={() => { setShowTicketForm(false); setTicketSent(false); }} style={{ color: "var(--app-text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          {ticketSent ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold mb-1" style={{ color: "var(--app-text-primary)" }}>Ticket opened!</p>
              <p className="text-sm mb-4" style={{ color: "var(--app-text-secondary)" }}>Our team will review and reply soon.</p>
              <Button size="sm" onClick={() => { setShowTicketForm(false); setTicketSent(false); }} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--app-text-secondary)" }}>Subject</label>
                <Input
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="e.g. Payment issue"
                  style={{ background: "var(--app-nav-hover-bg)", borderColor: "var(--app-border)", color: "var(--app-text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--app-text-secondary)" }}>Message</label>
                <textarea
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={4}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                  style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                />
              </div>
              <Button
                onClick={handleTicketSend}
                disabled={ticketSending || !ticketSubject.trim() || !ticketMessage.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
              >
                <Send className="w-4 h-4 mr-2" />
                {ticketSending ? "Sending..." : "Open ticket"}
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === "ticket" && (
        tickets.length === 0 ? (
          <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
            <Ticket className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
            <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>No tickets yet</h3>
            <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
              Open a ticket when you need async support.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
                <button
                  onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}
                  className="w-full text-left flex items-center justify-between gap-4 p-4 transition-colors"
                  style={{ color: "var(--app-text-primary)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(242,106,27,0.1)", border: "1px solid rgba(242,106,27,0.2)" }}>
                      <Ticket className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--app-text-primary)" }}>{t.subject}</p>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
                        <Clock className="w-3 h-3" />
                        {new Date(t.created_date).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.status === "replied" && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Nova resposta" />
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    {expandedTicket === t.id
                      ? <ChevronUp className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                    }
                  </div>
                </button>

                {expandedTicket === t.id && (
                  <div className="px-4 pb-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--app-border)" }}>
                    <div className="rounded-xl p-3" style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)" }}>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--app-text-secondary)" }}>Your message</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--app-text-primary)" }}>{t.message}</p>
                    </div>
                    {t.admin_reply ? (
                      <div className="rounded-xl p-3" style={{ background: "rgba(242,106,27,0.08)", border: "1px solid rgba(242,106,27,0.2)" }}>
                        <p className="text-xs font-semibold text-orange-400 mb-1.5">Support Reply</p>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--app-text-primary)" }}>{t.admin_reply}</p>
                        {t.replied_at && (
                          <p className="text-[10px] mt-2" style={{ color: "var(--app-text-secondary)" }}>
                            {new Date(t.replied_at).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl p-3 text-center" style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)" }}>
                        <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
                          {t.status === "closed" ? "Ticket closed without reply." : "Waiting for a reply from the support team..."}
                        </p>
                      </div>
                    )}
                    {t.status === "closed" && (
                      <p className="text-xs flex items-center gap-1" style={{ color: "var(--app-text-secondary)" }}>
                        <CheckCircle className="w-3 h-3" /> Ticket closed
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}