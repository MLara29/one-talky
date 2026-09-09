import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Daily cron — zeroes admin_gift_minutes for students whose 30-day admin gift
// expiry has passed. Fully isolated from prepaid_credits_minutes — only
// touches the admin_gift_* fields and keeps credits_minutes in sync.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const profiles = await base44.asServiceRole.entities.StudentProfile.list(null, 500);
    let expired = 0;
    const now = new Date();

    for (const sp of profiles) {
      const giftExpiresAt = sp.admin_gift_expires_at;
      const giftMinutes = sp.admin_gift_minutes || 0;

      if (giftExpiresAt && new Date(giftExpiresAt) < now && giftMinutes > 0) {
        const newPlan = sp.plan_credits_minutes || 0;
        const newPrepaid = sp.prepaid_credits_minutes || 0;
        await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
          admin_gift_minutes: 0,
          admin_gift_granted_at: null,
          admin_gift_expires_at: null,
          admin_gift_reminder_last_sent_at: null,
          credits_minutes: Math.round((newPlan + newPrepaid) * 100) / 100,
        });
        expired++;
      }
    }

    return Response.json({ success: true, checked: profiles.length, expired });
  } catch (error) {
    console.error('[expireAdminGiftCredits]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});