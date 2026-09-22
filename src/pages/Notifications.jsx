import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { Bell, Check, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const L = {
  en: {
    title: "Notifications",
    subtitle: "Announcements and messages from the support team",
    clearAll: "Clear all",
    allClear: "All clear!",
    noNotifications: "No notifications yet",
    locale: "en-US",
  },
  pt_br: {
    title: "Notificações",
    subtitle: "Avisos e mensagens da equipe de suporte",
    clearAll: "Limpar tudo",
    allClear: "Tudo certo!",
    noNotifications: "Nenhuma notificação ainda",
    locale: "pt-BR",
  },
  pt_pt: {
    title: "Notificações",
    subtitle: "Avisos e mensagens da equipa de suporte",
    clearAll: "Limpar tudo",
    allClear: "Tudo certo!",
    noNotifications: "Nenhuma notificação ainda",
    locale: "pt-PT",
  },
  es: {
    title: "Notificaciones",
    subtitle: "Anuncios y mensajes del equipo de soporte",
    clearAll: "Borrar todo",
    allClear: "¡Todo claro!",
    noNotifications: "Sin notificaciones aún",
    locale: "es-ES",
  },
  fr: {
    title: "Notifications",
    subtitle: "Annonces et messages de l'équipe de support",
    clearAll: "Tout effacer",
    allClear: "Tout est clair !",
    noNotifications: "Aucune notification",
    locale: "fr-FR",
  },
  de: {
    title: "Benachrichtigungen",
    subtitle: "Ankündigungen und Nachrichten vom Support-Team",
    clearAll: "Alle löschen",
    allClear: "Alles erledigt!",
    noNotifications: "Noch keine Benachrichtigungen",
    locale: "de-DE",
  },
  it: {
    title: "Notifiche",
    subtitle: "Annunci e messaggi dal team di supporto",
    clearAll: "Cancella tutto",
    allClear: "Tutto chiaro!",
    noNotifications: "Nessuna notifica ancora",
    locale: "it-IT",
  },
  ja: {
    title: "通知",
    subtitle: "サポートチームからのお知らせとメッセージ",
    clearAll: "すべて削除",
    allClear: "すべて確認済み！",
    noNotifications: "通知はまだありません",
    locale: "ja-JP",
  },
  ko: {
    title: "알림",
    subtitle: "지원팀의 공지 및 메시지",
    clearAll: "모두 삭제",
    allClear: "모두 확인했습니다!",
    noNotifications: "아직 알림이 없습니다",
    locale: "ko-KR",
  },
};

export default function Notifications() {
  const { user } = useAuth();
  const { lang } = useLang();
  const tr = L[lang] || L.en;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold">{tr.title}</h1>
          <p className="theme-subtext text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
            {tr.subtitle}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-400 shrink-0"
          >
            <Trash2 className="w-3 h-3" /> {tr.clearAll}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
          <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
          <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>{tr.allClear}</h3>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>{tr.noNotifications}</p>
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
                    {new Date(n.created_date).toLocaleString(tr.locale)}
                  </p>
                </div>
                {!n.is_read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="shrink-0 text-orange-400 hover:text-orange-500 hover:bg-orange-500/10">
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}