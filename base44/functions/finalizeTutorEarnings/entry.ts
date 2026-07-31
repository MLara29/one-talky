import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lesson_id } = await req.json();
    if (!lesson_id) return Response.json({ error: 'lesson_id required' }, { status: 400 });

    // Fetch the lesson server-side — never trust client-supplied duration
    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    if (lessons.length === 0) return Response.json({ error: 'Lesson not found' }, { status: 404 });
    const lesson = lessons[0];

    // Only the tutor or the student of this lesson can trigger this
    if (user.id !== lesson.tutor_id && user.id !== lesson.student_id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Lesson must be completed
    if (lesson.status !== 'completed') {
      return Response.json({ error: 'Lesson not completed yet' }, { status: 400 });
    }

    // CAS guard: endLesson already finalizes earnings when it completes the lesson.
    // Only proceed if no one has finalized earnings for this lesson yet — otherwise
    // this would double-pay the tutor.
    const earningsCas = await base44.asServiceRole.entities.Lesson.updateMany(
      { id: lesson_id, earnings_finalized: { $ne: true } },
      { $set: { earnings_finalized: true } }
    );

    if (earningsCas.updated === 0) {
      return Response.json({ success: true, already_finalized: true });
    }

    // Calculate duration from server-recorded timestamps
    const startedAt = lesson.started_at ? new Date(lesson.started_at).getTime() : null;
    const endedAt = lesson.ended_at ? new Date(lesson.ended_at).getTime() : null;

    if (!startedAt || !endedAt) {
      return Response.json({ error: 'Lesson timestamps missing' }, { status: 400 });
    }

    const durationSeconds = Math.max(1, (endedAt - startedAt) / 1000);
    const durationMinutes = durationSeconds / 60;

    // Update tutor earnings using server-calculated duration
    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
    if (tutorProfiles.length === 0) return Response.json({ error: 'Tutor profile not found' }, { status: 404 });

    const tp = tutorProfiles[0];
    const rate = tp.price_per_minute ?? 0.9967;
    const earnings = Math.round(durationSeconds * (rate / 60) * 100) / 100;

    // Record the historical rate + resulting amount on the Lesson itself — this is
    // the auditable source of truth for payouts, immune to later rate changes.
    await base44.asServiceRole.entities.Lesson.update(lesson_id, {
      rate_applied: rate,
      earned_amount: earnings,
    });

    await base44.asServiceRole.entities.TutorProfile.update(tp.id, {
      total_earnings: Math.round(((tp.total_earnings ?? 0) + earnings) * 100) / 100,
      total_minutes: Math.round(((tp.total_minutes ?? 0) + durationMinutes) * 100) / 100,
      total_lessons: (tp.total_lessons ?? 0) + 1,
    });

    return Response.json({ success: true, duration_minutes: Math.round(durationMinutes * 100) / 100 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});