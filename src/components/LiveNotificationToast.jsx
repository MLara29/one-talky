import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { X, Bell } from "lucide-react";

/**
 * LiveNotificationToast
 * - Polls for unread notifications every 8s
 * - Shows one pop-up at a time (queue) — no stacking
 * - Each toast auto-dismisses in 3s
 * - Has a close button
 */
export default function LiveNotificationToast() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);      // pending toasts
  const [current, setCurrent] = useState(null); // currently visible toast
  const [visible, setVisible] = useState(false);
  const seenIds = useRef(new Set());
  const timerRef = useRef(null);
  const lastCheck = useRef(Date.now());

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setCurrent(null), 300); // wait for fade-out animation
  }, []);

  // Show next queued toast whenever current is empty
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, 3000);
  }, [current, queue, dismiss]);

  // Poll notifications
  useEffect(() => {
    if (!user?.id) return;

    const poll = async () => {
      try {
        const since = new Date(lastCheck.current).toISOString();
        lastCheck.current = Date.now();
        const notifs = await base44.entities.Notification.filter({ user_id: user.id, is_read: false });
        const fresh = notifs.filter(n => {
          if (seenIds.current.has(n.id)) return false;
          // Only show notifications created after page load
          if (new Date(n.created_date) < new Date(since)) {
            seenIds.current.add(n.id); // mark old ones as seen so they don't flash later
            return false;
          }
          seenIds.current.add(n.id);
          return true;
        });
        if (fresh.length > 0) {
          setQueue(prev => [...prev, ...fresh.map(n => ({ id: n.id, title: n.title, message: n.message }))]);
        }
      } catch {}
    };

    // Don't poll immediately — wait 5s so page-load notifications aren't spammed
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [user?.id]);

  if (!current) return null;

  return (
    <div
      className="fixed bottom-20 lg:bottom-6 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)] transition-all duration-300"
      style={{
        transform: visible ? "translateY(0)" : "translateY(120%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-sm leading-tight">{current.title}</p>
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{current.message}</p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
            style={{ animation: "shrink-bar 3s linear forwards" }}
          />
        </div>
      </div>
      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}