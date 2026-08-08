import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { validateBookingEligibility } from '../../shared/validateBookingEligibility.js';
import { requireNotBlocked } from '../../shared/requireNotBlocked.js';
import { acquireFirstWeekLock, rollbackFirstWeekLock, commitFirstWeekLock } from '../../shared/firstWeekLock.js';

// Minimum billable balance required to start an instant lesson — the same
// server-side gate real bookings get, so a near-zero client-reported balance
// can't be used to sneak into a lesson.
const MIN_CREDIT_MINUTES = 1;

// Same "1 lesson / 30 min" rule scheduled bookings enforce during the first
// 7 days of subscription cycle 1 — instant lessons are not exempt.
const FIRST_WEEK_DURATION_MINUTES = 30;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'student') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tutor_user_id } = await req.json();
    if (!tutor_user_id) {
      return Response.json({ error: 'Missing required param: tutor_user_id' }, { status: 400 });
    }

    // ── RULE 0: Blocked students cannot start lessons ───────────────────────────
    const blockedGate = await requireNotBlocked(base44, user.id);
    if (!blockedGate.ok) return Response.json({ error: blockedGate.error }, { status: blockedGate.status });

    // ── RULE 1: Subscription / first-week eligibility (same rule as bookSlot) ──
    const nowIso = new Date().toISOString();
    const eligibility = await validateBookingEligibility(base44, user.id, nowIso, FIRST_WEEK_DURATION_MINUTES);
    if (!eligibility.allowed) {
      console.log(`[startInstantLesson] REJECTED student=${user.id} reason=${eligibility.error}`);
      return Response.json({ error: eligibility.error, error_code: eligibility.error_code }, { status: eligibility.httpStatus || 403 });
    }

    // ── RULE 2: Real credit balance (server-side, never trust the client) ──────
    const spProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    const sp = spProfiles[0];
    const credits = (sp?.plan_credits_minutes || 0) + (sp?.prepaid_credits_minutes || 0);
    if (credits < MIN_CREDIT_MINUTES) {
      return Response.json({
        error_code: 'insufficient_credits',
        error: 'Você não tem minutos suficientes para iniciar uma aula. Adicione créditos para continuar.',
      }, { status: 403 });
    }

    // ── RULE 3: First-week CAS lock (shared with bookSlot) ──────────────────────
    const lockResult = await acquireFirstWeekLock(base44, user.id, sp);
    if (!lockResult.ok) {
      console.log(`[startInstantLesson] REJECTED student=${user.id} reason=first_week_cas`);
      return Response.json({ error: lockResult.error }, { status: lockResult.status });
    }
    const casLockAcquired = lockResult.acquired;
    const casLockToken = lockResult.token;
    const rollbackCasLock = () => rollbackFirstWeekLock(base44, user.id, casLockToken);

    // ── Tutor must exist and actually be available ─────────────────────────────
    let lesson = null;
    try {
      const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: tutor_user_id });
      const tutorProfile = tutorProfiles[0];
      if (!tutorProfile) {
        await rollbackCasLock();
        return Response.json({ error: 'Tutor not found' }, { status: 404 });
      }
      if (tutorProfile.in_lesson) {
        await rollbackCasLock();
        return Response.json({ error: 'Este tutor já está em uma aula.' }, { status: 409 });
      }

      lesson = await base44.asServiceRole.entities.Lesson.create({
        tutor_id: tutor_user_id,
        student_id: user.id,
        tutor_name: tutorProfile.display_name || tutorProfile.full_name || '',
        student_name: sp?.full_name || user.full_name || '',
        language: tutorProfile.native_languages?.[0] || 'english',
        status: 'in_progress',
        type: 'instant',
        started_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.TutorProfile.update(tutorProfile.id, { in_lesson: true });

      await base44.asServiceRole.entities.Notification.create({
        user_id: tutor_user_id,
        title: '📞 Live lesson started!',
        message: `${lesson.student_name} is waiting for you in the ${lesson.language} lesson. Join now!`,
        type: 'lesson_booked',
        link: `/classroom/${lesson.id}`,
        is_read: false,
      });
    } catch (innerErr) {
      await rollbackCasLock();
      throw innerErr;
    }

    if (casLockAcquired && lesson) {
      await commitFirstWeekLock(base44, user.id, casLockToken, lesson.id);
    }

    return Response.json({ success: true, lesson });

  } catch (error) {
    console.error('[startInstantLesson]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}