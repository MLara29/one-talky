import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Anonymizes (does NOT hard-delete) a student's personal data upon their
// explicit request. Lesson and payment history is retained for audit but
// stripped of the student's name. The StudentProfile is marked is_blocked
// so any future login attempt shows the BlockedScreen.
//
// BLOCKED if the student has an active subscription OR is still inside a
// grace period (subscription_valid_until in the future) — they must cancel
// first via cancelMyPlan.
//
// Future lessons are cancelled by REUSING cancelLesson (not a bulk update),
// so each tutor receives the normal cancellation notification with the
// student's real name. Only AFTER notifications are sent do we anonymize
// the student_name field on all lesson records.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'student') return Response.json({ error: 'Only students can delete their own account' }, { status: 403 });

    const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: 'Profile not found' }, { status: 404 });
    const profile = profiles[0];

    // Guard: can't delete while subscription is active or in grace period.
    const now = new Date();
    const isActive = profile.subscription_status === 'active';
    const validUntil = profile.subscription_valid_until ? new Date(profile.subscription_valid_until) : null;
    const inGrace = validUntil && validUntil > now;

    if (isActive || inGrace) {
      return Response.json({
        error: 'Cannot delete account while subscription is active or in grace period',
        blocked: true,
        reason: 'active_subscription'
      }, { status: 409 });
    }

    const ANON_NAME = 'Conta excluída';

    // ── 1. Cancel future scheduled lessons via cancelLesson (reuses existing
    // logic: releases tutor slot, releases first-week lock, notifies tutor
    // with the student's real name). No penalty/late-cancellation check exists
    // in cancelLesson, so there's nothing to skip.
    const lessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: user.id });
    const futureLessons = lessons.filter(l =>
      l.status === 'scheduled' && l.scheduled_at && new Date(l.scheduled_at) > now
    );
    for (const lesson of futureLessons) {
      try {
        await base44.functions.invoke('cancelLesson', { lesson_id: lesson.id });
      } catch (e) {
        console.error(`[deleteMyAccount] Failed to cancel lesson ${lesson.id}:`, e.message);
      }
    }

    // ── 2. Anonymize student_name across ALL lesson records (past + just-
    // cancelled). Tutors were already notified with the real name by
    // cancelLesson above; now we strip the name from the stored records.
    if (lessons.length > 0) {
      await base44.asServiceRole.entities.Lesson.bulkUpdate(
        lessons.map(l => ({ id: l.id, student_name: ANON_NAME }))
      );
    }

    // ── 3. Anonymize StudentProfile — RLS prevents self-update, so service role.
    await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
      full_name: ANON_NAME,
      photo_url: null,
      nationality: null,
      native_language: null,
      target_language: null,
      objective: null,
      accent_preference: null,
      conversation_topics: [],
      is_blocked: true,
    });

    // ── 4. Anonymize the User email — makes it non-reusable (nobody can
    // register with it again) and removes the real address. Uses .invalid
    // TLD so the anonymized address is never emailable. Wrapped in try/catch
    // because the User entity may reject email updates even via service role;
    // if so, the StudentProfile anonymization above is the primary safeguard.
    try {
      const anonEmail = `deleted_${user.id.substring(0, 12)}@anon.onetalky.invalid`;
      await base44.asServiceRole.entities.User.update(user.id, { email: anonEmail });
    } catch (e) {
      console.error('[deleteMyAccount] Could not anonymize User email:', e.message);
    }

    // ── 5. Audit log
    await base44.asServiceRole.entities.StudentAccountEvent.create({
      student_id: user.id,
      type: 'account_deleted',
      details: 'Student requested account deletion. Personal data anonymized, future lessons cancelled.',
      created_at: now.toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}