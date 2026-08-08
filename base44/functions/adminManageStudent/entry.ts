import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';

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
      if (!mins || mins <= 0) return Response.json({ error: 'Invalid minutes value' }, { status: 400 });
      // Admin-granted minutes go to plan_credits_minutes (no expiry while active).
      const newPlanTotal = (student.plan_credits_minutes ?? 0) + mins;
      const newPrepaid = student.prepaid_credits_minutes ?? 0;
      await base44.asServiceRole.entities.StudentProfile.update(student_id, {
        plan_credits_minutes: newPlanTotal,
        credits_minutes: newPlanTotal + newPrepaid,
      });
      return Response.json({ success: true, credits_minutes: newPlanTotal + newPrepaid });
    }
  } catch (error) {
    console.error('[adminManageStudent]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});