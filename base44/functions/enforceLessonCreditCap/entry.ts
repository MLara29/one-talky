import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { completeLesson } from "../../shared/completeLesson.js";

// Server-side enforcement of the credit-capped lesson end time.
//
// The client (Classroom.jsx) computes a target end time when both participants
// join, but that relies on the browser being open and the React effect firing.
// If the browser is closed, the tab is backgrounded, or the client-side
// endLesson() call fails silently, the lesson stays "in_progress" forever and
// the student keeps getting charged (via the stale-lesson timeout, which only
// fires after 1 hour).
//
// This function is invoked by the EnforceLessonCreditCap workflow every 2
// minutes. It finds in_progress lessons whose credit_capped_end_at has passed
// and force-completes them using the same completeLesson logic — debiting the
// student, crediting the tutor, and releasing the first-week lock — all CAS-
// guarded so a concurrent client-side endLesson can never double-charge.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const inProgress = await base44.asServiceRole.entities.Lesson.filter({ status: 'in_progress' });
    const now = Date.now();

    const overdue = inProgress.filter((l) => {
      if (!l.credit_capped_end_at) return false;
      return now >= new Date(l.credit_capped_end_at).getTime();
    });

    let completed = 0;
    for (const lesson of overdue) {
      const result = await completeLesson(base44, lesson, {});
      if (!result.alreadyCompleted) completed++;
    }

    return Response.json({ success: true, checked: inProgress.length, completed });
  } catch (error) {
    console.error('[enforceLessonCreditCap]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});