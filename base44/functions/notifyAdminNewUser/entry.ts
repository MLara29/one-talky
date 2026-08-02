import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { getTransporter, SMTP_FROM } from "../../shared/mailer.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { full_name, role, plan, coupon_code } = await req.json();

    const esc = (s: string) => String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    // Admin receives at ADMIN_EMAIL if set, otherwise falls back to SMTP_USER
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || Deno.env.get("SMTP_USER");

    if (!Deno.env.get("SMTP_HOST") || !adminEmail) {
      return Response.json({ error: "SMTP not configured" }, { status: 500 });
    }

    const roleLabel = role === "tutor" ? "Tutor" : "Aluno";
    const planLabel = plan && plan !== "free" ? esc(plan.charAt(0).toUpperCase() + plan.slice(1)) : null;
    const couponLabel = coupon_code ? ` (cupom: <strong>${esc(coupon_code)}</strong>)` : "";

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#F26A1B;padding:20px 24px;">
          <span style="color:#fff;font-size:18px;font-weight:700;">🎉 Novo cadastro — One Talky</span>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Nome:</strong> ${esc(full_name)}</p>
          <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Tipo:</strong> ${esc(roleLabel)}</p>
          <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>E-mail:</strong> ${esc(user.email)}</p>
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

    const transporter = getTransporter();

    await transporter.sendMail({
      from: SMTP_FROM(),
      to: adminEmail,
      subject: `[One Talky] Novo ${roleLabel}: ${full_name}`,
      html,
    });

    // Create in-app notification for all admins
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      const notifTitle = role === "tutor"
        ? `🧑‍🏫 Novo tutor aguardando aprovação: ${esc(full_name)}`
        : `🎓 Novo estudante cadastrado: ${esc(full_name)}`;
      const notifMessage = role === "tutor"
        ? `Um novo tutor se cadastrou e está aguardando aprovação.`
        : `Um novo estudante se cadastrou na plataforma${planLabel ? ` com plano ${planLabel}` : ""}.`;
      const notifLink = role === "tutor" ? "/admin/approvals" : "/admin/users";

      if (admins.length > 0) {
        await base44.asServiceRole.entities.Notification.bulkCreate(
          admins.map(a => ({
            user_id: a.id,
            title: notifTitle,
            message: notifMessage,
            type: "general",
            is_read: false,
            link: notifLink,
          }))
        );
      }
    } catch {}

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifyAdminNewUser]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});