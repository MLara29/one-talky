// Formats a minutes value for display, rounding to 2 decimals and stripping
// trailing zeros (159.42000000000002 → "159.42", 159.00 → "159", 159.40 → "159.4").
// Use this everywhere credit/lesson minutes are shown to the user so floating-
// point artifacts from JS arithmetic never leak into the UI.
export function formatMinutes(minutes) {
  const n = Number(minutes) || 0;
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}