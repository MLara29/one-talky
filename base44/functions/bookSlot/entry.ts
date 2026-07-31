import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { validateBookingEligibility } from '../../shared/validateBookingEligibility.js';

const normalizeSlot = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}T${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
};

// How long a '__pending__' lock is considered valid before being treated as orphaned.
const CAS_LOCK_TTL_MS = 30_000;

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

    // Validate tutor_user_id BEFORE acquiring any lock.
    if (!tutor_user_id) {
      return Response.json({ error: 'Missing required param: tutor_user_id' }, { status: 400 });
    }

    const studentId = user.role === 'admin' && req.headers.get('x-student-id')
      ? req.headers.get('x-student-id')
      : user.id;

    // ── RULE 1: Eligibility ────────────────────────────────────────────────────
    const eligibility = await validateBookingEligibility(base44, studentId, scheduled_at, duration_minutes);
    if (!eligibility.allowed) {
      console.log(`[bookSlot] REJECTED student=${studentId} scheduled_at=${scheduled_at} reason=${eligibility.error}`);
      return Response.json({ error: eligibility.error }, { status: eligibility.httpStatus || 403 });
    }

    // ── RULE 2: No double-booking same slot different tutor ────────────────────
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
    const spProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: studentId });
    const sp = spProfiles[0];

    let casLockAcquired = false;

    const isFirstWeekBooking = (() => {
      if (!sp) return false;
      const subCycle = sp.subscription_cycle || 0;
      const subStartDate = sp.subscription_start_date ? new Date(sp.subscription_start_date) : null;
      if (subCycle !== 1 || !subStartDate) return false;
      const sevenDaysAfterStart = new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      return new Date() < sevenDaysAfterStart;
    })();

    if (isFirstWeekBooking) {
      const existingLock = sp.first_week_lesson_id;

      if (existingLock && existingLock !== '__pending__') {
        // A real lesson ID is committed — hard block.
        console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_committed lesson_id=${existingLock}`);
        return Response.json({
          error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
        }, { status: 409 });
      }

      if (existingLock === '__pending__') {
        // Check TTL: if lock is fresh, another request is in-flight — block.
        // If expired, treat as orphan and allow overwrite (CAS below will claim it).
        const lockAge = sp.first_week_lock_at
          ? Date.now() - new Date(sp.first_week_lock_at).getTime()
          : CAS_LOCK_TTL_MS + 1; // no timestamp = treat as expired
        if (lockAge < CAS_LOCK_TTL_MS) {
          console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_pending age_ms=${lockAge}`);
          return Response.json({
            error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
          }, { status: 409 });
        }
        // Lock is stale — fall through to overwrite it with a fresh CAS below.
        console.log(`[bookSlot] INFO student=${studentId} stale pending lock (age_ms=${lockAge}) — overwriting`);
      }

      // CAS: claim the lock.
      // Condition covers both "field absent" AND "field is stale __pending__" (TTL expired).
      // For stale pending, we use updateMany without the $exists filter so it overwrites.
      const casCondition = existingLock === '__pending__'
        ? { user_id: studentId, first_week_lesson_id: '__pending__' }
        : { user_id: studentId, first_week_lesson_id: { $exists: false } };

      const casResult = await base44.asServiceRole.entities.StudentProfile.updateMany(
        casCondition,
        { $set: { first_week_lesson_id: '__pending__', first_week_lock_at: new Date().toISOString() } }
      );

      if (casResult.updated === 0) {
        // Another concurrent request just claimed the lock between our read and this write.
        console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_lost`);
        return Response.json({
          error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
        }, { status: 409 });
      }

      casLockAcquired = true;
    }

    // Helper: rolls back the CAS lock — called on ANY failure after lock acquisition.
    const rollbackCasLock = async () => {
      if (!casLockAcquired) return;
      try {
        await base44.asServiceRole.entities.StudentProfile.updateMany(
          { user_id: studentId, first_week_lesson_id: '__pending__' },
          { $unset: { first_week_lesson_id: '', first_week_lock_at: '' } }
        );
      } catch (e) {
        console.error('[bookSlot] CAS rollback failed — student may need manual unblock', studentId, e.message);
      }
    };

    // ── RULES 4+: Everything from here must roll back the CAS lock on any throw ──
    let lesson = null;
    let updatedSlots = null;

    try {
      // ── RULE 4: Lock the tutor slot ──────────────────────────────────────────
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

      updatedSlots = [...currentBooked, normalizedNew + ':00Z'];
      await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });

      // ── Create Lesson ────────────────────────────────────────────────────────
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
        // Release the tutor slot safely (re-read to avoid clobbering concurrent bookings)
        const tutorNow = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id).catch(() => null);
        if (tutorNow) {
          const slotsWithoutOurs = (tutorNow.booked_slots || []).filter(s => normalizeSlot(s) !== normalizedNew);
          await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: slotsWithoutOurs }).catch(() => {});
        }
        throw lessonErr; // will be caught by outer try and trigger CAS rollback
      }

    } catch (innerErr) {
      // Covers: TutorProfile.get throw, TutorProfile.update throw, Lesson.create throw
      await rollbackCasLock();
      throw innerErr; // re-throw to outer catch for generic 500 response
    }

    // ── Commit the CAS lock with the real lesson ID ────────────────────────────
    // Lesson was created successfully. Commit or log critical audit entry.
    if (casLockAcquired && lesson) {
      const commitUpdate = async () =>
        base44.asServiceRole.entities.StudentProfile.updateMany(
          { user_id: studentId, first_week_lesson_id: '__pending__' },
          { $set: { first_week_lesson_id: lesson.id }, $unset: { first_week_lock_at: '' } }
        );

      try {
        const result = await commitUpdate();
        if (result.updated === 0) throw new Error('updateMany matched 0 records');
      } catch (e1) {
        console.error('[bookSlot] CAS commit attempt 1 failed — retrying', e1.message);
        try {
          await commitUpdate();
        } catch (e2) {
          // Lesson EXISTS but lock is not committed — TTL will auto-recover within 30s.
          // Log for audit trail in case manual reconciliation is needed.
          console.error(
            `[bookSlot] CRITICAL: CAS commit failed after retry. student=${studentId} lesson_id=${lesson.id} ` +
            `first_week_lesson_id is still '__pending__'. TTL will expire in ${CAS_LOCK_TTL_MS / 1000}s. ` +
            `Manual check: verify Lesson ${lesson.id} exists and set first_week_lesson_id=${lesson.id} on StudentProfile.`,
            e2.message
          );
        }
      }
    }

    return Response.json({ success: true, booked_slots: updatedSlots, lesson });

  } catch (error) {
    console.error('[bookSlot]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}