import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

export const TIMEOUT_BY_ROLE = {
  student:   40 * 60 * 1000, // 40 minutes
  tutor:     60 * 60 * 1000, // 60 minutes
  admin:     20 * 60 * 1000, // 20 minutes
  affiliate: 30 * 60 * 1000, // 30 minutes
};

// Persisted in localStorage (not just memory) so we can detect a stale
// session even after the browser/tab was fully closed and reopened later —
// see AuthContext.checkUserAuth, which compares this timestamp on load.
export const LAST_ACTIVITY_KEY = "ot_last_activity_at";

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function useInactivityLogout(role) {
  const timerRef = useRef(null);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!role) return;

    const timeout = TIMEOUT_BY_ROLE[role] ?? 40 * 60 * 1000;

    const markActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes — no need to persist on every mousemove
      if (now - lastWriteRef.current > 10000) {
        lastWriteRef.current = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      }
    };

    const reset = () => {
      markActivity();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Mark tutor offline BEFORE clearing the token — same reason as
        // AppLayout.handleLogout. The updateMyProfile call needs a valid
        // token; base44.auth.logout invalidates it immediately.
        const doLogout = () => {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          base44.auth.logout("/login");
        };
        if (role === "tutor") {
          base44.functions.invoke('updateMyProfile', {
            updates: { last_seen: new Date(0).toISOString(), is_available_now: false }
          }).catch(() => {}).then(doLogout);
        } else {
          doLogout();
        }
      }, timeout);
    };

    reset();
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));

    return () => {
      clearTimeout(timerRef.current);
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [role]);
}