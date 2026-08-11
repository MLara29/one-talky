import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

// Admin-only: manually release the "first week" booking lock on a student
// profile, allowing them to book/start another lesson before the 7-day
// window elapses. Requires 2FA (OTP) since it overrides a business rule.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { student_profile_id } = await req.json();
    if (!student_profile_id) return Response.json({ error: 'student_profile_id required' }, { status: 400 });

    await base44.asServiceRole.entities.StudentProfile.update(student_profile_id, {
      first_week_lesson_id: null,
      first_week_lock_at: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[adminUnlockFirstWeek]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});