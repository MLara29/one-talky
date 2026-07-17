import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.14';

function formatDateTime(isoString, minutesBefore) {
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function labelFor(minutes) {
  if (minutes < 60) return `${minutes} minutos`;
  if (minutes === 60) return '1 hora';
  if (minutes < 1440) return `${minutes / 60} horas`;
  return '24 horas';
}

function tutorEmailHtml({ tutorName, studentName, lessonTime, minutesBefore }) {
  const timeLabel = labelFor(minutesBefore);
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#1a0a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.25);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;">
              <span style="font-size:24px;">🎙️</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">OneTalky</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Plataforma de conversação em idiomas</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⏰ Lembrete de Aula</p>
            <h2 style="margin:0 0 20px;color:#ffffff;font-size:20px;font-weight:700;">Olá, ${tutorName}!</h2>
            <p style="margin:0 0 24px;color:#c4b5fd;font-size:15px;line-height:1.6;">
              Sua aula com <strong style="color:#ffffff;">${studentName}</strong> começa em <strong style="color:#a78bfa;">${timeLabel}</strong>. Prepare-se! 🚀
            </p>
            <!-- Info card -->
            <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:20px 22px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">👤 Aluno</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${studentName}</span>
                  </td>
                </tr>
                <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">📅 Data e hora (horário de Brasília)</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${lessonTime}</span>
                  </td>
                </tr>
              </table>
            </div>
            <div style="text-align:center;">
              <a href="https://onetalky.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">
                Acessar a plataforma →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · Você está recebendo este e-mail porque é tutor da plataforma.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function studentEmailHtml({ studentName, tutorName, lessonTime, minutesBefore }) {
  const timeLabel = labelFor(minutesBefore);
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#0a1a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(99,102,241,0.25);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);padding:32px 36px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;">
              <span style="font-size:24px;">💬</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">OneTalky</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Plataforma de conversação em idiomas</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 8px;color:#818cf8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⏰ Sua aula está chegando!</p>
            <h2 style="margin:0 0 20px;color:#ffffff;font-size:20px;font-weight:700;">Olá, ${studentName}!</h2>
            <p style="margin:0 0 24px;color:#c7d2fe;font-size:15px;line-height:1.6;">
              Sua aula com o tutor <strong style="color:#ffffff;">${tutorName}</strong> começa em <strong style="color:#818cf8;">${timeLabel}</strong>. Acesse a plataforma e esteja pronto! 🌟
            </p>
            <!-- Info card -->
            <div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:14px;padding:20px 22px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">🎙️ Tutor</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${tutorName}</span>
                  </td>
                </tr>
                <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">📅 Data e hora (horário de Brasília)</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${lessonTime}</span>
                  </td>
                </tr>
              </table>
            </div>
            <div style="text-align:center;">
              <a href="https://onetalky.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">
                Entrar na plataforma →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · Você está recebendo este e-mail porque tem uma aula agendada.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tutorMinutes = Number(body.tutor_minutes) || 60;
    const studentMinutes = Number(body.student_minutes) || 30;

    const now = new Date();

    // Find lessons in the tutor window (use the larger of the two windows)
    const maxMinutes = Math.max(tutorMinutes, studentMinutes);
    const windowEnd = new Date(now.getTime() + maxMinutes * 60 * 1000);

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ status: 'scheduled' });

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const smtpFrom = Deno.env.get('SMTP_FROM');

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Fetch tutor profiles (for emails and reminder preference)
    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({});
    const tutorMap = {};
    for (const tp of tutorProfiles) {
      tutorMap[tp.user_id] = tp;
    }

    // Fetch student profiles (for emails)
    const studentProfiles = await base44.asServiceRole.entities.StudentProfile.filter({});
    const studentMap = {};
    for (const sp of studentProfiles) {
      studentMap[sp.user_id] = sp;
    }

    // Fetch all registered users for email fallback
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    for (const u of allUsers) {
      userMap[u.id] = u;
    }

    let sent = 0;
    const results = [];

    for (const lesson of lessons) {
      const lessonAt = new Date(lesson.scheduled_at);
      const diffMinutes = (lessonAt - now) / 60000;
      if (diffMinutes < 0) continue; // past

      const lessonTime = formatDateTime(lesson.scheduled_at, 0);

      // ---- TUTOR ----
      const shouldNotifyTutor = diffMinutes <= tutorMinutes && diffMinutes >= 0;
      if (shouldNotifyTutor) {
        const tutor = tutorMap[lesson.tutor_id];
        let tutorEmail = null;
        let reminderEnabled = true;
        if (tutor?.bank_info) {
          try {
            const parsed = JSON.parse(tutor.bank_info);
            tutorEmail = parsed.pioneer_email || null;
            reminderEnabled = parsed.reminder_enabled !== false;
          } catch { /* noop */ }
        }
        // Fallback: tutor's account email
        if (!tutorEmail) tutorEmail = userMap[lesson.tutor_id]?.email || null;

        if (tutorEmail && reminderEnabled) {
          try {
            await transporter.sendMail({
              from: smtpFrom,
              to: tutorEmail,
              subject: `⏰ Sua aula com ${lesson.student_name} começa em ${labelFor(tutorMinutes)}`,
              html: tutorEmailHtml({
                tutorName: lesson.tutor_name || 'Tutor',
                studentName: lesson.student_name || 'Aluno',
                lessonTime,
                minutesBefore: tutorMinutes,
              }),
            });
            sent++;
            results.push({ role: 'tutor', email: tutorEmail, lesson_id: lesson.id, status: 'sent' });
          } catch (e) {
            results.push({ role: 'tutor', email: tutorEmail, lesson_id: lesson.id, error: e.message });
          }
        } else if (tutorEmail && !reminderEnabled) {
          results.push({ role: 'tutor', email: tutorEmail, lesson_id: lesson.id, status: 'skipped_opt_out' });
        }
      }

      // ---- STUDENT ----
      const shouldNotifyStudent = diffMinutes <= studentMinutes && diffMinutes >= 0;
      if (shouldNotifyStudent) {
        // Try student profile email, then user account email
        const studentUser = userMap[lesson.student_id];
        const studentEmail = studentUser?.email || null;

        if (studentEmail) {
          try {
            await transporter.sendMail({
              from: smtpFrom,
              to: studentEmail,
              subject: `🎙️ Sua aula com ${lesson.tutor_name} começa em ${labelFor(studentMinutes)}`,
              html: studentEmailHtml({
                studentName: lesson.student_name || 'Aluno',
                tutorName: lesson.tutor_name || 'Tutor',
                lessonTime,
                minutesBefore: studentMinutes,
              }),
            });
            sent++;
            results.push({ role: 'student', email: studentEmail, lesson_id: lesson.id, status: 'sent' });
          } catch (e) {
            results.push({ role: 'student', email: studentEmail, lesson_id: lesson.id, error: e.message });
          }
        }
      }
    }

    return Response.json({ success: true, sent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});