// Shared helper to determine if a tutor is due for payout, based on their
// chosen payout_frequency and the date of their last CONFIRMED withdrawal.
const FREQUENCY_DAYS = { weekly: 7, biweekly: 14, monthly: 30 };

export function isDueForPayout(frequency, lastConfirmedAt) {
  const days = FREQUENCY_DAYS[frequency] || 7;
  if (!lastConfirmedAt) return true; // never paid before — always eligible if there's a balance
  const elapsedDays = (Date.now() - new Date(lastConfirmedAt).getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= days;
}