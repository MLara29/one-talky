/**
 * Shared rate-limit logic for login endpoints.
 * Used by checkLoginRateLimit and recordLoginAttempt functions.
 *
 * Limits (both must pass):
 *   - By email+IP:  max 5 failed attempts in 15 minutes
 *   - By IP only:   max 20 failed attempts across all emails in 15 minutes
 *
 * Backoff schedule (by email+IP bucket):
 *   < 5 failures  → no block
 *   5th failure   → block 1 min
 *   next failure  → block 5 min
 *   next failure  → block 15 min (ceiling)
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_IP_LIMIT = 5;
const IP_LIMIT = 20;

const BACKOFF_MINUTES = [1, 5, 15]; // progressive backoff steps

/**
 * Returns { blocked: bool, retryAfterMs: number, reason: string|null }
 * base44AsServiceRole: the base44.asServiceRole object
 */
export async function checkLimit(base44AsServiceRole, identifier, ip) {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS).toISOString();

  // ── 1. Fetch recent failed attempts for email+IP ──────────────────────────
  const emailIpAttempts = await base44AsServiceRole.entities.LoginAttempt.filter({
    identifier,
    ip_address: ip,
    success: false,
    blocked: false, // only count real auth failures, not already-blocked requests
    created_date: { $gte: windowStart },
  });

  const emailIpCount = emailIpAttempts.length;

  // ── 2. Determine backoff block for this email+IP bucket ───────────────────
  if (emailIpCount >= EMAIL_IP_LIMIT) {
    // Find the most recent block that is still active
    const blockedAttempts = await base44AsServiceRole.entities.LoginAttempt.filter({
      identifier,
      ip_address: ip,
      blocked: true,
      created_date: { $gte: windowStart },
    });

    // Count how many progressive blocks have occurred to determine current tier
    const blockTier = Math.min(blockedAttempts.length, BACKOFF_MINUTES.length - 1);
    const blockMinutes = BACKOFF_MINUTES[blockTier];
    const blockWindowStart = new Date(now - blockMinutes * 60 * 1000).toISOString();

    // Check last real failure (not blocked) — if within block window, we're blocked
    const sortedFailures = [...emailIpAttempts].sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date)
    );
    const lastFailure = sortedFailures[0];

    if (lastFailure) {
      const lastFailureTime = new Date(lastFailure.created_date).getTime();
      const unblockAt = lastFailureTime + blockMinutes * 60 * 1000;
      if (now < unblockAt) {
        const retryAfterMs = unblockAt - now;
        return {
          blocked: true,
          retryAfterMs,
          reason: "email_ip",
        };
      }
    }
  }

  // ── 3. Check IP-only limit (credential stuffing) ──────────────────────────
  const ipAttempts = await base44AsServiceRole.entities.LoginAttempt.filter({
    ip_address: ip,
    success: false,
    blocked: false,
    created_date: { $gte: windowStart },
  });

  if (ipAttempts.length >= IP_LIMIT) {
    // Block for 15 minutes from oldest attempt in window
    const sortedIp = [...ipAttempts].sort(
      (a, b) => new Date(a.created_date) - new Date(b.created_date)
    );
    const oldestInWindow = new Date(sortedIp[0].created_date).getTime();
    const unblockAt = oldestInWindow + WINDOW_MS;
    const retryAfterMs = Math.max(unblockAt - now, 0);
    return {
      blocked: true,
      retryAfterMs,
      reason: "ip",
    };
  }

  return { blocked: false, retryAfterMs: 0, reason: null };
}

/**
 * Records a login attempt (blocked, failed, or success).
 */
export async function recordAttempt(base44AsServiceRole, identifier, ip, success, blocked) {
  await base44AsServiceRole.entities.LoginAttempt.create({
    identifier: identifier.toLowerCase().trim(),
    ip_address: ip || "unknown",
    success: !!success,
    blocked: !!blocked,
  });
}

/**
 * Cleans up LoginAttempt records older than 48 hours.
 * Call this periodically (e.g. from recordLoginAttempt on success).
 */
export async function cleanupOldAttempts(base44AsServiceRole) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  try {
    await base44AsServiceRole.entities.LoginAttempt.deleteMany({
      created_date: { $lt: cutoff },
    });
  } catch (_) {
    // Non-critical — ignore cleanup errors
  }
}

/**
 * Formats retryAfterMs into a human-readable minute string.
 */
export function formatRetryMinutes(retryAfterMs) {
  return Math.max(1, Math.ceil(retryAfterMs / 60000));
}