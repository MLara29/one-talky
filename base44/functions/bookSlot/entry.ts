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

    let { tutor_profile_id, scheduled_at, action, lesson_id, duration_minutes } = await req.json();
    if (!tutor_profile_id || !scheduled_at) return Response.json({ error: 'Missing params' }, { status: 400 });

    // For 'release' action, verify the lesson belongs to the calling user
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
    } else {
      // Only students (or admins on behalf of students) can book
      if (user.role !== 'student' && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const studentId = user.role === 'admin' && req.headers.get('x-student-id')
        ? req.headers.get('x-student-id')
        : user.id;

      // ── RULE 1: First-month subscription restriction (server-side, tamper-proof) ──
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
    }

    const tutorProfile = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id);
    if (!tutorProfile) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    const currentBooked = tutorProfile.booked_slots || [];
    const normalizedNew = normalizeSlot(scheduled_at);
    const normalizedBooked = currentBooked.map(normalizeSlot);

    let updatedSlots;
    if (action === 'release') {
      updatedSlots = currentBooked.filter((_, i) => normalizedBooked[i] !== normalizedNew);
    } else {
      if (normalizedBooked.includes(normalizedNew)) {
        return Response.json({ error: 'Slot already booked' }, { status: 409 });
      }
      updatedSlots = [...currentBooked, normalizedNew + ':00Z'];
    }

    await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });
    return Response.json({ success: true, booked_slots: updatedSlots });
  } catch (error) {
    console.error('[bookSlot]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}