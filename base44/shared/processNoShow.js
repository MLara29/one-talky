// Processes a scheduled Lesson whose scheduled_at + grace period has passed
// without anyone joining. Same CAS pattern as completeLesson.js so that a
// lesson can never be double-processed even if the cron overlaps itself.
//
// Business rule: student is debited the scheduled duration_minutes (never
// capped/measured by elapsed time — nobody joined, so there's no "elapsed"),
// and the tutor is credited normally, as if the lesson had actually happened.

export async function processNoShow(base44, lesson) {
  const lessonId = lesson.id;
  const durationMinutes = lesson.duration_minutes || 30;
  const nowIso = new Date().toISOString();

  // CAS: only the caller that flips scheduled -> no_show processes this lesson.
  const cas = await base44.asServiceRole.entities.Lesson.updateMany(
    { id: lessonId, status: 'scheduled' },
    { $set: { status: 'no_show', ended_at: nowIso, earnings_finalized: true } }
  );
  if (cas.updated === 0) return { alreadyProcessed: true };

  // Debit the student.
  const studentProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: lesson.student_id });
  if (studentProfiles.length > 0) {
    const sp = studentProfiles[0];
    const newCredits = Math.max(0, (sp.credits_minutes ?? 0) - durationMinutes);
    await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
      credits_minutes: Math.round(newCredits * 100) / 100,
    });
  }

  // Credit the tutor (same rate_applied/earned_amount pattern as completeLesson.js).
  const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
  const tp = tutorProfiles[0];
  if (tp) {
    const rate = tp.price_per_minute ?? 0.9967;
    const earnings = Math.round(durationMinutes * rate * 100) / 100;
    await base44.asServiceRole.entities.Lesson.update(lessonId, { rate_applied: rate, earned_amount: earnings });
    await base44.asServiceRole.entities.TutorProfile.update(tp.id, {
      total_earnings: Math.round(((tp.total_earnings ?? 0) + earnings) * 100) / 100,
      total_minutes: Math.round(((tp.total_minutes ?? 0) + durationMinutes) * 100) / 100,
      total_lessons: (tp.total_lessons ?? 0) + 1,
    });
  }

  return { alreadyProcessed: false, durationMinutes };
}