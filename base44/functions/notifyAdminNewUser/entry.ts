import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import nodemailer from "npm:nodemailer@6.9.14";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { full_name, role, plan, coupon_code } = await req.json();

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM");
    // Admin receives at ADMIN_EMAIL if set, otherwise falls back to SMTP_USER
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || smtpUser;

    if (!smtpHost || !adminEmail) {
      return Response.json({ error: "SMTP not configured" }, { status: 500 });
    }

    const roleLabel = role === "tutor" ? "Tutor" : "Aluno";
    const planLabel = plan && plan !== "free" ? plan.charAt(0).toUpperCase() + plan.slice(1) : null;
    const couponLabel = coupon_code ? ` (cupom: <strong>${coupon_code}</strong>)` : "";

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#F26A1B;padding:20px 24px;">
          <span style="color:#fff;font-size:18px;font-weight:700;">🎉 Novo cadastro — One Talky</span>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Nome:</strong> ${full_name}</p>
          <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Tipo:</strong> ${roleLabel}</p>
          <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>E-mail:</strong> ${user.email}</p>
          <p style="margin:0 0 8px;font-size:15px;color:#111827;">
            <strong>Plano:</strong>
            ${planLabel
              ? `<span style="color:#059669;font-weight:600;">${planLabel}</span>${couponLabel}`
              : `<span style="color:#6b7280;">Sem plano (free)</span>`}
          </p>
          ${role === "tutor" ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">⚠️ Tutor aguardando aprovação na plataforma.</p>` : ""}
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: adminEmail,
      subject: `[One Talky] Novo ${roleLabel}: ${full_name}`,
      html,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});