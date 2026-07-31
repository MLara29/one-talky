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
      const newPlan = student.plan === 'blocked' ? 'free' : 'blocked';
      await base44.asServiceRole.entities.StudentProfile.update(student_id, { plan: newPlan });
      return Response.json({ success: true, plan: newPlan });
    }

    if (action === 'add_minutes') {
      const mins = Number(minutes);
      if (!mins || mins <= 0) return Response.json({ error: 'Invalid minutes value' }, { status: 400 });
      const newTotal = (student.credits_minutes ?? 0) + mins;
      await base44.asServiceRole.entities.StudentProfile.update(student_id, { credits_minutes: newTotal });
      return Response.json({ success: true, credits_minutes: newTotal });
    }
  } catch (error) {
    console.error('[adminManageStudent]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});