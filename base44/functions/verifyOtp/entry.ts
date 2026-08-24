import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSessionHash } from '../../shared/sessionHash.js';

const MAX_ATTEMPTS = 5;
const GENERIC_ERROR = 'Código inválido ou expirado.';

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
    // Active = unused AND not expired
    const activeOtps = otps.filter(otp => new Date(otp.expires_at) > now);

    // Rate limiting: sum attempts across all active codes for this session.
    // If total >= MAX_ATTEMPTS, invalidate everything and force a new code.
    const totalAttempts = activeOtps.reduce((sum, otp) => sum + (otp.attempts || 0), 0);
    if (totalAttempts >= MAX_ATTEMPTS) {
      // Invalidate all active codes so a new one must be requested via sendOtp
      await Promise.all(
        activeOtps.map(otp =>
          base44.asServiceRole.entities.OtpCode.update(otp.id, { used: true })
        )
      );
      // Same generic message — no hint that the block was from too many attempts
      return Response.json({ success: false, message: `${GENERIC_ERROR}` }, { status: 400 });
    }

    const validOtp = activeOtps.find(otp => otp.code === String(code).trim());

    if (!validOtp) {
      // Increment attempts on all active codes for this session
      await Promise.all(
        activeOtps.map(otp =>
          base44.asServiceRole.entities.OtpCode.update(otp.id, { attempts: (otp.attempts || 0) + 1 })
        )
      );
      return Response.json({ success: false, message: GENERIC_ERROR }, { status: 400 });
    }

    // Success — invalidate all active codes for this session (the matched
    // one is consumed; any siblings from parallel sendOtp calls are voided).
    await Promise.all(
      activeOtps.map(otp =>
        base44.asServiceRole.entities.OtpCode.update(otp.id, { used: true })
      )
    );

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
    console.error("[verifyOtp]", error.message);
    return Response.json({ error: "Erro ao verificar código. Tente novamente." }, { status: 500 });
  }
});