// Normalizes an ISO datetime string to a minute-precision UTC key, e.g. "2026-07-01T10:00".
// Used to compare booked slots regardless of seconds/millis/timezone-offset formatting.
export function normalizeSlot(iso) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}