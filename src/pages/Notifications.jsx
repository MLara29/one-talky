import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 50);
      setNotifications(data);
    } catch {} finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="theme-empty text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
          <Bell className="theme-muted-icon w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="theme-heading font-display font-bold text-white mb-1">All clear!</h3>
          <p className="theme-subtext text-sm text-gray-600">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`theme-card rounded-2xl border p-4 flex items-start justify-between gap-3 transition-all ${
              n.is_read ? "bg-white/3 border-white/5" : "bg-orange-500/10 border-orange-500/20"
            }`}>
              <div>
                <p className={`text-sm font-medium ${n.is_read ? "theme-subtext text-gray-500" : "theme-heading text-white"}`}>{n.title}</p>
                <p className="theme-subtext text-xs text-gray-500 mt-0.5">{n.message}</p>
                <p className="theme-subtext text-[10px] text-gray-500 mt-1">{new Date(n.created_date).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="shrink-0 text-orange-400 hover:text-orange-500 hover:bg-orange-500/10">
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}