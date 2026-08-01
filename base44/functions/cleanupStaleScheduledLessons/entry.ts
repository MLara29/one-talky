import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from '../../shared/requireOtp.js';

// ONE-TIME, admin-triggered cleanup — NOT wired to any cron/workflow.
// Marks "scheduled" lessons whose scheduled_at is older than MAX_AGE_MS (the same
// ceiling used by processNoShowLessons) as "cancelled", with NO debit to the
// student and NO credit to the tutor. These are stale rows that predate the
// no-show feature and can no longer be confirmed as real no-shows — the
// automated cron intentionally skips them so they don't get charged.
const GRACE_PERIOD_MS = 10 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const scheduled = await base44.asServiceRole.entities.Lesson.filter({ status: 'scheduled' });
    const now = Date.now();

    const stale = scheduled.filter((l) => {
      if (!l.scheduled_at) return false;
      const overdueMs = now - new Date(l.scheduled_at).getTime();
      return overdueMs > MAX_AGE_MS;
    });

    let cancelled = 0;
    for (const lesson of stale) {
      const cas = await base44.asServiceRole.entities.Lesson.updateMany(
        { id: lesson.id, status: 'scheduled' },
        { $set: { status: 'cancelled' } }
      );
      if (cas.updated > 0) cancelled++;
    }

    return Response.json({ success: true, checked: scheduled.length, cancelled, stale_ids: stale.map(l => l.id) });
  } catch (error) {
    console.error('[cleanupStaleScheduledLessons]', error.message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}