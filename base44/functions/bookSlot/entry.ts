import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { validateBookingEligibility } from '../../shared/validateBookingEligibility.js';

const normalizeSlot = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}T${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let { tutor_profile_id, scheduled_at, action, lesson_id, duration_minutes,
          tutor_user_id, tutor_name, student_name, language } = await req.json();
    if (!tutor_profile_id || !scheduled_at) return Response.json({ error: 'Missing params' }, { status: 400 });

    // ── RELEASE action ──
    if (action === 'release') {
      if (!lesson_id) return Response.json({ error: 'lesson_id required to release a slot' }, { status: 400 });
      const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
      if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });
      if (lesson.student_id !== user.id && lesson.tutor_id !== user.id && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
      if (tutorProfiles.length === 0) return Response.json({ error: 'Tutor profile not found' }, { status: 404 });
      tutor_profile_id = tutorProfiles[0].id;

      const tutorProfile = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id);
      if (!tutorProfile) return Response.json({ error: 'Tutor not found' }, { status: 404 });
      const currentBooked = tutorProfile.booked_slots || [];
      const normalizedNew = normalizeSlot(scheduled_at);
      const normalizedBooked = currentBooked.map(normalizeSlot);
      const updatedSlots = currentBooked.filter((_, i) => normalizedBooked[i] !== normalizedNew);
      await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });
      return Response.json({ success: true, booked_slots: updatedSlots });
    }

    // ── BOOK action ──
    if (user.role !== 'student' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const studentId = user.role === 'admin' && req.headers.get('x-student-id')
      ? req.headers.get('x-student-id')
      : user.id;

    // ── RULE 1: Eligibility (subscription status + first-week restrictions) ──
    const eligibility = await validateBookingEligibility(base44, studentId, scheduled_at, duration_minutes);
    if (!eligibility.allowed) {
      console.log(`[bookSlot] REJECTED student=${studentId} scheduled_at=${scheduled_at} reason=${eligibility.error}`);
      return Response.json({ error: eligibility.error }, { status: eligibility.httpStatus || 403 });
    }

    // ── RULE 2: No double-booking at the same time with different tutors ──
    const normalizedNewSlot = normalizeSlot(scheduled_at);
    const studentLessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: studentId });
    const conflict = studentLessons.find(l => {
      if (!l.scheduled_at) return false;
      if (l.status === 'cancelled') return false;
      return normalizeSlot(l.scheduled_at) === normalizedNewSlot;
    });
    if (conflict) {
      console.log(`[bookSlot] CONFLICT student=${studentId} scheduled_at=${scheduled_at} existing_lesson=${conflict.id}`);
      return Response.json({
        error: 'Você já tem uma aula agendada neste horário. Por favor, escolha um horário diferente.',
      }, { status: 409 });
    }

    // ── RULE 3: Lock the tutor slot atomically ──
    // This is the serialization point: if two concurrent requests reach here,
    // the second will get 409 "Slot already booked" from the booked_slots check,
    // and no Lesson record will be created for it.
    const tutorProfile = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id);
    if (!tutorProfile) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    const currentBooked = tutorProfile.booked_slots || [];
    const normalizedNew = normalizeSlot(scheduled_at);
    const normalizedBooked = currentBooked.map(normalizeSlot);

    if (normalizedBooked.includes(normalizedNew)) {
      return Response.json({ error: 'Slot already booked' }, { status: 409 });
    }
    const updatedSlots = [...currentBooked, normalizedNew + ':00Z'];
    await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });

    // ── Create the Lesson record server-side (after slot is secured) ──
    // Moving creation here ensures: check eligibility → lock slot → create Lesson
    // are all in the same server handler. A concurrent request that passes eligibility
    // will fail on the slot lock above and never reach lesson creation.
    let lesson = null;
    if (tutor_user_id) {
      lesson = await base44.asServiceRole.entities.Lesson.create({
        tutor_id: tutor_user_id,
        student_id: studentId,
        tutor_name: tutor_name || '',
        student_name: student_name || '',
        language: language || 'english',
        status: 'scheduled',
        type: 'scheduled',
        scheduled_at: scheduled_at,
        duration_minutes: duration_minutes || 30,
      });
    }

    return Response.json({ success: true, booked_slots: updatedSlots, lesson });
  } catch (error) {
    console.error('[bookSlot]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}