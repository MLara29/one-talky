// Shared first-week (subscription cycle 1, first 7 days) CAS lock helpers.
// Used by every entry point that creates a Lesson for a student (bookSlot,
// startInstantLesson, ...) so the "1 lesson / 30 min in the first 7 days"
// business rule can never be bypassed by adding a new booking path.
//
// TTL covers: StudentProfile.get/update + TutorProfile.get/update + Lesson.create + network hops.
const CAS_LOCK_TTL_MS = 90_000;

export function isFirstWeekWindow(sp) {
  if (!sp) return false;
  const subCycle = sp.subscription_cycle || 0;
  const subStartDate = sp.subscription_start_date ? new Date(sp.subscription_start_date) : null;
  if (subCycle !== 1 || !subStartDate) return false;
  const sevenDaysAfterStart = new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Date() < sevenDaysAfterStart;
}

const BLOCKED_MESSAGE = 'Durante os primeiros 7 dias da sua assinatura, você pode agendar apenas 1 aula de 30 minutos.';

/**
 * Attempts to acquire the first-week CAS lock for a student.
 * Returns:
 *  - { ok: true, acquired: false } when the student isn't in the first-week window (no lock needed)
 *  - { ok: true, acquired: true, token } when the lock was claimed
 *  - { ok: false, status, error } when blocked (committed lesson exists or lock is fresh/taken)
 */
export async function acquireFirstWeekLock(base44, studentId, sp) {
  if (!isFirstWeekWindow(sp)) return { ok: true, acquired: false };

  const blockedError = { ok: false, status: 409, error: BLOCKED_MESSAGE };

  const existingLock = sp.first_week_lesson_id;
  const isPending = existingLock && existingLock.startsWith('__pending__:');

  if (existingLock && !isPending) return blockedError;

  if (isPending) {
    const lockAge = sp.first_week_lock_at
      ? Date.now() - new Date(sp.first_week_lock_at).getTime()
      : CAS_LOCK_TTL_MS + 1;
    if (lockAge < CAS_LOCK_TTL_MS) return blockedError;
  }

  const casLockToken = crypto.randomUUID();
  const myPendingValue = `__pending__:${casLockToken}`;
  const casCondition = isPending
    ? { user_id: studentId, first_week_lesson_id: existingLock }
    : { user_id: studentId, $or: [
        { first_week_lesson_id: null },
        { first_week_lesson_id: { $exists: false } },
      ] };

  const casResult = await base44.asServiceRole.entities.StudentProfile.updateMany(
    casCondition,
    { $set: { first_week_lesson_id: myPendingValue, first_week_lock_at: new Date().toISOString() } }
  );

  if (casResult.updated === 0) return blockedError;

  return { ok: true, acquired: true, token: myPendingValue };
}

// Releases OUR lock specifically (condition uses our token) so we never clobber
// a lock already taken over by another request after TTL expiry.
export async function rollbackFirstWeekLock(base44, studentId, token) {
  if (!token) return;
  try {
    await base44.asServiceRole.entities.StudentProfile.updateMany(
      { user_id: studentId, first_week_lesson_id: token },
      { $unset: { first_week_lesson_id: '', first_week_lock_at: '' } }
    );
  } catch (e) {
    console.error('[firstWeekLock] rollback failed — student may need manual unblock', studentId, e.message);
  }
}

// Commits the lock to the real lesson id, with one retry on transient failure.
export async function commitFirstWeekLock(base44, studentId, token, lessonId) {
  if (!token) return;
  const commitUpdate = () => base44.asServiceRole.entities.StudentProfile.updateMany(
    { user_id: studentId, first_week_lesson_id: token },
    { $set: { first_week_lesson_id: lessonId }, $unset: { first_week_lock_at: '' } }
  );
  try {
    const result = await commitUpdate();
    if (result.updated === 0) {
      console.warn(`[firstWeekLock] WARN: CAS commit token mismatch. student=${studentId} lesson_id=${lessonId} — lock taken over by another request.`);
    }
  } catch (e1) {
    console.error('[firstWeekLock] commit attempt 1 failed — retrying', e1.message);
    try {
      const result2 = await commitUpdate();
      if (result2.updated === 0) {
        console.warn(`[firstWeekLock] WARN: CAS commit retry also got updated=0. student=${studentId} lesson_id=${lessonId}`);
      }
    } catch (e2) {
      console.error(`[firstWeekLock] CRITICAL: CAS commit failed after retry. student=${studentId} lesson_id=${lessonId}. Manual check required.`, e2.message);
    }
  }
}