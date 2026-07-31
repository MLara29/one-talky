import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireOtp } from '../../shared/requireOtp.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, targetUserId } = await req.json();
    if (!['student', 'tutor', 'affiliate'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Admin can set any role on any user by passing targetUserId
    if (targetUserId) {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const otpGate = await requireOtp(base44, req, user);
      if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });
      await base44.asServiceRole.entities.User.update(targetUserId, { role });
    } else {
      // Self-update: only allow non-privileged roles (tutor/affiliate require admin approval)
      const SELF_ASSIGNABLE_ROLES = ['student'];
      if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
        return Response.json({ error: 'Forbidden: privileged role requires admin assignment' }, { status: 403 });
      }
      await base44.asServiceRole.entities.User.update(user.id, { role });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[setUserRole]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});