import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { performRescheduleSlotMove } from "../../shared/rescheduleLogic.js";
import { getTransporter, SMTP_FROM } from "../../shared/mailer.js";

// Student accepts or rejects a reschedule proposal. On accept, the actual
// slot move happens here (two-step CAS). On reject, the lesson stays put.
// Tutor is notified in-app + via email (English) in both cases.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { request_id, action } = await req.json();
    if (!request_id || !["accept", "reject"].includes(action)) {
      return Response.json({ error: "request_id and action (accept|reject) required" }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.LessonChangeRequest.filter({ id: request_id });
    if (requests.length === 0) return Response.json({ error: "Request not found" }, { status: 404 });
    const changeRequest = requests[0];

    // Only the student of this request can respond
    if (user.id !== changeRequest.student_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (changeRequest.status !== "pending") {
      return Response.json({ error: "Esta proposta já foi respondida" }, { status: 400 });
    }

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: changeRequest.lesson_id });
    if (lessons.length === 0) return Response.json({ error: "Lesson not found" }, { status: 404 });
    const lesson = lessons[0];

    const esc = (s: string) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

    const tutorUsers = await base44.asServiceRole.entities.User.filter({ id: lesson.tutor_id });
    const tutorEmail = tutorUsers[0]?.email;
    const studentName = lesson.student_name || "The student";

    if (action === "reject") {
      await base44.asServiceRole.entities.LessonChangeRequest.update(request_id, {
        status: "rejected",
        responded_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.Notification.create({
        user_id: lesson.tutor_id,
        title: "Reschedule declined",
        message: `${studentName} declined your proposed new lesson time. The lesson remains at its original time.`,
        type: "lesson_reminder",
        is_read: false,
        link: "/my-lessons",
      });

      if (tutorEmail && Deno.env.get("SMTP_HOST")) {
        const transporter = getTransporter();
        await sendMailAndLog(base44, transporter, {
          from: SMTP_FROM(),
          to: tutorEmail,
          subject: `❌ Student declined your reschedule request`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:#ef4444;padding:20px 24px;">
                <span style="color:#fff;font-size:18px;font-weight:700;">❌ Reschedule declined</span>
              </div>
              <div style="padding:24px;">
                <p style="margin:0 0 12px;font-size:15px;color:#111827;">
                  <strong>${esc(studentName)}</strong> has declined your proposed new lesson time.
                </p>
                <p style="margin:0 0 16px;font-size:15px;color:#111827;">The lesson remains at its original time. Feel free to propose a different time.</p>
                <a href="https://onetalky.com/my-lessons" style="display:inline-block;background:#F26A1B;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px;">
                  View lesson
                </a>
              </div>
            </div>
          `,
        }, "reschedule_respond");
      }

      return Response.json({ success: true, action: "rejected" });
    }

    // action === "accept" — perform the actual slot move
    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
    if (tutorProfiles.length === 0) return Response.json({ error: "Tutor profile not found" }, { status: 404 });
    const tp = tutorProfiles[0];

    const move = await performRescheduleSlotMove(base44, tp, changeRequest.proposed_scheduled_at, lesson.scheduled_at);
    if (!move.ok) {
      // CAS failed — someone took the slot between proposal and acceptance.
      // Mark request as rejected so the tutor can propose a different time.
      await base44.asServiceRole.entities.LessonChangeRequest.update(request_id, {
        status: "rejected",
        responded_at: new Date().toISOString(),
      });
      return Response.json({ error: "Novo horário já está ocupado. Propor outro horário." }, { status: 409 });
    }

    const newDate = new Date(changeRequest.proposed_scheduled_at).toLocaleString('en-US');
    await base44.asServiceRole.entities.Lesson.update(lesson.id, {
      scheduled_at: changeRequest.proposed_scheduled_at,
    });

    await base44.asServiceRole.entities.LessonChangeRequest.update(request_id, {
      status: "accepted",
      responded_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.Notification.create({
      user_id: lesson.tutor_id,
      title: "Reschedule accepted",
      message: `${studentName} accepted your proposed new lesson time. The lesson has been moved.`,
      type: "lesson_reminder",
      is_read: false,
      link: "/my-lessons",
    });

    if (tutorEmail && Deno.env.get("SMTP_HOST")) {
      const transporter = getTransporter();
      await sendMailAndLog(base44, transporter, {
        from: SMTP_FROM(),
        to: tutorEmail,
        subject: `✅ Student accepted your reschedule request`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#10b981;padding:20px 24px;">
              <span style="color:#fff;font-size:18px;font-weight:700;">✅ Reschedule accepted</span>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;color:#111827;">
                <strong>${esc(studentName)}</strong> has accepted your proposed new lesson time.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#111827;">The lesson has been moved to <strong>${esc(newDate)}</strong>.</p>
              <a href="https://onetalky.com/my-lessons" style="display:inline-block;background:#F26A1B;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px;">
                View lesson
              </a>
            </div>
          </div>
        `,
      }, "reschedule_respond");
    }

    return Response.json({ success: true, action: "accepted" });
  } catch (error) {
    console.error('[respondToRescheduleRequest]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});