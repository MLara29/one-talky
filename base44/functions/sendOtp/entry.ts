import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSessionHash } from '../../shared/sessionHash.js';
import { getTransporter, SMTP_FROM } from '../../shared/mailer.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only admins and tutors require 2FA
    if (user.role !== 'admin' && user.role !== 'tutor') {
      return Response.json({ required: false });
    }

    const session = await getSessionHash(req);
    if (!session?.hash) return Response.json({ error: 'Invalid session' }, { status: 400 });

    // Generate a 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate old unused OTPs issued for THIS session only — never touches
    // OTPs belonging to other tabs/devices logged in as the same user.
    const existingOtps = await base44.asServiceRole.entities.OtpCode.filter({
      user_id: user.id,
      used: false,
      session_token: session.hash,
    });
    for (const otp of existingOtps) {
      await base44.asServiceRole.entities.OtpCode.update(otp.id, { used: true });
    }

    // Store the new OTP, bound to this session's token hash
    await base44.asServiceRole.entities.OtpCode.create({
      user_id: user.id,
      email: user.email,
      code,
      expires_at: expiresAt,
      used: false,
      session_token: session.hash,
    });

    // Send via SMTP
    const transporter = getTransporter();

    await transporter.sendMail({
      from: SMTP_FROM(),
      to: user.email,
      subject: 'Seu código de verificação — One Talky',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
          <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/2ef13ca22_ChatGPTImage23dejulde202614_44_54.png" alt="One Talky" style="width:48px;height:48px;object-fit:contain;display:block;margin:0 auto 24px"/>
          <h2 style="text-align:center;color:#111827;font-size:20px;margin:0 0 8px">Verificação em duas etapas</h2>
          <p style="text-align:center;color:#6b7280;font-size:14px;margin:0 0 32px">Use o código abaixo para confirmar seu acesso.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#f26a1b;font-family:monospace">${code}</span>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0">Este código expira em <strong>10 minutos</strong>. Não compartilhe com ninguém.</p>
        </div>
      `,
    });

    return Response.json({ success: true, required: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});