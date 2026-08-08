import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { getTransporter, SMTP_FROM } from "../../shared/mailer.js";

// Either side (tutor or student) sends a message in the change-request thread
// without deciding. The other side is notified in-app + via email in the
// recipient's language (student=PT, tutor=EN).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { request_id, message } = await req.json();
    if (!request_id || !message?.trim()) {
      return Response.json({ error: "request_id and message required" }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.LessonChangeRequest.filter({ id: request_id });
    if (requests.length === 0) return Response.json({ error: "Request not found" }, { status: 404 });
    const changeRequest = requests[0];

    if (user.id !== changeRequest.tutor_id && user.id !== changeRequest.student_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (changeRequest.status !== "pending") {
      return Response.json({ error: "Esta proposta já foi respondida" }, { status: 400 });
    }

    const senderRole = user.id === changeRequest.tutor_id ? "tutor" : "student";
    const recipientId = senderRole === "tutor" ? changeRequest.student_id : changeRequest.tutor_id;
    const recipientRole = senderRole === "tutor" ? "student" : "tutor";

    const senderUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const senderName = senderUsers[0]?.full_name || (senderRole === "tutor" ? "Tutor" : "Aluno");

    await base44.asServiceRole.entities.LessonChangeMessage.create({
      request_id,
      sender_id: user.id,
      sender_role: senderRole,
      message: message.trim(),
    });

    const isRecipientStudent = recipientRole === "student";
    await base44.asServiceRole.entities.Notification.create({
      user_id: recipientId,
      title: isRecipientStudent ? "Nova mensagem sobre o reagendamento" : "New message about the reschedule",
      message: isRecipientStudent
        ? `${senderName} enviou uma mensagem sobre a proposta de reagendamento.`
        : `${senderName} sent a message about the reschedule proposal.`,
      type: "lesson_reminder",
      is_read: false,
      link: "/my-lessons",
    });

    const esc = (s: string) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

    const recipientUsers = await base44.asServiceRole.entities.User.filter({ id: recipientId });
    const recipientEmail = recipientUsers[0]?.email;

    if (recipientEmail && Deno.env.get("SMTP_HOST")) {
      const subject = isRecipientStudent
        ? `💬 Nova mensagem sobre o reagendamento`
        : `💬 New message about the reschedule`;
      const introText = isRecipientStudent
        ? `${esc(senderName)} enviou uma mensagem sobre a proposta de reagendamento:`
        : `${esc(senderName)} sent a message about the reschedule proposal:`;
      const ctaText = isRecipientStudent ? "Ver mensagem" : "View message";

      const transporter = getTransporter();
      await sendMailAndLog(base44, transporter, {
        from: SMTP_FROM(),
        to: recipientEmail,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#F26A1B;padding:20px 24px;">
              <span style="color:#fff;font-size:18px;font-weight:700;">💬 ${isRecipientStudent ? "Nova mensagem" : "New message"}</span>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;color:#111827;">${introText}</p>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-size:14px;color:#374151;margin-bottom:16px;">"${esc(message.trim())}"</div>
              <a href="https://onetalky.com/my-lessons" style="display:inline-block;background:#F26A1B;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px;">
                ${ctaText}
              </a>
            </div>
          </div>
        `,
      }, "reschedule_message");
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[sendLessonChangeMessage]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});