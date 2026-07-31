import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSessionHash } from '../../shared/sessionHash.js';

// Tells the frontend whether the CURRENT session (not "this user anywhere")
// has completed 2FA, so two tabs/devices of the same admin/tutor never show
// a false "verified" state for each other.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin' && user.role !== 'tutor') {
      return Response.json({ required: false, verified: true });
    }

    const session = await getSessionHash(req);
    if (!session?.hash) return Response.json({ required: true, verified: false });

    const verifiedSessions = await base44.asServiceRole.entities.OtpVerifiedSession.filter({
      user_id: user.id,
      session_hash: session.hash,
    });
    const now = new Date();
    const verified = verifiedSessions.some(s => s.expires_at && new Date(s.expires_at) > now);

    return Response.json({ required: true, verified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});