import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { getTransporter, SMTP_FROM } from "../../shared/mailer.js";
import { getAdminNotificationEmail } from "../../shared/adminNotificationEmail.js";

const esc = (s: string) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#x27;");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    if (!subject || !message) {
      return Response.json({ error: "subject e message são obrigatórios" }, { status: 400 });
    }

    const role = user.role === "tutor" ? "tutor" : "student";

    // Resolve the real profile name — never fall back to the email address
    let senderName = user.full_name;
    if (!senderName) {
      try {
        const entity = role === "tutor" ? "TutorProfile" : "StudentProfile";
        const profiles = await base44.asServiceRole.entities[entity].filter({ user_id: user.id });
        senderName = profiles[0]?.full_name || "Usuário";
      } catch { senderName = "Usuário"; }
    }

    await base44.asServiceRole.entities.SupportMessage.create({
      sender_id: user.id,
      sender_name: senderName,
      sender_role: role,
      subject,
      message,
    });

    // In-app notification for every admin
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      if (admins.length > 0) {
        await base44.asServiceRole.entities.Notification.bulkCreate(
          admins.map((a) => ({
            user_id: a.id,
            title: `💬 Nova mensagem de suporte: ${subject}`,
            message: `${senderName} enviou uma mensagem`,
            type: "general",
            is_read: false,
            link: "/admin/support",
          }))
        );
      }
    } catch (e) {
      console.error("[sendSupportMessage] notification", e.message);
    }

    // Email notification to the configured admin address
    try {
      const adminEmail = await getAdminNotificationEmail(base44);
      if (Deno.env.get("SMTP_HOST") && adminEmail) {
        const html = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#F26A1B;padding:20px 24px;">
              <span style="color:#fff;font-size:18px;font-weight:700;">💬 Nova mensagem de suporte</span>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>De:</strong> ${esc(senderName)}</p>
              <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Perfil:</strong> ${role === "tutor" ? "Tutor" : "Aluno"}</p>
              <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>E-mail:</strong> ${esc(user.email)}</p>
              <p style="margin:0 0 12px;font-size:15px;color:#111827;"><strong>Assunto:</strong> ${esc(subject)}</p>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-size:14px;color:#374151;white-space:pre-wrap;">${esc(message)}</div>
            </div>
          </div>
        `;
        const transporter = getTransporter();
        await transporter.sendMail({
          from: SMTP_FROM(),
          to: adminEmail,
          subject: `[One Talky] Suporte: ${subject}`,
          html,
        });
      }
    } catch (e) {
      console.error("[sendSupportMessage] email", e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[sendSupportMessage]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});