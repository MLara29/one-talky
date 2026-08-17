// Shared lesson-completion logic used by endLesson (user-triggered) and
// timeoutStaleLessons (system-triggered cleanup of forgotten in_progress lessons).
//
// Guarantees, via CAS (compare-and-swap) updateMany calls:
// 1. status: "in_progress" -> "completed" happens at most once per lesson,
//    even if two callers race (e.g. student + tutor both hit endLesson).
// 2. earnings_finalized flips false -> true at most once, so tutor crediting
//    can never double-pay even if another routine (finalizeTutorEarnings)
//    also tries to credit the same lesson.
// 3. Duration is capped so a forgotten/stuck call can't bill unbounded time.

// Absolute floor for the duration cap, regardless of the lesson's scheduled length.
import { debitStudentCredits } from './studentCredits.js';

const MAX_DURATION_CAP_MINUTES_FLOOR = 120;

export async function completeLesson(base44, lesson, { isRecorded = false, endedAtOverride = null } = {}) {
  const lessonId = lesson.id;
  const now = endedAtOverride ? new Date(endedAtOverride) : new Date();
  const nowIso = now.toISOString();

  // Billing/earnings clock starts when BOTH participants have actually
  // connected to the classroom (tutor_joined_at / student_joined_at, set by
  // markLessonJoined on real Agora join) — not when just one side opened the
  // page. This means: student is never charged, and tutor never earns, for
  // the time either side spent alone waiting for the other to connect.
  // Falls back to the old started_at-based behavior if either presence
  // timestamp is missing (e.g. a tracking hiccup) — never worse than before.
  const tutorJoinedMs = lesson.tutor_joined_at ? new Date(lesson.tutor_joined_at).getTime() : null;
  const studentJoinedMs = lesson.student_joined_at ? new Date(lesson.student_joined_at).getTime() : null;
  const startedAtMs = lesson.started_at ? new Date(lesson.started_at).getTime() : now.getTime();
  const billingStartMs = (tutorJoinedMs && studentJoinedMs)
    ? Math.max(tutorJoinedMs, studentJoinedMs)
    : startedAtMs;

  let durationSeconds = Math.max(1, (now.getTime() - billingStartMs) / 1000);

  // Cap: the greater of the absolute floor or 2x the scheduled duration.
  const scheduledDurationMin = lesson.duration_minutes || 30;
  const capMinutes = Math.max(MAX_DURATION_CAP_MINUTES_FLOOR, scheduledDurationMin * 2);
  let flagged = false;
  if (durationSeconds / 60 > capMinutes) {
    flagged = true;
    durationSeconds = capMinutes * 60;
  }
  const durationMinutes = durationSeconds / 60;

  // ── CAS #1: only the request that flips in_progress -> completed proceeds ──
  const completionCas = await base44.asServiceRole.entities.Lesson.updateMany(
    { id: lessonId, status: 'in_progress' },
    {
      $set: {
        status: 'completed',
        ended_at: nowIso,
        duration_minutes: Math.round(durationMinutes),
        is_recorded: Boolean(isRecorded),
        flagged_for_review: flagged,
      },
    }
  );

  if (completionCas.updated === 0) {
    // Self-heal: se perdemos a race de completion, o vencedor deveria ter
    // resetado in_lesson — mas se o update dele falhou, o tutor fica travado.
    // Garante que o tutor não fique marcado in_lesson se não há aula ativa.
    const otherActive = await base44.asServiceRole.entities.Lesson.filter({
      tutor_id: lesson.tutor_id, status: 'in_progress',
    });
    if (otherActive.length === 0) {
      const tpList = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
      if (tpList[0]?.in_lesson) {
        await base44.asServiceRole.entities.TutorProfile.update(tpList[0].id, { in_lesson: false });
        console.log(`[completeLesson] Self-healed stuck in_lesson for tutor=${lesson.tutor_id}`);
      }
    }
    return { alreadyCompleted: true };
  }

  // Debit the student — safe to run once per completion since we won CAS #1.
  const studentProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: lesson.student_id });
  if (studentProfiles.length > 0) {
    const sp = studentProfiles[0];
    const debited = debitStudentCredits(sp, durationMinutes);
    await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
      ...debited,
      total_minutes: Math.round(((sp.total_minutes ?? 0) + durationMinutes) * 100) / 100,
      total_lessons: (sp.total_lessons ?? 0) + 1,
      last_practice_date: nowIso.split('T')[0],
    });
  }

  const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
  const tp = tutorProfiles[0];
  if (tp) {
    await base44.asServiceRole.entities.TutorProfile.update(tp.id, { in_lesson: false });
  }

  // ── CAS #2: only the routine that flips earnings_finalized false -> true credits the tutor ──
  const earningsCas = await base44.asServiceRole.entities.Lesson.updateMany(
    { id: lessonId, earnings_finalized: { $ne: true } },
    { $set: { earnings_finalized: true } }
  );

  if (earningsCas.updated > 0 && tp) {
    const rate = tp.price_per_minute ?? 0.9967;
    const earnings = Math.round(durationSeconds * (rate / 60) * 100) / 100;
    // Record the historical rate + resulting amount on the Lesson itself — this is
    // the auditable source of truth for payouts, immune to later rate changes.
    await base44.asServiceRole.entities.Lesson.update(lessonId, {
      rate_applied: rate,
      earned_amount: earnings,
    });
    await base44.asServiceRole.entities.TutorProfile.update(tp.id, {
      total_earnings: Math.round(((tp.total_earnings ?? 0) + earnings) * 100) / 100,
      total_minutes: Math.round(((tp.total_minutes ?? 0) + durationMinutes) * 100) / 100,
      total_lessons: (tp.total_lessons ?? 0) + 1,
    });
  }

  // ── Liberar o cadeado da primeira semana se a aula terminou incompleta ──
  // (qualquer motivo de encerramento: botão, timeout, término natural).
  // Só destrava se a aula foi a que travava o lock E durou menos que o tempo
  // completo esperado — aula legítima de 30 min mantém o lock (regra de negócio).
  const FULL_FIRST_WEEK_DURATION = 30; // minutos completos esperados

  const sp = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: lesson.student_id });
  if (sp[0]?.first_week_lesson_id === lesson.id) {
    const actualDuration = Math.round(durationMinutes);
    if (actualDuration < FULL_FIRST_WEEK_DURATION) {
      await base44.asServiceRole.entities.StudentProfile.update(sp[0].id, {
        first_week_lesson_id: null,
      });
      console.log(`[completeLesson] Released first-week lock for student=${lesson.student_id} (incomplete lesson=${lesson.id}, only ${actualDuration}min)`);
    }
  }

  return { alreadyCompleted: false, durationMinutes, flagged };
}