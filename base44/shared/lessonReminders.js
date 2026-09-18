import { getTransporter, SMTP_FROM, sendMailAndLog } from './mailer.js';

// Shared lesson-reminder logic — used by both the manual admin button
// (sendLessonReminder, with OTP) and the automated cron
// (sendLessonRemindersScheduled, no auth). Extracted here so both paths
// share identical email templates, time-window logic, and the
// reminder_tutor_sent / reminder_student_sent dedup guards.

function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateTimePt(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function labelFor(minutes) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return '1 hour';
  if (minutes < 1440) return `${minutes / 60} hours`;
  return '24 hours';
}

function labelForPt(minutes) {
  if (minutes < 60) return `${minutes} minutos`;
  if (minutes === 60) return '1 hora';
  if (minutes < 1440) return `${minutes / 60} horas`;
  return '24 horas';
}

const LOGO_URL = 'https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png';

function tutorEmailHtml({ tutorName, studentName, lessonTime, minutesBefore }) {
  tutorName = escapeHtml(tutorName);
  studentName = escapeHtml(studentName);
  lessonTime = escapeHtml(lessonTime);
  const timeLabel = labelFor(minutesBefore);
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:#ffffff;padding:32px 36px 20px;text-align:center;border-bottom:1px solid #f3f4f6;">
            <img src="${LOGO_URL}" alt="One Talky" height="40" style="width:auto;max-width:220px;display:block;margin:0 auto 8px;object-fit:contain;" />
            <p style="margin:0;color:#9ca3af;font-size:13px;">Language conversation platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 8px;color:#F26A1B;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⏰ Lesson Reminder</p>
            <h2 style="margin:0 0 20px;color:#111827;font-size:20px;font-weight:700;">Hi, ${tutorName}!</h2>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Your lesson with <strong style="color:#111827;">${studentName}</strong> starts in <strong style="color:#F26A1B;">${timeLabel}</strong>. Get ready! 🚀
            </p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:20px 22px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">👤 Student</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;">${studentName}</span>
                  </td>
                </tr>
                <tr><td style="padding:10px 0;border-top:1px solid #fed7aa;"></td></tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">📅 Date & Time (Brasília time)</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;">${lessonTime}</span>
                  </td>
                </tr>
              </table>
            </div>
            <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0;">
              This is just a reminder — no action needed here.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">OneTalky · You are receiving this email because you have an upcoming lesson.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function studentEmailHtml({ studentName, tutorName, lessonTime, minutesBefore }) {
  studentName = escapeHtml(studentName);
  tutorName = escapeHtml(tutorName);
  lessonTime = escapeHtml(lessonTime);
  const timeLabel = labelForPt(minutesBefore);
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:#ffffff;padding:32px 36px 20px;text-align:center;border-bottom:1px solid #f3f4f6;">
            <img src="${LOGO_URL}" alt="One Talky" height="40" style="width:auto;max-width:220px;display:block;margin:0 auto 8px;object-fit:contain;" />
            <p style="margin:0;color:#9ca3af;font-size:13px;">Plataforma de conversação em idiomas</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 8px;color:#F26A1B;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⏰ Sua aula está chegando!</p>
            <h2 style="margin:0 0 20px;color:#111827;font-size:20px;font-weight:700;">Olá, ${studentName}!</h2>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Sua aula com o tutor <strong style="color:#111827;">${tutorName}</strong> começa em <strong style="color:#F26A1B;">${timeLabel}</strong>. Entre na plataforma e se prepare! 🌟
            </p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:20px 22px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">🎙️ Tutor</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;">${tutorName}</span>
                  </td>
                </tr>
                <tr><td style="padding:10px 0;border-top:1px solid #fed7aa;"></td></tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#9ca3af;font-size:12px;">📅 Data e horário (horário de Brasília)</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;">${lessonTime}</span>
                  </td>
                </tr>
              </table>
            </div>
            <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0;">
              Este é só um lembrete — nenhuma ação necessária aqui.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">OneTalky · Você está recebendo este e-mail porque tem uma aula agendada.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Main entry point — called by both the manual admin function and the
// automated scheduled function.
//
// Options:
//   tutorMinutes   — send tutor reminder when lesson is within this many minutes (default 60)
//   studentMinutes — send student reminder when lesson is within this many minutes (default 30)
//   force          — bypass reminder_tutor_sent / reminder_student_sent checks (manual re-send)
//   sentBy         — optional user id for EmailLog.sent_by (defaults to "system")
//
// Returns { sent, results } where results is an array of per-recipient outcomes.
export async function processLessonReminders(base44, { tutorMinutes = 60, studentMinutes = 30, force = false, sentBy = 'system' } = {}) {
  const now = new Date();

  const lessons = await base44.asServiceRole.entities.Lesson.filter({ status: 'scheduled' });

  const transporter = getTransporter();

  const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({});
  const tutorMap = {};
  for (const tp of tutorProfiles) { tutorMap[tp.user_id] = tp; }

  const allUsers = await base44.asServiceRole.entities.User.list();
  const userMap = {};
  for (const u of allUsers) { userMap[u.id] = u; }

  let sent = 0;
  const results = [];

  for (const lesson of lessons) {
    const lessonAt = new Date(lesson.scheduled_at);
    const diffMinutes = (lessonAt - now) / 60000;
    if (diffMinutes < 0) continue;

    const lessonTime = formatDateTime(lesson.scheduled_at);
    const lessonTimePt = formatDateTimePt(lesson.scheduled_at);

    // ---- TUTOR ----
    if (diffMinutes <= tutorMinutes && (force || !lesson.reminder_tutor_sent)) {
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
      if (!tutorEmail) tutorEmail = userMap[lesson.tutor_id]?.email || null;

      if (tutorEmail && reminderEnabled) {
        try {
          await sendMailAndLog(base44, transporter, {
            from: SMTP_FROM(),
            to: tutorEmail,
            subject: `⏰ Your lesson with ${lesson.student_name} starts in ${labelFor(tutorMinutes)}`,
            html: tutorEmailHtml({
              tutorName: lesson.tutor_name || 'Tutor',
              studentName: lesson.student_name || 'Student',
              lessonTime,
              minutesBefore: tutorMinutes,
            }),
            _sentBy: sentBy,
          }, "lesson_reminder");
          sent++;
          results.push({ role: 'tutor', email: tutorEmail, lesson_id: lesson.id, status: 'sent' });
          await base44.asServiceRole.entities.Lesson.update(lesson.id, { reminder_tutor_sent: true });
        } catch (e) {
          results.push({ role: 'tutor', email: tutorEmail, lesson_id: lesson.id, error: e.message });
        }
      } else if (tutorEmail && !reminderEnabled) {
        results.push({ role: 'tutor', email: tutorEmail, lesson_id: lesson.id, status: 'skipped_opt_out' });
      }
    }

    // ---- STUDENT ----
    if (diffMinutes <= studentMinutes && (force || !lesson.reminder_student_sent)) {
      const studentEmail = userMap[lesson.student_id]?.email || null;
      if (studentEmail) {
        try {
          await sendMailAndLog(base44, transporter, {
            from: SMTP_FROM(),
            to: studentEmail,
            subject: `🎙️ Sua aula com ${lesson.tutor_name} começa em ${labelForPt(studentMinutes)}`,
            html: studentEmailHtml({
              studentName: lesson.student_name || 'Aluno',
              tutorName: lesson.tutor_name || 'Tutor',
              lessonTime: lessonTimePt,
              minutesBefore: studentMinutes,
            }),
            _sentBy: sentBy,
          }, "lesson_reminder");
          sent++;
          results.push({ role: 'student', email: studentEmail, lesson_id: lesson.id, status: 'sent' });
          await base44.asServiceRole.entities.Lesson.update(lesson.id, { reminder_student_sent: true });
        } catch (e) {
          results.push({ role: 'student', email: studentEmail, lesson_id: lesson.id, error: e.message });
        }
      }
    }
  }

  return { sent, results };
}