import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';
import { getTransporter, SMTP_FROM, sendMailAndLog } from '../../shared/mailer.js';
import { buildFreeMinutesEmail, langForCountry } from '../../shared/freeMinutesEmail.js';

// Admin-only student profile moderation actions (block/unblock, delete, add credit minutes).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { student_id, action, minutes } = await req.json();
    if (!student_id || !['toggle_block', 'delete', 'add_minutes'].includes(action)) {
      return Response.json({ error: 'student_id and valid action are required' }, { status: 400 });
    }

    const student = await base44.asServiceRole.entities.StudentProfile.get(student_id);
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

    if (action === 'delete') {
      // Antes de excluir o aluno, remove também as comissões de afiliado
      // vinculadas a ele — senão ficam registros "fantasmas" apontando pra
      // um aluno que não existe mais na tela de afiliados do admin.
      try {
        const earnings = await base44.asServiceRole.entities.AffiliateEarning.filter({ student_id: student.user_id });
        for (const earning of earnings) {
          await base44.asServiceRole.entities.AffiliateEarning.delete(earning.id);
        }
      } catch (e) {
        console.error('[adminManageStudent] failed to clean up affiliate earnings for student', student_id, e.message);
      }

      await base44.asServiceRole.entities.StudentProfile.delete(student_id);
      return Response.json({ success: true, deleted: true });
    }

    if (action === 'toggle_block') {
      // Blocking is a dedicated flag — it never touches `plan`, which must
      // always remain one of the real plan values (free/basic/standard/premium).
      const newBlocked = !student.is_blocked;
      await base44.asServiceRole.entities.StudentProfile.update(student_id, { is_blocked: newBlocked });
      return Response.json({ success: true, is_blocked: newBlocked });
    }

    if (action === 'add_minutes') {
      const mins = Number(minutes);
      if (!Number.isFinite(mins) || mins === 0) return Response.json({ error: 'Invalid minutes value' }, { status: 400 });

      const now = new Date();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const newPrepaid = student.prepaid_credits_minutes ?? 0;

      if (mins > 0) {
        // ── ADD: credit to admin_gift_minutes (30-day expiry, fully isolated
        //    from prepaid_credits_minutes so purchased credits are never affected).
        //    If the student already has a non-expired admin gift, add to the
        //    existing balance and keep the LATER of (existing expiry, now+30d)
        //    so we never shorten a previously-granted deadline.
        const existingGift = student.admin_gift_minutes ?? 0;
        const existingExpiry = student.admin_gift_expires_at ? new Date(student.admin_gift_expires_at) : null;
        const newExpiryCandidate = new Date(now.getTime() + THIRTY_DAYS_MS);
        const giftStillActive = existingExpiry && existingExpiry > now;
        const newGiftTotal = giftStillActive ? existingGift + mins : mins;
        const newGiftExpiry = giftStillActive
          ? (existingExpiry > newExpiryCandidate ? existingExpiry : newExpiryCandidate)
          : newExpiryCandidate;
        const planCredits = student.plan_credits_minutes ?? 0;
        const newCreditsTotal = Math.round((planCredits + newPrepaid + newGiftTotal) * 100) / 100;

        await base44.asServiceRole.entities.StudentProfile.update(student_id, {
          admin_gift_minutes: Math.round(newGiftTotal * 100) / 100,
          admin_gift_granted_at: now.toISOString(),
          admin_gift_expires_at: newGiftExpiry.toISOString(),
          credits_minutes: newCreditsTotal,
        });

        // Send the initial "free minutes granted" email (fire-and-forget).
        try {
          const studentUser = await base44.asServiceRole.entities.User.get(student.user_id);
          if (studentUser?.email) {
            const lang = langForCountry(student.nationality);
            const { subject, html } = buildFreeMinutesEmail({ studentName: student.full_name, minutes: mins, lang });
            const transporter = getTransporter();
            await sendMailAndLog(base44, transporter, {
              from: SMTP_FROM(),
              to: studentUser.email,
              subject,
              html,
              _sentBy: user.id,
            }, 'free_minutes_granted');
          }
        } catch (emailErr) {
          console.error('[adminManageStudent] Falha ao enviar e-mail de minutos grátis:', emailErr.message);
        }

        return Response.json({ success: true, credits_minutes: newCreditsTotal });
      }

      // ── REMOVE (mins < 0): still debits plan_credits_minutes (unchanged
      //    behavior). Never makes the balance negative — floor at 0.
      //    Never touches prepaid or admin_gift.
      const newPlanTotal = Math.max(0, (student.plan_credits_minutes ?? 0) + mins);
      const adminGift = student.admin_gift_minutes ?? 0;
      const newCreditsTotal = Math.round((newPlanTotal + newPrepaid + adminGift) * 100) / 100;
      await base44.asServiceRole.entities.StudentProfile.update(student_id, {
        plan_credits_minutes: newPlanTotal,
        credits_minutes: newCreditsTotal,
      });
      return Response.json({ success: true, credits_minutes: newCreditsTotal });
    }
  } catch (error) {
    console.error('[adminManageStudent]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});