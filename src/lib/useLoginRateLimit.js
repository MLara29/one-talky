/**
 * Client-side login rate limiter using localStorage.
 * Allows MAX_ATTEMPTS failed attempts per WINDOW_MS milliseconds per email.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getKey(email) {
  return `rl_login_${email.toLowerCase().trim()}`;
}

export function checkRateLimit(email) {
  const key = getKey(email);
  const now = Date.now();
  const raw = localStorage.getItem(key);
  const data = raw ? JSON.parse(raw) : { attempts: [], blockedUntil: null };

  // If blocked, check if window expired
  if (data.blockedUntil) {
    if (now < data.blockedUntil) {
      const remainingMs = data.blockedUntil - now;
      const remainingMin = Math.ceil(remainingMs / 60000);
      return { blocked: true, remainingMin };
    } else {
      // Window expired, reset
      localStorage.removeItem(key);
      return { blocked: false };
    }
  }

  // Filter attempts within the current window
  const recent = (data.attempts || []).filter(t => now - t < WINDOW_MS);

  if (recent.length >= MAX_ATTEMPTS) {
    const blockedUntil = recent[0] + WINDOW_MS;
    localStorage.setItem(key, JSON.stringify({ attempts: recent, blockedUntil }));
    const remainingMin = Math.ceil((blockedUntil - now) / 60000);
    return { blocked: true, remainingMin };
  }

  return { blocked: false };
}

export function recordFailedAttempt(email) {
  const key = getKey(email);
  const now = Date.now();
  const raw = localStorage.getItem(key);
  const data = raw ? JSON.parse(raw) : { attempts: [] };

  const recent = (data.attempts || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);

  if (recent.length >= MAX_ATTEMPTS) {
    const blockedUntil = recent[0] + WINDOW_MS;
    localStorage.setItem(key, JSON.stringify({ attempts: recent, blockedUntil }));
  } else {
    localStorage.setItem(key, JSON.stringify({ attempts: recent, blockedUntil: null }));
  }
}

export function clearRateLimit(email) {
  localStorage.removeItem(getKey(email));
}