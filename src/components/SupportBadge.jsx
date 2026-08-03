import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { safeSubscribe } from "@/lib/safeSubscribe";

// Counts unread admin notifications pointing at the support page — reuses the
// exact same realtime mechanism as NotificationBell.
export function useUnreadSupportCount(role, userId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (role !== "admin" || !userId) return;
    const load = async () => {
      try {
        const data = await base44.entities.Notification.filter(
          { user_id: userId, is_read: false, link: "/admin/support" },
          "-created_date",
          50
        );
        setCount(data.length);
      } catch {}
    };
    load();
    return safeSubscribe(() => base44.entities.Notification.subscribe((event) => {
      if (event?.data?.user_id === userId && event?.data?.link === "/admin/support") load();
    }));
  }, [role, userId]);

  return count;
}

export default function SupportBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}