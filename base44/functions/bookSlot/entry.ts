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

    if (!tutor_profile_id || !scheduled_at) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    // ── RELEASE action ─────────────────────────────────────────────────────────
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

    // ── BOOK action ────────────────────────────────────────────────────────────
    if (user.role !== 'student' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate tutor_user_id BEFORE acquiring any lock — avoids a permanently-pending
    // first_week_lesson_id if this field is missing from the payload.
    if (!tutor_user_id) {
      return Response.json({ error: 'Missing required param: tutor_user_id' }, { status: 400 });
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
    const normalizedNew = normalizeSlot(scheduled_at);
    const studentLessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: studentId });
    const conflict = studentLessons.find(l => {
      if (!l.scheduled_at || l.status === 'cancelled') return false;
      return normalizeSlot(l.scheduled_at) === normalizedNew;
    });
    if (conflict) {
      console.log(`[bookSlot] CONFLICT student=${studentId} scheduled_at=${scheduled_at} existing_lesson=${conflict.id}`);
      return Response.json({
        error: 'Você já tem uma aula agendada neste horário. Por favor, escolha um horário diferente.',
      }, { status: 409 });
    }

    // ── RULE 3: First-week CAS lock ────────────────────────────────────────────
    // Determines whether this booking is inside the cycle-1 / first-7-days window,
    // and if so acquires an atomic lock on the StudentProfile record.
    // CRITICAL: every code path from here until "lesson created + lock committed"
    // must roll back first_week_lesson_id if it does not succeed fully.
    const spProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: studentId });
    const sp = spProfiles[0];

    let casLockAcquired = false; // tracks whether WE set first_week_lesson_id = '__pending__'

    const isFirstWeekBooking = (() => {
      if (!sp) return false;
      const subCycle = sp.subscription_cycle || 0;
      const subStartDate = sp.subscription_start_date ? new Date(sp.subscription_start_date) : null;
      if (subCycle !== 1 || !subStartDate) return false;
      const sevenDaysAfterStart = new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      return new Date() < sevenDaysAfterStart;
    })();

    if (isFirstWeekBooking) {
      // Double-check: lock field already set (e.g. concurrent request just committed)
      if (sp.first_week_lesson_id) {
        console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_already_locked lesson_id=${sp.first_week_lesson_id}`);
        return Response.json({
          error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
        }, { status: 409 });
      }
      // CAS: claim the lock only if field is absent — exactly one concurrent request wins
      const casResult = await base44.asServiceRole.entities.StudentProfile.updateMany(
        { user_id: studentId, first_week_lesson_id: { $exists: false } },
        { $set: { first_week_lesson_id: '__pending__' } }
      );
      if (casResult.updated === 0) {
        console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_lost`);
        return Response.json({
          error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
        }, { status: 409 });
      }
      casLockAcquired = true;
    }

    // Helper: rolls back the CAS lock. Called on any failure after lock acquisition.
    const rollbackCasLock = async () => {
      if (!casLockAcquired) return;
      await base44.asServiceRole.entities.StudentProfile.updateMany(
        { user_id: studentId, first_week_lesson_id: '__pending__' },
        { $unset: { first_week_lesson_id: '' } }
      ).catch(e => console.error('[bookSlot] CAS rollback failed', e.message));
    };

    // ── RULE 4: Lock the tutor slot atomically ─────────────────────────────────
    // From this point, any early return must roll back the CAS lock.
    const tutorProfile = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id);
    if (!tutorProfile) {
      await rollbackCasLock();
      return Response.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const currentBooked = tutorProfile.booked_slots || [];
    const normalizedBooked = currentBooked.map(normalizeSlot);

    if (normalizedBooked.includes(normalizedNew)) {
      await rollbackCasLock();
      return Response.json({ error: 'Slot already booked' }, { status: 409 });
    }

    const updatedSlots = [...currentBooked, normalizedNew + ':00Z'];
    await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });

    // ── Create Lesson (tutor slot is now locked) ───────────────────────────────
    let lesson = null;
    try {
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
    } catch (lessonErr) {
      console.error('[bookSlot] Lesson creation failed — rolling back locks', lessonErr.message);
      await rollbackCasLock();
      // Release the tutor slot: read current state to avoid clobbering other bookings
      const tutorNow = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id).catch(() => null);
      if (tutorNow) {
        const slotsWithoutOurs = (tutorNow.booked_slots || []).filter(s => normalizeSlot(s) !== normalizedNew);
        await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: slotsWithoutOurs }).catch(() => {});
      }
      throw lessonErr;
    }

    // ── Commit the CAS lock with the real lesson ID ───────────────────────────
    if (casLockAcquired && lesson) {
      await base44.asServiceRole.entities.StudentProfile.updateMany(
        { user_id: studentId, first_week_lesson_id: '__pending__' },
        { $set: { first_week_lesson_id: lesson.id } }
      ).catch(e => console.error('[bookSlot] CAS commit failed', e.message));
    }

    return Response.json({ success: true, booked_slots: updatedSlots, lesson });

  } catch (error) {
    console.error('[bookSlot]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}