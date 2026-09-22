import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { safeSubscribe } from "@/lib/safeSubscribe";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function NotificationBell() {
  const { user } = useAuth();
  const { lang: studentLang } = useLang();
  const navigate = useNavigate();
  const lang = user?.role === "tutor" ? "en" : user?.role === "student" ? (studentLang || "en") : "pt_br";
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const load = async () => {
    if (!user?.id) return;
    try {
      const data = await base44.entities.Notification.filter(
        { user_id: user.id, is_read: false },
        "-created_date",
        20
      );
      setNotifications(data);
    } catch {}
  };

  useEffect(() => {
    load();
    return safeSubscribe(() => base44.entities.Notification.subscribe((event) => {
      if (event?.data?.user_id === user?.id) load();
    }));
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    try {
      await base44.entities.Notification.updateMany(
        { user_id: user.id, is_read: false },
        { $set: { is_read: true } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const markRead = async (n) => {
    if (!n.is_read) {
      try {
        await base44.entities.Notification.update(n.id, { is_read: true });
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        // Remove from list after 1 minute
        setTimeout(() => {
          setNotifications(prev => prev.filter(x => x.id !== n.id));
        }, 60000);
      } catch {}
    }
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t(lang, "justNow");
    if (diffMins < 60) return `${diffMins}${t(lang, "minAgo")}`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}${t(lang, "hAgo")}`;
    return d.toLocaleDateString(lang === "en" ? "en-US" : "pt-BR");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: "var(--app-text-secondary)" }}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: "var(--app-sidebar-bg)", border: "1px solid var(--app-border)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--app-border)" }}
          >
            <span className="font-semibold text-sm" style={{ color: "var(--app-text-primary)" }}>
              {t(lang, "notifications")}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium"
                style={{ color: "#F26A1B" }}
              >
                {t(lang, "markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--app-text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--app-text-secondary)" }}>{t(lang, "noNotifications")}</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                  style={{ borderBottom: "1px solid var(--app-border)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: n.is_read ? "transparent" : "#ef4444" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: n.is_read ? "var(--app-text-secondary)" : "var(--app-text-primary)" }}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--app-text-secondary)" }}>
                      {n.message}
                    </p>
                    {n.type === "general" && n.message && n.message.length > 100 && (
                      <span className="text-[11px] font-medium mt-1 inline-block" style={{ color: "#F26A1B" }}>
                        {lang === "pt_br" ? "Ver mensagem completa" : "View full message"}
                      </span>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: "var(--app-text-muted)" }}>
                      {formatTime(n.created_date)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}