import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Daily cron — zeroes prepaid_credits_minutes for students whose prepaid expiry
// has passed. The expiry is set by computeCreditUpdate (now + 60 days for packs,
// or the coupon's bonus_minutes_expires_at for coupon bonus minutes).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const profiles = await base44.asServiceRole.entities.StudentProfile.list(null, 500);
    let expired = 0;
    const now = new Date();

    for (const sp of profiles) {
      const prepaidExpiresAt = sp.prepaid_expires_at;
      const prepaidCredits = sp.prepaid_credits_minutes || 0;

      if (prepaidExpiresAt && new Date(prepaidExpiresAt) < now && prepaidCredits > 0) {
        const newPlan = sp.plan_credits_minutes || 0;
        await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
          prepaid_credits_minutes: 0,
          prepaid_expires_at: null,
          credits_minutes: newPlan, // keep deprecated field in sync
        });
        expired++;
      }
    }

    return Response.json({ success: true, checked: profiles.length, expired });
  } catch (error) {
    console.error('[expirePrepaidCredits]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});