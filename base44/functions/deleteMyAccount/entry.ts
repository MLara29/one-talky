import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Anonymizes (does NOT hard-delete) a student's personal data upon their
// explicit request. Lesson and payment history is retained for audit but
// stripped of the student's name. The StudentProfile is marked is_blocked
// so any future login attempt shows the BlockedScreen.
//
// BLOCKED if the student has an active subscription OR is still inside a
// grace period (subscription_valid_until in the future) — they must cancel
// first via cancelMyPlan.
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

    // Anonymize StudentProfile — RLS prevents self-update, so service role.
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

    // Anonymize student_name across all Lesson records; cancel any future
    // scheduled lessons (student won't be able to attend with a blocked account).
    const lessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: user.id });
    if (lessons.length > 0) {
      const updates = lessons.map(l => {
        const isFuture = l.status === 'scheduled' && l.scheduled_at && new Date(l.scheduled_at) > now;
        return {
          id: l.id,
          student_name: ANON_NAME,
          ...(isFuture ? { status: 'cancelled', notes: 'Conta excluída pelo aluno' } : {}),
        };
      });
      await base44.asServiceRole.entities.Lesson.bulkUpdate(updates);
    }

    // Audit log
    await base44.asServiceRole.entities.StudentAccountEvent.create({
      student_id: user.id,
      type: 'account_deleted',
      details: 'Student requested account deletion. Personal data anonymized.',
      created_at: now.toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}