import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Daily cron — zeroes plan_credits_minutes for students whose post-cancellation
// grace period has expired. The grace period is set by cancelMyPlan (MP) or
// handleSubscriptionDeleted (Stripe) as plan_credits_grace_expires_at = now + 60 days.
// While the subscription is active, plan_credits_grace_expires_at is null and
// plan credits never expire.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const profiles = await base44.asServiceRole.entities.StudentProfile.list(null, 500);
    let expired = 0;
    const now = new Date();

    for (const sp of profiles) {
      const graceExpiresAt = sp.plan_credits_grace_expires_at;
      const planCredits = sp.plan_credits_minutes || 0;

      if (graceExpiresAt && new Date(graceExpiresAt) < now && planCredits > 0) {
        const newPrepaid = sp.prepaid_credits_minutes || 0;
        await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
          plan_credits_minutes: 0,
          plan_credits_grace_expires_at: null,
          credits_minutes: newPrepaid, // keep deprecated field in sync
        });
        expired++;
      }
    }

    return Response.json({ success: true, checked: profiles.length, expired });
  } catch (error) {
    console.error('[expirePlanGraceCredits]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});