import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Records that a participant (tutor or student) joined the classroom.
// Called from Classroom.jsx right after the Agora channel join succeeds.
// No OTP required — this is just a presence marker, not a sensitive action.
// The tutor_joined_at / student_joined_at fields are later read by
// processNoShow to determine who was at fault for a no-show.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lesson_id } = await req.json();
    if (!lesson_id) return Response.json({ error: 'lesson_id is required' }, { status: 400 });

    const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
    if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });

    const field = lesson.tutor_id === user.id ? 'tutor_joined_at'
      : lesson.student_id === user.id ? 'student_joined_at' : null;
    if (!field) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Hard block: if the lesson never started (still "scheduled") and the
    // 10-minute join grace period has passed, don't record a join — the
    // no-show system already owns this lesson. Must match
    // LESSON_JOIN_GRACE_PERIOD_MS in src/lib/constants.js.
    const GRACE_PERIOD_MS = 10 * 60 * 1000;
    if (lesson.status === 'scheduled' && lesson.scheduled_at) {
      const overdueMs = Date.now() - new Date(lesson.scheduled_at).getTime();
      if (overdueMs > GRACE_PERIOD_MS) {
        return Response.json({ error: 'join_window_closed' }, { status: 410 });
      }
    }

    // Only set if not already recorded (idempotent — re-joins don't overwrite).
    if (!lesson[field]) {
      await base44.asServiceRole.entities.Lesson.update(lesson_id, { [field]: new Date().toISOString() });
    }

    // If both participants have now joined, compute and persist the
    // credit-capped end time — the absolute moment this lesson should end,
    // based on the student's available credits. The EnforceLessonCreditCap
    // workflow reads this to force-close lessons server-side, independent of
    // any browser being open. Matches the client-side calculation in
    // Classroom.jsx (mutualJoinAt + min(scheduledMins, studentCredits)).
    const refreshed = await base44.asServiceRole.entities.Lesson.get(lesson_id);
    if (refreshed.tutor_joined_at && refreshed.student_joined_at && !refreshed.credit_capped_end_at) {
      const mutualJoinMs = Math.max(
        new Date(refreshed.tutor_joined_at).getTime(),
        new Date(refreshed.student_joined_at).getTime()
      );
      const scheduledMins = refreshed.duration_minutes || 30;
      const studentProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: refreshed.student_id });
      const sp = studentProfiles[0];
      const studentCredits = sp
        ? (sp.plan_credits_minutes ?? 0) + (sp.prepaid_credits_minutes ?? 0) + (sp.admin_gift_minutes ?? 0)
        : scheduledMins;
      const effectiveMins = Math.min(scheduledMins, studentCredits);
      const creditCappedEndAt = new Date(mutualJoinMs + effectiveMins * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.Lesson.update(lesson_id, { credit_capped_end_at: creditCappedEndAt });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[markLessonJoined]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});