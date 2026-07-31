import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import nodemailer from 'npm:nodemailer@6.9.14';
import { requireOtp } from '../../shared/requireOtp.js';
import { computeTutorEarned, parsePioneerEmail } from '../../shared/tutorEarnings.js';

// Admin-only tutor payment lifecycle: mark_processing / mark_paid.
// The withdrawal amount is always computed server-side from lesson/withdrawal
// history — never taken from client input.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { tutor_id, action } = await req.json();
    if (!tutor_id || !['mark_processing', 'mark_paid'].includes(action)) {
      return Response.json({ error: 'tutor_id and valid action are required' }, { status: 400 });
    }

    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: tutor_id });
    const tutor = tutorProfiles[0];
    if (!tutor) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    const tutorUser = await base44.asServiceRole.entities.User.get(tutor_id);

    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
      secure: parseInt(Deno.env.get('SMTP_PORT') || '465') === 465,
      auth: { user: Deno.env.get('SMTP_USER'), pass: Deno.env.get('SMTP_PASS') },
    });
    const sendPaymentEmail = async (subject, html) => {
      if (!tutorUser?.email) return;
      try {
        await transporter.sendMail({ from: Deno.env.get('SMTP_FROM'), to: tutorUser.email, subject, html });
      } catch (e) {
        console.warn('[adminManageWithdrawal] email failed:', e.message);
      }
    };

    if (action === 'mark_processing') {
      const { earned } = await computeTutorEarned(base44, tutor_id, tutor.price_per_minute);
      const existing = await base44.asServiceRole.entities.WithdrawalRequest.filter({ tutor_id, status: 'pending' });

      if (existing[0]) {
        await base44.asServiceRole.entities.WithdrawalRequest.update(existing[0].id, { status: 'processing' });
      } else {
        const pioneerEmail = parsePioneerEmail(tutor.bank_info);
        await base44.asServiceRole.entities.WithdrawalRequest.create({
          tutor_id, tutor_name: tutor.full_name, amount: earned,
          period: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          pioneer_email: pioneerEmail || '', status: 'processing',
        });
      }

      await sendPaymentEmail(
        '💸 Your payment is being processed – One Talky',
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px">
          <h2 style="color:#F26A1B;margin-bottom:8px">Hi, ${tutor.full_name}! 👋</h2>
          <p style="color:#374151;font-size:16px">Your payment of <strong style="color:#10b981">$${earned.toFixed(2)}</strong> is currently being processed by the One Talky team.</p>
          <p style="color:#374151;font-size:15px">You will receive another email once the payment has been sent to your account.</p>
          <p style="color:#6b7280;font-size:13px;margin-top:24px">If you have any questions, please reach out through the platform support.</p>
          <p style="color:#6b7280;font-size:13px">The One Talky Team 🧡</p>
        </div>`
      );

      return Response.json({ success: true });
    }

    if (action === 'mark_paid') {
      const wrList = await base44.asServiceRole.entities.WithdrawalRequest.filter({ tutor_id, status: 'processing' });
      const wr = wrList[0];
      if (wr) {
        await base44.asServiceRole.entities.WithdrawalRequest.update(wr.id, { status: 'paid' });
      }

      await sendPaymentEmail(
        '✅ Payment sent! Please confirm receipt – One Talky',
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px">
          <h2 style="color:#F26A1B;margin-bottom:8px">Hi, ${tutor.full_name}! 🎉</h2>
          <p style="color:#374151;font-size:16px">Your payment of <strong style="color:#10b981">$${(wr?.amount || 0).toFixed(2)}</strong> has been successfully sent!</p>
          <p style="color:#374151;font-size:15px">Please log in to <strong>One Talky</strong> and confirm receipt in your earnings section.</p>
          <a href="https://onetalky.base44.app/earnings" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#F26A1B;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Confirm receipt →</a>
          <p style="color:#6b7280;font-size:13px;margin-top:24px">If you have any questions, please reach out through the platform support.</p>
          <p style="color:#6b7280;font-size:13px">The One Talky Team 🧡</p>
        </div>`
      );

      return Response.json({ success: true });
    }
  } catch (error) {
    console.error('[adminManageWithdrawal]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});