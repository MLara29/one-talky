import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ error: 'Code is required' }, { status: 400 });

    // Find unused, valid OTP for this user
    const otps = await base44.asServiceRole.entities.OtpCode.filter({ user_id: user.id, used: false });

    const now = new Date();
    const validOtp = otps.find(otp =>
      otp.code === String(code).trim() && new Date(otp.expires_at) > now
    );

    if (!validOtp) {
      return Response.json({ success: false, message: 'Código inválido ou expirado.' }, { status: 400 });
    }

    // The code must belong to the session that's CURRENTLY pending on the user —
    // if a newer sendOtp call has since rotated otp_session_token, this code is
    // for a superseded session and must not verify it.
    if (!user.otp_session_token || validOtp.session_token !== user.otp_session_token) {
      return Response.json({ success: false, message: 'Código inválido ou expirado.' }, { status: 400 });
    }

    // Mark as used
    await base44.asServiceRole.entities.OtpCode.update(validOtp.id, { used: true });

    // Grant OTP-verified status to THIS session only
    await base44.asServiceRole.entities.User.update(user.id, {
      otp_verified_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});