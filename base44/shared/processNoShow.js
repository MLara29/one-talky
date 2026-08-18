// Processes a scheduled Lesson whose scheduled_at + grace period has passed
// without the lesson becoming in_progress. Branches by WHO was actually
// available so that blame is assigned correctly:
//
//   TUTOR AVAILABILITY — a tutor counts as "available" for this lesson if
//   EITHER they physically joined the classroom (tutor_joined_at) OR their
//   platform heartbeat (TutorProfile.last_seen, updated every 20s on every
//   page while logged in) shows activity at/after the lesson's scheduled_at.
//   The tutor does NOT need to sit inside an empty video room to be credited
//   for a student no-show — being logged in and active on the platform
//   during the window is enough.
//
//   CASO A — tutor available, student didn't join → student's fault (no_show)
//     Student is debited, tutor is credited the full scheduled duration.
//     Tutor's no-show counter is NOT touched.
//
//   CASO B — student joined (or was waiting), tutor NOT available → tutor's fault (tutor_no_show)
//     Student is NOT debited, tutor is NOT paid. Tutor's no-show counter is
//     incremented via registerTutorNoShow (3 strikes → suspension, etc.).
//
//   CASO C — no signal from either side → benefit of the doubt (cancelled)
//     Nobody is charged. Lesson is cancelled with an explanatory note.
//
//   CASO D — both available but lesson never started → flagged for manual review
//     Rare edge case. Flagged, no automatic debit/credit.
//
// Same CAS pattern as completeLesson.js: only the caller that flips
// status='scheduled' → final status processes the lesson, so overlapping cron
// runs never double-process.

import { registerTutorNoShow } from './registerTutorNoShow.js';
import { debitStudentCredits } from './studentCredits.js';

export async function processNoShow(base44, lesson) {
  const lessonId = lesson.id;
  const durationMinutes = (lesson.duration_minutes && lesson.duration_minutes > 0) ? lesson.duration_minutes : 30;
  const nowIso = new Date().toISOString();

  const studentJoined = !!lesson.student_joined_at;
  const tutorJoinedRoom = !!lesson.tutor_joined_at;
  // Sinal mais leve que student_joined_at: a tela do aluno mostrou "aguardando
  // o tutor" pra essa aula, mesmo sem ele ter aberto a sala de vídeo (ex: o
  // botão de entrar nunca apareceu porque o tutor não estava disponível).
  // Conta como presença do aluno pra fins de atribuir a falta ao tutor.
  const studentWaited = !!lesson.student_waiting_at;

  // Busca o perfil do tutor uma vez só — usado tanto pra decidir disponibilidade
  // quanto, no CASO A, pra calcular o pagamento.
  const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
  const tp = tutorProfiles[0];
  const tutorWasOnPlatform = !!(
    tp?.last_seen &&
    lesson.scheduled_at &&
    new Date(tp.last_seen).getTime() >= new Date(lesson.scheduled_at).getTime()
  );
  const tutorAvailable = tutorJoinedRoom || tutorWasOnPlatform;

  // ── CASO A: tutor disponível, aluno não apareceu → falta do ALUNO ─────────
  if (tutorAvailable && !studentJoined) {
    const cas = await base44.asServiceRole.entities.Lesson.updateMany(
      { id: lessonId, status: 'scheduled' },
      { $set: { status: 'no_show', ended_at: nowIso, earnings_finalized: true } }
    );
    if (cas.updated === 0) return { alreadyProcessed: true };

    // Debit the student.
    const studentProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: lesson.student_id });
    if (studentProfiles.length > 0) {
      const sp = studentProfiles[0];
      const debited = debitStudentCredits(sp, durationMinutes);
      await base44.asServiceRole.entities.StudentProfile.update(sp.id, debited);
    }

    // Credit the tutor (same rate_applied/earned_amount pattern as completeLesson.js).
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

    // IMPORTANT: do NOT call registerTutorNoShow here — this is the student's fault.
    return { alreadyProcessed: false, durationMinutes, studentFault: true };
  }

  // ── CASO B: aluno apareceu (ou estava esperando), tutor NÃO disponível ────
  if ((studentJoined || studentWaited) && !tutorAvailable) {
    const cas = await base44.asServiceRole.entities.Lesson.updateMany(
      { id: lessonId, status: 'scheduled' },
      { $set: { status: 'tutor_no_show', ended_at: nowIso } }
    );
    if (cas.updated === 0) return { alreadyProcessed: true };

    // Aluno NÃO é debitado, tutor NÃO é pago.
    // Increment tutor's no-show counter (3 strikes → suspension, further → ban suggestion).
    try {
      await registerTutorNoShow(base44, lesson.tutor_id, lessonId, lesson.student_name);
    } catch (e) {
      console.error('[processNoShow] registerTutorNoShow failed:', e.message);
    }

    return { alreadyProcessed: false, tutorFault: true };
  }

  // ── CASO C: nenhum sinal de nenhum dos dois → benefício da dúvida ─────────
  if (!studentJoined && !tutorAvailable && !studentWaited) {
    const cas = await base44.asServiceRole.entities.Lesson.updateMany(
      { id: lessonId, status: 'scheduled' },
      { $set: { status: 'cancelled', ended_at: nowIso, notes: 'Nenhum participante entrou na sala' } }
    );
    if (cas.updated === 0) return { alreadyProcessed: true };

    // Ninguém é cobrado.
    return { alreadyProcessed: false, mutual: true };
  }

  // ── CASO D: os dois disponíveis mas nunca virou in_progress → revisão manual
  await base44.asServiceRole.entities.Lesson.update(lessonId, { flagged_for_review: true });
  return { alreadyProcessed: false, needsReview: true };
}
