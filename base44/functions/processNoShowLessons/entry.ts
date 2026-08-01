import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { processNoShow } from "../../shared/processNoShow.js";

// A "scheduled" lesson whose scheduled_at + this grace period has passed
// without anyone joining (still "scheduled" — never became in_progress) is
// considered a no-show. Must match LESSON_JOIN_GRACE_PERIOD_MS in
// src/lib/constants.js — the same 10-minute join tolerance shown in the UI.
const GRACE_PERIOD_MS = 10 * 60 * 1000;

// Safety ceiling: only lessons overdue by up to this much are treated as a real
// no-show. Anything older is stale data (e.g. pre-dating this feature) and must
// go through the separate one-time cleanupStaleScheduledLessons routine instead —
// never auto-debited/credited as if it just happened.
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

Deno.serve(async (req) => {
  try {
    // No authenticated user in this context — invoked directly by the scheduled
    // workflow (cron), which carries no user session. Safe without auth because:
    // this function takes no input from the caller, and only acts on lessons
    // that are objectively "scheduled" with scheduled_at + grace period already
    // in the past — there's no way to force a no-show before it's real.
    const base44 = createClientFromRequest(req);

    const scheduled = await base44.asServiceRole.entities.Lesson.filter({ status: 'scheduled' });
    const now = Date.now();

    const overdue = scheduled.filter((l) => {
      if (!l.scheduled_at) return false;
      const overdueMs = now - new Date(l.scheduled_at).getTime();
      return overdueMs > GRACE_PERIOD_MS && overdueMs <= MAX_AGE_MS;
    });

    let processed = 0;
    for (const lesson of overdue) {
      const result = await processNoShow(base44, lesson);
      if (!result.alreadyProcessed) processed++;
    }

    return Response.json({ success: true, checked: scheduled.length, processed });
  } catch (error) {
    console.error('[processNoShowLessons]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});