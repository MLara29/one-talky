import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { completeLesson } from "../../shared/completeLesson.js";

// Any lesson still "in_progress" longer than this is considered forgotten/stuck
// (student or tutor left without ending the call) and gets force-completed.
const STALE_THRESHOLD_MS = 1 * 60 * 60 * 1000; // 1 hour

Deno.serve(async (req) => {
  try {
    // No authenticated user in this context — invoked directly by the scheduled
    // workflow (cron), which carries no user session. Safe without auth because:
    // this function takes no input from the caller, and only acts on lessons
    // that are objectively in_progress for longer than STALE_THRESHOLD_MS —
    // there's no way to force-close a lesson before it's actually stale.
    const base44 = createClientFromRequest(req);

    const inProgress = await base44.asServiceRole.entities.Lesson.filter({ status: 'in_progress' });
    const now = Date.now();

    const stale = inProgress.filter((l) => {
      const startedAtMs = l.started_at ? new Date(l.started_at).getTime() : null;
      if (!startedAtMs) return true; // no started_at at all — clearly stuck, clean it up
      return now - startedAtMs > STALE_THRESHOLD_MS;
    });

    let completed = 0;
    for (const lesson of stale) {
      const result = await completeLesson(base44, lesson, {});
      if (!result.alreadyCompleted) completed++;
      // First-week lock release is handled centrally inside completeLesson.js
      // (incomplete lesson < 30min releases it), so no duplicated logic here.
    }

    // Safety net: reset any tutor stuck with in_lesson=true but no in_progress
    // lesson. Catches tutors whose completeLesson tutor-update failed
    // transiently or whose completion raced — would otherwise stay "busy" forever.
    let tutorsReset = 0;
    const stuckTutors = await base44.asServiceRole.entities.TutorProfile.filter({ in_lesson: true });
    for (const t of stuckTutors) {
      const active = await base44.asServiceRole.entities.Lesson.filter({ tutor_id: t.user_id, status: 'in_progress' });
      if (active.length === 0) {
        await base44.asServiceRole.entities.TutorProfile.update(t.id, { in_lesson: false });
        tutorsReset++;
        console.log(`[timeoutStaleLessons] Reset stuck in_lesson for tutor=${t.user_id}`);
      }
    }

    return Response.json({ success: true, checked: inProgress.length, completed, tutorsReset });
  } catch (error) {
    console.error('[timeoutStaleLessons]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});