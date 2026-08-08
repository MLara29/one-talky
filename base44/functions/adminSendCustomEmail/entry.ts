import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from "../../shared/requireOtp.js";
import { getTransporter, SMTP_FROM, sendMailAndLog } from "../../shared/mailer.js";

const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB — adjust per Hostinger email plan limit

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { target, recipient_id, subject, body_html, attachments = [] } = await req.json();

    if (!subject?.trim() || !body_html?.trim()) {
      return Response.json({ error: "Assunto e corpo do e-mail são obrigatórios" }, { status: 400 });
    }

    // Validate total attachment size BEFORE processing
    const totalBytes = attachments.reduce((sum, a) => sum + (a.content_base64?.length || 0) * 0.75, 0);
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return Response.json({ error: "Anexos excedem o limite de 15MB no total" }, { status: 400 });
    }

    const nodemailerAttachments = attachments.map((a) => ({
      filename: a.filename,
      content: a.content_base64,
      encoding: "base64",
      contentType: a.content_type,
    }));

    // Resolve recipient list
    let recipients = [];
    if (target === "specific_tutor" || target === "specific_student") {
      if (!recipient_id) return Response.json({ error: "recipient_id é obrigatório" }, { status: 400 });
      const targetUser = await base44.asServiceRole.entities.User.get(recipient_id);
      if (!targetUser?.email) return Response.json({ error: "Destinatário não encontrado" }, { status: 404 });
      recipients = [targetUser];
    } else if (target === "all_tutors" || target === "all_students") {
      const role = target === "all_tutors" ? "tutor" : "student";
      recipients = await base44.asServiceRole.entities.User.filter({ role });
    } else {
      return Response.json({ error: "target inválido" }, { status: 400 });
    }

    const transporter = getTransporter();
    const results = { sent: 0, failed: [] };

    // Sequential send with per-recipient error handling — one failure
    // (invalid email, full inbox, etc) never blocks the rest of the batch
    for (const r of recipients) {
      if (!r.email) continue;
      try {
        await sendMailAndLog(base44, transporter, {
          from: SMTP_FROM(),
          to: r.email,
          subject,
          html: body_html,
          attachments: nodemailerAttachments,
          _sentBy: user.id,
        }, "admin_compose");
        results.sent++;
      } catch (e) {
        console.error(`[adminSendCustomEmail] failed for ${r.email}:`, e.message);
        results.failed.push(r.email);
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});