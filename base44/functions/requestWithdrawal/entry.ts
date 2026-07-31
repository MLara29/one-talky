import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';
import { computeTutorEarned, parsePioneerEmail } from '../../shared/tutorEarnings.js';

// Tutor requests a withdrawal. The amount is always computed server-side from
// completed lessons — never accepted as client input.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'tutor') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const profiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ error: 'Tutor profile not found' }, { status: 404 });

    const pioneerEmail = parsePioneerEmail(profile.bank_info);
    if (!pioneerEmail) {
      return Response.json({ error: 'Payoneer email not set. Please add it in Personal Info first.' }, { status: 400 });
    }

    const { earned } = await computeTutorEarned(base44, user.id);
    if (earned <= 0) {
      return Response.json({ error: 'No available balance to withdraw' }, { status: 400 });
    }

    // CAS guard: atomically flip has_pending_withdrawal false -> true. If two
    // requests race, only one wins this update — the other gets updated: 0.
    const cas = await base44.asServiceRole.entities.TutorProfile.updateMany(
      { id: profile.id, has_pending_withdrawal: { $ne: true } },
      { $set: { has_pending_withdrawal: true } }
    );
    if (cas.updated === 0) {
      return Response.json({ error: 'A withdrawal request is already pending' }, { status: 400 });
    }

    const today = new Date();
    const period = `${today.toLocaleString('en-US', { month: 'long' })} ${today.getDate()}`;

    try {
      await base44.asServiceRole.entities.WithdrawalRequest.create({
        tutor_id: user.id, tutor_name: profile.full_name,
        amount: earned, period, pioneer_email: pioneerEmail, status: 'pending',
      });
    } catch (createErr) {
      // Roll back the lock if creation failed, so the tutor isn't stuck locked out.
      await base44.asServiceRole.entities.TutorProfile.update(profile.id, { has_pending_withdrawal: false });
      throw createErr;
    }

    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      await base44.asServiceRole.entities.Notification.bulkCreate(
        admins.map(a => ({
          user_id: a.id,
          title: `💸 Solicitação de pagamento: ${profile.full_name}`,
          message: `Tutor ${profile.full_name} solicitou retirada de $${earned.toFixed(2)} via ${profile.contract_type === 'upwork' ? 'Upwork' : 'Payoneer'}.`,
          type: 'general',
          is_read: false,
          link: '/admin/earnings',
        }))
      );
    } catch (e) {
      console.warn('[requestWithdrawal] admin notify failed:', e.message);
    }

    return Response.json({ success: true, amount: earned });
  } catch (error) {
    console.error('[requestWithdrawal]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});