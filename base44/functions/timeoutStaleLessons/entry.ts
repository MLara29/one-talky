import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { completeLesson } from "../../shared/completeLesson.js";

// Any lesson still "in_progress" longer than this is considered forgotten/stuck
// (student or tutor left without ending the call) and gets force-completed.
const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    }

    return Response.json({ success: true, checked: inProgress.length, completed });
  } catch (error) {
    console.error('[timeoutStaleLessons]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});