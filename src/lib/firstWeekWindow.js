// UI-only mirror of the backend isFirstWeekWindow (base44/shared/firstWeekLock.js).
// Used to cosmetically hide the "Lesson now" button during the first 7 days of
// subscription cycle 1 — NOT a security check. The real enforcement lives in
// startInstantLesson (error_code: first_week_instant_blocked).
export function isFirstWeekActive(profile) {
  if (!profile) return false;
  if (profile.subscription_cycle !== 1) return false;
  if (!profile.subscription_start_date) return false;
  const subStartDate = new Date(profile.subscription_start_date);
  const sevenDaysAfterStart = new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Date() < sevenDaysAfterStart;
}