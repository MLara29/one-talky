import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSessionHash } from '../../shared/sessionHash.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ error: 'Code is required' }, { status: 400 });

    const session = await getSessionHash(req);
    if (!session?.hash) return Response.json({ success: false, message: 'Sessão inválida.' }, { status: 400 });

    // Only OTPs issued for THIS session's token hash can verify it — a code
    // sent to another tab/device never matches here.
    const otps = await base44.asServiceRole.entities.OtpCode.filter({
      user_id: user.id,
      used: false,
      session_token: session.hash,
    });

    const now = new Date();
    const validOtp = otps.find(otp =>
      otp.code === String(code).trim() && new Date(otp.expires_at) > now
    );

    if (!validOtp) {
      return Response.json({ success: false, message: 'Código inválido ou expirado.' }, { status: 400 });
    }

    // Mark as used
    await base44.asServiceRole.entities.OtpCode.update(validOtp.id, { used: true });

    // Grant verified status to THIS session only — other tabs/devices logged
    // in as the same user remain unverified until they complete their own OTP.
    const expiresAt = session.exp || new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.OtpVerifiedSession.create({
      user_id: user.id,
      session_hash: session.hash,
      verified_at: now.toISOString(),
      expires_at: expiresAt,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});