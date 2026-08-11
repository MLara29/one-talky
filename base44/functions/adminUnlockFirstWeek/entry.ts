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

    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ id: student_profile_id });
    const sp = profiles[0];
    if (!sp) return Response.json({ error: 'Aluno não encontrado' }, { status: 404 });

    // Cancelar qualquer aula "scheduled" dentro da janela de 7 dias da
    // primeira semana, para não deixar resíduo conflitante ao destravar.
    const subStartDate = sp.subscription_start_date ? new Date(sp.subscription_start_date) : null;
    if (subStartDate) {
      const sevenDaysAfter = new Date(subStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const conflictingLessons = await base44.asServiceRole.entities.Lesson.filter({
        student_id: sp.user_id, status: 'scheduled',
      });
      for (const l of conflictingLessons) {
        const lessonDate = new Date(l.scheduled_at);
        if (lessonDate >= subStartDate && lessonDate < sevenDaysAfter) {
          await base44.asServiceRole.entities.Lesson.update(l.id, { status: 'cancelled' });
          console.log(`[adminUnlockFirstWeek] Cancelled conflicting scheduled lesson=${l.id} for student=${sp.user_id}`);
        }
      }
    }

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