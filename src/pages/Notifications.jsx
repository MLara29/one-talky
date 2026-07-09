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
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-8">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
          <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="font-display font-bold text-white mb-1">All clear!</h3>
          <p className="text-sm text-gray-600">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`rounded-2xl border p-4 flex items-start justify-between gap-3 transition-all ${
              n.is_read ? "bg-white/3 border-white/5" : "bg-violet-500/10 border-violet-500/20"
            }`}>
              <div>
                <p className={`text-sm ${n.is_read ? "text-gray-500" : "text-white font-medium"}`}>{n.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-gray-700 mt-1">{new Date(n.created_date).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="shrink-0 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
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