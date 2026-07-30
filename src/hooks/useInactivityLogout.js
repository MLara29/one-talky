import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const TIMEOUT_BY_ROLE = {
  student:   40 * 60 * 1000, // 40 minutes
  tutor:     60 * 60 * 1000, // 60 minutes
  admin:     20 * 60 * 1000, // 20 minutes
  affiliate: 30 * 60 * 1000, // 30 minutes
};

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function useInactivityLogout(role) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!role) return;

    const timeout = TIMEOUT_BY_ROLE[role] ?? 40 * 60 * 1000;

    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        base44.auth.logout("/login");
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