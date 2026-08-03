export function safeSubscribe(subscribeFn) {
  let unsub;
  try {
    unsub = subscribeFn();
  } catch { /* realtime unavailable */ }
  return () => { if (typeof unsub === "function") unsub(); };
}