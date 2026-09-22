import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Bell, Check, Trash2, Clock, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => { loadNotifications(); }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await base44.entities.Notification.filter(
        { user_id: user.id, link: "/notifications" },
        "-created_date",
        100
      );
      setNotifications(data);
    } catch {} finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const clearAll = async () => {
    await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
    setNotifications([]);
  };

  const handleReply = async (n) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await base44.entities.SupportChatMessage.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_role: user.role === "tutor" ? "tutor" : "student",
        is_from_admin: false,
        sender_name: user.full_name || user.email,
        message: replyText.trim(),
        is_read_by_admin: false,
      });
      try {
        const admins = await base44.entities.User.filter({ role: "admin" });
        await base44.entities.Notification.bulkCreate(
          admins.map(a => ({
            user_id: a.id,
            title: `💬 Resposta de ${user.full_name || user.email}`,
            message: replyText.trim().substring(0, 100),
            type: "general",
            is_read: false,
            link: "/admin/support",
          }))
        );
      } catch {}
      if (!n.is_read) await markRead(n.id);
      setReplyText("");
      setReplyingTo(null);
    } catch (e) {
      console.error("[Notifications] reply", e);
    } finally {
      setReplying(false);
    }
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
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold">Notifications</h1>
          <p className="theme-subtext text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
            Announcements and messages from the support team
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-400 shrink-0"
          >
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
          <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
          <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>All clear!</h3>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className="rounded-2xl p-4 transition-all"
              style={{
                background: n.is_read ? "var(--app-card-bg)" : "rgba(242,106,27,0.08)",
                border: `1px solid ${n.is_read ? "var(--app-border)" : "rgba(242,106,27,0.25)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />}
                    <p className="font-semibold text-sm" style={{ color: n.is_read ? "var(--app-text-secondary)" : "var(--app-text-primary)" }}>
                      {n.title}
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap mt-1.5" style={{ color: "var(--app-text-primary)" }}>{n.message}</p>
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--app-text-muted)" }}>
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_date).toLocaleString("pt-BR")}
                  </p>
                </div>
                {!n.is_read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="shrink-0 text-orange-400 hover:text-orange-500 hover:bg-orange-500/10">
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {/* Reply to support */}
              <div className="mt-3">
                {replyingTo === n.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Digite sua resposta para o suporte..."
                      rows={2}
                      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                      style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: "var(--app-text-secondary)" }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleReply(n)}
                        disabled={replying || !replyText.trim()}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {replying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Enviar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyingTo(n.id); setReplyText(""); if (!n.is_read) markRead(n.id); }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(242,106,27,0.08)", border: "1px solid rgba(242,106,27,0.2)", color: "#F26A1B" }}
                  >
                    <Send className="w-3 h-3" /> Responder
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}