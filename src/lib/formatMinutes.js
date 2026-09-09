// Formats a minutes value for display, rounding to the nearest integer minute
// (159.42 → "159", 37.22 → "37"). Use this everywhere credit/lesson minutes are
// shown to the user so floating-point artifacts never leak into the UI.
export function formatMinutes(minutes) {
  const n = Number(minutes) || 0;
  return String(Math.round(n));
}