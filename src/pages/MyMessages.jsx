import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare, Clock, CheckCircle, Send, Plus, X, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";



export default function MyMessages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get("tab") === "admin" ? "admin" : "support"); // "support" | "admin"
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    try {
      const [chat, notifs] = await Promise.all([
        base44.entities.SupportChatMessage.filter({ user_id: user.id }, "-created_date", 100),
        base44.entities.Notification.filter({ user_id: user.id, link: "/my-messages" }, "-created_date", 50),
      ]);
      setMessages(chat.slice().reverse());
      setAdminMessages(notifs);
    } catch {} finally { setLoading(false); }
  };

  const markAdminMsgRead = async (n) => {
    if (!n.is_read) {
      await base44.entities.Notification.update(n.id, { is_read: true });
      setAdminMessages(prev => prev.map(a => a.id === n.id ? { ...a, is_read: true } : a));
    }
  };

  const deleteAdminMsg = async (id, e) => {
    e.stopPropagation();
    await base44.entities.Notification.delete(id);
    setAdminMessages(prev => prev.filter(n => n.id !== id));
  };

  const clearAllAdminMsgs = async () => {
    await Promise.all(adminMessages.map(n => base44.entities.Notification.delete(n.id)));
    setAdminMessages([]);
  };

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
    // Notify admins about new support message
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
    setSent(true);
    setMessage("");
    load();
  };

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
            Track your support messages and replies from our team
          </p>
        </div>
        {tab === "support" && (
          <Button
            onClick={() => { setShowForm(true); setSent(false); }}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> New message
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("support")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "support"
              ? "bg-orange-500/20 border-orange-500/30 text-orange-500"
              : "border-transparent text-gray-400 hover:bg-white/5"
          }`}
          style={{ background: tab === "support" ? undefined : "var(--app-card-bg)" }}
        >
          <MessageSquare className="w-4 h-4" />
          Support
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "admin"
              ? "bg-orange-500/20 border-orange-500/30 text-orange-500"
              : "border-transparent text-gray-400 hover:bg-white/5"
          }`}
          style={{ background: tab === "admin" ? undefined : "var(--app-card-bg)" }}
        >
          <Bell className="w-4 h-4" />
          From Support
          {adminMessages.filter(n => !n.is_read).length > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {adminMessages.filter(n => !n.is_read).length}
            </span>
          )}
        </button>
      </div>

      {showForm && tab === "support" && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base" style={{ color: "var(--app-text-primary)" }}>Contact Support</h2>
            <button onClick={() => { setShowForm(false); setSent(false); }} style={{ color: "var(--app-text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          {sent ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold mb-1" style={{ color: "var(--app-text-primary)" }}>Message sent!</p>
              <p className="text-sm mb-4" style={{ color: "var(--app-text-secondary)" }}>Our team will get back to you soon.</p>
              <Button size="sm" onClick={() => { setShowForm(false); setSent(false); }} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--app-text-secondary)" }}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={4}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                  style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending..." : "Send message"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Admin messages tab */}
      {tab === "admin" && (
        adminMessages.length === 0 ? (
          <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
            <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
            <h3 className="font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>No messages from support</h3>
            <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Messages sent directly by the platform team will appear here.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-3">
              <button
                onClick={clearAllAdminMsgs}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-400"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>
            <div className="space-y-3">
              {adminMessages.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAdminMsgRead(n)}
                  className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    background: n.is_read ? "var(--app-card-bg)" : "rgba(242,106,27,0.08)",
                    border: `1px solid ${n.is_read ? "var(--app-border)" : "rgba(242,106,27,0.25)"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(242,106,27,0.12)", border: "1px solid rgba(242,106,27,0.2)" }}>
                      <Bell className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm" style={{ color: n.is_read ? "var(--app-text-secondary)" : "var(--app-text-primary)" }}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                          <button
                            onClick={(e) => deleteAdminMsg(n.id, e)}
                            className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm mt-1.5 whitespace-pre-wrap" style={{ color: "var(--app-text-primary)" }}>{n.message}</p>
                      <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--app-text-muted)" }}>
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_date).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {tab === "support" && messages.length === 0 ? (
        <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
          <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
          <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>No messages yet</h3>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
            You haven't sent any support messages yet.
          </p>
        </div>
      ) : tab === "support" ? (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
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
      ) : null}
    </div>
  );
}