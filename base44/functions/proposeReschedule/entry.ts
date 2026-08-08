import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from "../../shared/requireOtp.js";
import { checkRescheduleConflicts } from "../../shared/rescheduleLogic.js";
import { getTransporter, SMTP_FROM } from "../../shared/mailer.js";

// Tutor proposes a new lesson time — does NOT move the lesson or touch
// booked_slots. Creates a LessonChangeRequest (pending) + optional initial
// message, notifies the student in-app and via email (Portuguese).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id, proposed_scheduled_at, message } = await req.json();
    if (!lesson_id || !proposed_scheduled_at) {
      return Response.json({ error: "lesson_id and proposed_scheduled_at required" }, { status: 400 });
    }

    if (new Date(proposed_scheduled_at) <= new Date()) {
      return Response.json({ error: "New scheduled time must be in the future" }, { status: 400 });
    }

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    if (lessons.length === 0) return Response.json({ error: "Lesson not found" }, { status: 404 });
    const lesson = lessons[0];

    if (user.id !== lesson.tutor_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    if (lesson.status !== "scheduled") {
      return Response.json({ error: "Only scheduled lessons can be rescheduled" }, { status: 400 });
    }

    // One pending request per lesson at a time
    const existing = await base44.asServiceRole.entities.LessonChangeRequest.filter({
      lesson_id, status: "pending",
    });
    if (existing.length > 0) {
      return Response.json({ error: "Já existe uma proposta de reagendamento pendente para esta aula" }, { status: 409 });
    }

    // Conflict check (informativa — não reivindica o slot ainda)
    const conflict = await checkRescheduleConflicts(base44, lesson, proposed_scheduled_at);
    if (!conflict.ok) return Response.json({ error: conflict.error }, { status: conflict.status });

    // Create the change request
    const request = await base44.asServiceRole.entities.LessonChangeRequest.create({
      lesson_id,
      tutor_id: lesson.tutor_id,
      student_id: lesson.student_id,
      proposed_scheduled_at,
      status: "pending",
    });

    // Initial message from tutor (optional)
    if (message?.trim()) {
      await base44.asServiceRole.entities.LessonChangeMessage.create({
        request_id: request.id,
        sender_id: user.id,
        sender_role: "tutor",
        message: message.trim(),
      });
    }

    const proposedDate = new Date(proposed_scheduled_at).toLocaleString('pt-BR', {
      dateStyle: 'full', timeStyle: 'short',
    });

    // In-app notification to student
    await base44.asServiceRole.entities.Notification.create({
      user_id: lesson.student_id,
      title: "Proposta de novo horário",
      message: `Seu tutor propôs mudar a aula para ${proposedDate}.`,
      type: "lesson_reminder",
      is_read: false,
      link: "/my-lessons",
    });

    // Email to student in Portuguese
    const esc = (s: string) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

    const studentUsers = await base44.asServiceRole.entities.User.filter({ id: lesson.student_id });
    const studentEmail = studentUsers[0]?.email;
    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
    const tutorName = tutorProfiles[0]?.full_name || "Seu tutor";

    if (studentEmail && Deno.env.get("SMTP_HOST")) {
      const transporter = getTransporter();
      await sendMailAndLog(base44, transporter, {
        from: SMTP_FROM(),
        to: studentEmail,
        subject: `📅 Seu tutor propôs mudar o horário da aula`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#F26A1B;padding:20px 24px;">
              <span style="color:#fff;font-size:18px;font-weight:700;">📅 Proposta de novo horário</span>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;color:#111827;">
                <strong>${esc(tutorName)}</strong> propôs mudar sua aula para:
              </p>
              <p style="margin:0 0 16px;font-size:17px;color:#F26A1B;font-weight:700;">${esc(proposedDate)}</p>
              ${message?.trim() ? `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-size:14px;color:#374151;margin-bottom:16px;">"${esc(message.trim())}"</div>` : ''}
              <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
                Acesse a plataforma para aceitar ou recusar esse novo horário.
              </p>
              <a href="https://onetalky.com/my-lessons" style="display:inline-block;background:#F26A1B;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px;">
                Ver proposta
              </a>
            </div>
          </div>
        `,
      }, "reschedule_propose");
    }

    return Response.json({ success: true, request_id: request.id });
  } catch (error) {
    console.error('[proposeReschedule]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});