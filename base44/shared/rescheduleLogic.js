// Shared reschedule logic — extracted from rescheduleLesson so that
// proposeReschedule (conflict check only) and respondToRescheduleRequest
// (actual slot move on accept) can reuse the exact same code path.
import { normalizeSlot } from './slotUtils.js';

// Checks for tutor and student lesson conflicts at the new time.
// Returns { ok: true } or { ok: false, error, status }.
export async function checkRescheduleConflicts(base44, lesson, newScheduledAt) {
  const normalizedNew = normalizeSlot(newScheduledAt);

  const tutorLessons = await base44.asServiceRole.entities.Lesson.filter({ tutor_id: lesson.tutor_id });
  const tutorConflict = tutorLessons.find(l =>
    l.id !== lesson.id && l.status !== 'cancelled' && l.scheduled_at && normalizeSlot(l.scheduled_at) === normalizedNew
  );
  if (tutorConflict) return { ok: false, error: 'Novo horário já está ocupado', status: 409 };

  const studentLessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: lesson.student_id });
  const studentConflict = studentLessons.find(l =>
    l.id !== lesson.id && l.status !== 'cancelled' && l.scheduled_at && normalizeSlot(l.scheduled_at) === normalizedNew
  );
  if (studentConflict) return { ok: false, error: 'O aluno já tem outra aula agendada nesse horário', status: 409 };

  return { ok: true };
}

// Performs the actual slot move on TutorProfile.booked_slots using two
// separate calls to avoid the MongoDB path conflict ($addToSet + $pull on
// the same field in one update). Step 1 removes the old slot (idempotent),
// step 2 claims the new slot with CAS. If CAS fails, restores the old slot.
// Returns { ok: true } or { ok: false, error, status }.
export async function performRescheduleSlotMove(base44, tutorProfile, newScheduledAt, oldScheduledAt) {
  const normalizedNew = normalizeSlot(newScheduledAt);
  const normalizedOld = normalizeSlot(oldScheduledAt);
  const newSlotFull = `${normalizedNew}:00Z`;
  const oldSlotFull = (tutorProfile.booked_slots || []).find(s => normalizeSlot(s) === normalizedOld) || `${normalizedOld}:00Z`;

  // Etapa 1: remover o slot antigo (seguro, idempotente — não precisa de CAS)
  await base44.asServiceRole.entities.TutorProfile.updateMany(
    { id: tutorProfile.id },
    { $pull: { booked_slots: oldSlotFull } }
  );

  // Etapa 2: reivindicar o slot novo com proteção CAS
  const casResult = await base44.asServiceRole.entities.TutorProfile.updateMany(
    { id: tutorProfile.id, booked_slots: { $nin: [newSlotFull] } },
    { $addToSet: { booked_slots: newSlotFull } }
  );

  if (casResult.updated === 0) {
    // Não conseguiu reivindicar o novo horário — devolve o slot antigo
    await base44.asServiceRole.entities.TutorProfile.updateMany(
      { id: tutorProfile.id },
      { $addToSet: { booked_slots: oldSlotFull } }
    );
    return { ok: false, error: 'Novo horário já está ocupado', status: 409 };
  }

  return { ok: true };
}