import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getTransporter, SMTP_FROM, sendMailAndLog } from '../../shared/mailer.js';
import { buildFreeMinutesReminderEmail, langForCountry } from '../../shared/freeMinutesReminderEmail.js';

// Weekly cron — sends a reminder email to students who received admin-granted
// free minutes (admin_gift_minutes > 0) and haven't used them yet (no completed
// lessons since admin_gift_granted_at). Stops automatically when:
//   - The student completes at least 1 lesson since the grant (used the benefit)
//   - admin_gift_minutes reaches 0 (fully consumed)
//   - admin_gift_expires_at passes (expired — handled by expireAdminGiftCredits)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const profiles = await base44.asServiceRole.entities.StudentProfile.list(null, 500);
    let sent = 0;
    let skipped = 0;

    for (const sp of profiles) {
      const giftMinutes = sp.admin_gift_minutes || 0;
      if (giftMinutes <= 0) continue;

      const giftExpiresAt = sp.admin_gift_expires_at ? new Date(sp.admin_gift_expires_at) : null;
      if (!giftExpiresAt || giftExpiresAt <= now) continue; // expired — handled by expireAdminGiftCredits

      // Check reminder cadence — at least 7 days since last reminder (or never sent).
      const lastReminder = sp.admin_gift_reminder_last_sent_at ? new Date(sp.admin_gift_reminder_last_sent_at) : null;
      if (lastReminder && (now.getTime() - lastReminder.getTime()) < SEVEN_DAYS_MS) {
        skipped++;
        continue;
      }

      // Check if the student has completed any lessons since the grant.
      // If they have, they've started using the benefit — stop reminding.
      const grantedAt = sp.admin_gift_granted_at ? new Date(sp.admin_gift_granted_at) : null;
      if (grantedAt) {
        const lessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: sp.user_id });
        const hasCompletedSinceGrant = lessons.some(l => {
          if (l.status !== 'completed') return false;
          if (!l.ended_at) return false;
          return new Date(l.ended_at) >= grantedAt;
        });
        if (hasCompletedSinceGrant) {
          skipped++;
          continue;
        }
      }

      // Send the reminder email (fire-and-forget — never blocks the loop).
      try {
        const studentUser = await base44.asServiceRole.entities.User.get(sp.user_id);
        if (studentUser?.email) {
          const lang = langForCountry(sp.nationality);
          const daysRemaining = Math.max(1, Math.ceil((giftExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
          const { subject, html } = buildFreeMinutesReminderEmail({
            studentName: sp.full_name,
            minutes: giftMinutes,
            daysRemaining,
            lang,
          });
          const transporter = getTransporter();
          await sendMailAndLog(base44, transporter, {
            from: SMTP_FROM(),
            to: studentUser.email,
            subject,
            html,
            _sentBy: 'system',
          }, 'free_minutes_reminder');
        }

        // Update the reminder timestamp so we don't send again for 7 days.
        await base44.asServiceRole.entities.StudentProfile.update(sp.id, {
          admin_gift_reminder_last_sent_at: now.toISOString(),
        });
        sent++;
      } catch (emailErr) {
        console.error(`[sendFreeMinutesReminders] Failed for student=${sp.user_id}:`, emailErr.message);
      }
    }

    return Response.json({ success: true, checked: profiles.length, sent, skipped });
  } catch (error) {
    console.error('[sendFreeMinutesReminders]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});