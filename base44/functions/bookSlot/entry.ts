import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { validateBookingEligibility } from '../../shared/validateBookingEligibility.js';
import { normalizeSlot } from '../../shared/slotUtils.js';
import { requireOtp } from '../../shared/requireOtp.js';
import { requireNotBlocked } from '../../shared/requireNotBlocked.js';

// How long a pending lock is considered valid before being treated as orphaned.
// 90s covers: TutorProfile.get + update + Lesson.create + multiple network hops.
const CAS_LOCK_TTL_MS = 90_000;

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
    if (user.role === 'admin') {
      const otpGate = await requireOtp(base44, req, user);
      if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });
    }

    // Validate tutor_user_id BEFORE acquiring any lock.
    if (!tutor_user_id) {
      return Response.json({ error: 'Missing required param: tutor_user_id' }, { status: 400 });
    }

    const studentId = user.role === 'admin' && req.headers.get('x-student-id')
      ? req.headers.get('x-student-id')
      : user.id;

    // ── RULE 0: Blocked students cannot book ────────────────────────────────────
    const blockedGate = await requireNotBlocked(base44, studentId);
    if (!blockedGate.ok) return Response.json({ error: blockedGate.error }, { status: blockedGate.status });

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
    // Unique token for THIS request's lock — used in all CAS conditions so that
    // rollback/commit never accidentally touch a lock owned by a different request.
    const casLockToken = crypto.randomUUID();
    const myPendingValue = `__pending__:${casLockToken}`;

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
      const isPending = existingLock && existingLock.startsWith('__pending__:');

      if (existingLock && !isPending) {
        // A real lesson ID is committed — hard block.
        console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_committed lesson_id=${existingLock}`);
        return Response.json({
          error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
        }, { status: 409 });
      }

      if (isPending) {
        // Lock is pending — check TTL. Fresh = in-flight, block. Stale = orphan, allow overwrite.
        const lockAge = sp.first_week_lock_at
          ? Date.now() - new Date(sp.first_week_lock_at).getTime()
          : CAS_LOCK_TTL_MS + 1; // no timestamp = treat as expired
        if (lockAge < CAS_LOCK_TTL_MS) {
          console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_pending age_ms=${lockAge} token=${existingLock}`);
          return Response.json({
            error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
          }, { status: 409 });
        }
        // Stale lock — will overwrite using the EXACT stale value as CAS condition below.
        console.log(`[bookSlot] INFO student=${studentId} stale pending lock (age_ms=${lockAge} token=${existingLock}) — overwriting`);
      }

      // CAS: claim the lock with our unique token.
      // - No existing lock: match $exists:false
      // - Stale pending lock: match the exact stale token value (not a generic string),
      //   ensuring another request can't have already claimed it between our read and this write.
      const casCondition = isPending
        ? { user_id: studentId, first_week_lesson_id: existingLock } // exact stale value
        : { user_id: studentId, first_week_lesson_id: { $exists: false } };

      const casResult = await base44.asServiceRole.entities.StudentProfile.updateMany(
        casCondition,
        { $set: { first_week_lesson_id: myPendingValue, first_week_lock_at: new Date().toISOString() } }
      );

      if (casResult.updated === 0) {
        // Lock was claimed by someone else between our read and this write.
        console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas_lost`);
        return Response.json({
          error: 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.',
        }, { status: 409 });
      }

      casLockAcquired = true;
    }

    // Helper: rolls back OUR lock specifically — condition uses our token so we never
    // accidentally unset a lock that was already taken over by another request.
    const rollbackCasLock = async () => {
      if (!casLockAcquired) return;
      try {
        await base44.asServiceRole.entities.StudentProfile.updateMany(
          { user_id: studentId, first_week_lesson_id: myPendingValue },
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
    // Condition uses OUR token — if another request has already overwritten our lock
    // (via TTL takeover), updated=0 and we do NOT corrupt their state.
    if (casLockAcquired && lesson) {
      const commitUpdate = () =>
        base44.asServiceRole.entities.StudentProfile.updateMany(
          { user_id: studentId, first_week_lesson_id: myPendingValue },
          { $set: { first_week_lesson_id: lesson.id }, $unset: { first_week_lock_at: '' } }
        );

      try {
        const result = await commitUpdate();
        if (result.updated === 0) {
          // Our token is gone — another request claimed the lock after TTL expiry.
          // The Lesson we created is real and in the DB; the student's aula exists.
          // No state corruption: the current lock owner's commit will handle their own lesson.
          // This indicates TTL may be too short for current network latency — investigate.
          console.warn(
            `[bookSlot] WARN: CAS commit token mismatch (updated=0). student=${studentId} ` +
            `lesson_id=${lesson.id} token=${myPendingValue}. Lock was taken over by another request via TTL. ` +
            `Lesson is valid but first_week_lesson_id was not committed by this request. ` +
            `If TTL takeover is frequent, increase CAS_LOCK_TTL_MS above ${CAS_LOCK_TTL_MS}ms.`
          );
        }
      } catch (e1) {
        console.error('[bookSlot] CAS commit attempt 1 failed — retrying', e1.message);
        try {
          const result2 = await commitUpdate();
          if (result2.updated === 0) {
            console.warn(
              `[bookSlot] WARN: CAS commit retry also got updated=0 (token mismatch). student=${studentId} ` +
              `lesson_id=${lesson.id} token=${myPendingValue}. Lock taken over by another request.`
            );
          }
        } catch (e2) {
          console.error(
            `[bookSlot] CRITICAL: CAS commit failed after retry (network error). student=${studentId} ` +
            `lesson_id=${lesson.id} token=${myPendingValue}. TTL will expire in ${CAS_LOCK_TTL_MS / 1000}s. ` +
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