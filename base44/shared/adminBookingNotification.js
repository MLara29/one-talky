import { getTransporter, SMTP_FROM, sendMailAndLog } from "./mailer.js";
import { getAdminNotificationEmail } from "./adminNotificationEmail.js";

// ──────────────────────────────────────────────────────────────────────────
// Sends an email to the platform admin whenever a student schedules a lesson
// with a tutor. Includes the lesson date/time in both São Paulo (Brazil)
// timezone and the tutor's own local timezone, so the admin can see at a
// glance when the lesson happens for each party.
//
// Params:
//   base44       — SDK client (service-role)
//   lesson       — the created Lesson record
//   tutorProfile — the TutorProfile of the tutor
//   studentName  — display name of the student (falls back to email)
//   studentEmail — student email (optional, for context)
// ──────────────────────────────────────────────────────────────────────────

function formatInTimezone(isoDate, timezone, opts = {}) {
  try {
    const dt = new Date(isoDate);
    const locale = "pt-BR";
    const dayOpts = {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      ...opts,
    };
    return new Intl.DateTimeFormat(locale, { ...dayOpts, timeZone: timezone }).format(dt);
  } catch {
    // Fallback: if timezone is invalid, use UTC
    return new Date(isoDate).toUTCString();
  }
}

function formatTimeInTimezone(isoDate, timezone) {
  try {
    const dt = new Date(isoDate);
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(dt);
  } catch {
    return new Date(isoDate).toISOString().substring(11, 16);
  }
}

function getTimezoneLabel(timezone) {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).format(new Date());
    const parts = offset.split(" ");
    const tz = parts[parts.length - 1];
    return `${timezone} (UTC${tz.replace("GMT", "")})`;
  } catch {
    return timezone || "UTC";
  }
}

export async function sendAdminBookingNotification(base44, { lesson, tutorProfile, studentName, studentEmail }) {
  const adminEmail = await getAdminNotificationEmail(base44);
  if (!adminEmail) {
    console.warn("[adminBookingNotification] No admin email configured — skipping");
    return;
  }

  const scheduledAt = lesson.scheduled_at;
  const tutorName = tutorProfile.display_name || tutorProfile.full_name || "Tutor";
  const tutorTimezone = tutorProfile.timezone || "UTC";
  const studentDisplay = studentName || studentEmail || "Aluno";

  // ── Format dates in both timezones ────────────────────────────────────────
  const brDay = formatInTimezone(scheduledAt, "America/Sao_Paulo");
  const brTime = formatTimeInTimezone(scheduledAt, "America/Sao_Paulo");
  const brTzLabel = getTimezoneLabel("America/Sao_Paulo");

  const tutorDay = formatInTimezone(scheduledAt, tutorTimezone);
  const tutorTime = formatTimeInTimezone(scheduledAt, tutorTimezone);
  const tutorTzLabel = getTimezoneLabel(tutorTimezone);

  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#F26A1B;padding:20px 24px;">
        <span style="color:#fff;font-size:18px;font-weight:700;">📅 Nova aula agendada — One Talky</span>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#111827;">
          Uma nova aula foi agendada na plataforma. Confira os detalhes abaixo:
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#111827;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600;width:35%;">Aluno</td>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${esc(studentDisplay)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600;">Tutor</td>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${esc(tutorName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600;">Idioma</td>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${esc(lesson.language || "—")}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600;">Duração</td>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${esc(lesson.duration_minutes || 30)} min</td>
          </tr>
        </table>

        <div style="margin-top:20px;padding:16px;background:#fff3ea;border-radius:8px;border:1px solid #fde0c4;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:.5px;">🇧🇷 Horário do Brasil (São Paulo)</p>
          <p style="margin:0;font-size:15px;color:#111827;">
            <strong>${esc(brDay)}</strong><br/>
            às <strong>${esc(brTime)}</strong>
            <span style="font-size:12px;color:#6b7280;"> (${esc(brTzLabel)})</span>
          </p>
        </div>

        <div style="margin-top:12px;padding:16px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.5px;">🌍 Horário do tutor (fuso local)</p>
          <p style="margin:0;font-size:15px;color:#111827;">
            <strong>${esc(tutorDay)}</strong><br/>
            às <strong>${esc(tutorTime)}</strong>
            <span style="font-size:12px;color:#6b7280;"> (${esc(tutorTzLabel)})</span>
          </p>
        </div>

        <p style="margin:20px 0 0;font-size:12px;color:#6b7280;">
          Esta é uma notificação automática da plataforma One Talky.
        </p>
      </div>
    </div>
  `;

  const transporter = getTransporter();

  await sendMailAndLog(base44, transporter, {
    from: SMTP_FROM(),
    to: adminEmail,
    subject: `[One Talky] Aula agendada: ${studentDisplay} → ${tutorName}`,
    html,
  }, "admin_booking_notification");
}