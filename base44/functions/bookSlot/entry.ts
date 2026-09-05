import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { validateBookingEligibility } from '../../shared/validateBookingEligibility.js';
import { normalizeSlot } from '../../shared/slotUtils.js';
import { requireOtp } from '../../shared/requireOtp.js';
import { requireNotBlocked } from '../../shared/requireNotBlocked.js';
import { acquireFirstWeekLock, rollbackFirstWeekLock, commitFirstWeekLock } from '../../shared/firstWeekLock.js';
import { sendAdminBookingNotification } from '../../shared/adminBookingNotification.js';

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

    // ── Tutor's minimum booking notice ──────────────────────────────────────────
    const tutorProfileForNoticeCheck = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: tutor_user_id });
    const tutorProfileNotice = tutorProfileForNoticeCheck[0];
    const minNoticeHours = tutorProfileNotice?.min_booking_notice_hours || 0;
    if (minNoticeHours > 0) {
      const minLeadMs = minNoticeHours * 60 * 60 * 1000;
      const leadTimeMs = new Date(scheduled_at).getTime() - Date.now();
      if (leadTimeMs < minLeadMs) {
        return Response.json({
          error: `Este tutor exige agendamento com pelo menos ${minNoticeHours}h de antecedência.`,
        }, { status: 400 });
      }
    }

    // ── Tutor scheduling suspension (no-show penalty) ───────────────────────────
    // A tutor with scheduling_suspended_until in the future cannot have new scheduled
    // lessons booked, but instant lessons remain available.
    if (tutorProfileNotice?.scheduling_suspended_until) {
      const suspendedUntil = new Date(tutorProfileNotice.scheduling_suspended_until);
      if (suspendedUntil > new Date()) {
        return Response.json({
          error: `Este tutor está temporariamente indisponível para agendamentos (suspensão por faltas). Tente novamente após ${suspendedUntil.toLocaleDateString('pt-BR')}.`,
          error_code: 'tutor_suspended',
        }, { status: 403 });
      }
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
      return Response.json({ error: eligibility.error, error_code: eligibility.error_code }, { status: eligibility.httpStatus || 403 });
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

    const lockResult = await acquireFirstWeekLock(base44, studentId, sp, scheduled_at);
    if (!lockResult.ok) {
      console.log(`[bookSlot] REJECTED student=${studentId} reason=first_week_cas`);
      return Response.json({ error: lockResult.error }, { status: lockResult.status });
    }
    const casLockAcquired = lockResult.acquired;
    const casLockToken = lockResult.token;

    const rollbackCasLock = () => rollbackFirstWeekLock(base44, studentId, casLockToken);

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
          tutor_name: tutorProfile.display_name || tutorProfile.full_name || tutor_name || '',
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
    if (casLockAcquired && lesson) {
      await commitFirstWeekLock(base44, studentId, casLockToken, lesson.id);
    }

    // ── Send admin booking notification email ──────────────────────────────────
    // Fire-and-forget: a failed email must never break the booking flow.
    if (lesson) {
      try {
        let studentDisplayName = student_name || '';
        if (!studentDisplayName) {
          const spForName = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: studentId }).catch(() => []);
          studentDisplayName = spForName[0]?.full_name || user.email || '';
        }
        await sendAdminBookingNotification(base44, {
          lesson,
          tutorProfile,
          studentName: studentDisplayName,
          studentEmail: user.email,
        });
      } catch (e) {
        console.warn('[bookSlot] admin booking notification failed:', e.message);
      }
    }

    return Response.json({ success: true, booked_slots: updatedSlots, lesson });

  } catch (error) {
    console.error('[bookSlot]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}