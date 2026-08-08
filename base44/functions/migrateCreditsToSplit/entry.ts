import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from '../../shared/requireOtp.js';

// ONE-TIME migration — splits the single credits_minutes field into
// plan_credits_minutes + prepaid_credits_minutes for all existing StudentProfiles.
//
// Since there's no historical way to know the origin of each minute, ALL existing
// credits_minutes go to plan_credits_minutes (no retroactive expiry). The new
// prepaid_credits_minutes starts at 0, and prepaid_expires_at stays null.
//
// Idempotent: only migrates profiles where plan_credits_minutes is null/0 AND
// credits_minutes > 0. Safe to run multiple times.
//
// Admin-triggered (requires OTP).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const profiles = await base44.asServiceRole.entities.StudentProfile.list(null, 500);
    let migrated = 0;
    let skipped = 0;

    for (const sp of profiles) {
      const currentCredits = sp.credits_minutes ?? 0;
      const currentPlanCredits = sp.plan_credits_minutes ?? 0;

      // Skip if already migrated (plan_credits_minutes already set and matches)
      // or if there's nothing to migrate.
      if (currentCredits === 0 && currentPlanCredits === 0) {
        skipped++;
        continue;
      }
      // If plan_credits_minutes is already set and credits_minutes is 0, skip.
      if (currentPlanCredits > 0 && currentCredits === 0) {
        skipped++;
        continue;
      }

      await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
        plan_credits_minutes: currentPlanCredits + currentCredits,
        prepaid_credits_minutes: sp.prepaid_credits_minutes ?? 0,
      });
      migrated++;
    }

    return Response.json({
      success: true,
      total: profiles.length,
      migrated,
      skipped,
    });
  } catch (error) {
    console.error('[migrateCreditsToSplit]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}