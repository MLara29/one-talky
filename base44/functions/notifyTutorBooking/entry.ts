import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.14';

const LOGO_URL = 'https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/58595725d_ChatGPTImage19dejulde202620_57_33.png';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatInTz(isoString: string, tz: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function levelLabel(level: string): string {
  const map: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  return map[level] || level || '—';
}

function buildEmail({ tutorName, studentName, scheduledAt, level, topics, objective, tutorTz }: {
  tutorName: string; studentName: string; scheduledAt: string;
  level: string; topics: string[]; objective: string; tutorTz: string;
}) {
  const brasiliaTz = 'America/Sao_Paulo';
  const brasiliaTime = formatInTz(scheduledAt, brasiliaTz);
  const tutorLocalTime = tutorTz && tutorTz !== brasiliaTz ? formatInTz(scheduledAt, tutorTz) : null;

  const topicsList = topics && topics.length > 0
    ? topics.map(t => `<li style="margin:3px 0;color:#c4b5fd;font-size:14px;">• ${escapeHtml(t)}</li>`).join('')
    : '<li style="margin:3px 0;color:#9ca3af;font-size:14px;">Not specified</li>';

  const tutorTzRow = tutorLocalTime ? `
    <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
    <tr>
      <td style="padding:8px 0;">
        <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">🕐 Date & Time (your local timezone — ${escapeHtml(tutorTz)})</span><br>
        <span style="color:#a78bfa;font-size:15px;font-weight:600;">${escapeHtml(tutorLocalTime)}</span>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#1a0a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.25);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:8px 12px;margin-bottom:14px;">
              <img src="${LOGO_URL}" alt="One Talky" width="40" height="40" style="border-radius:10px;display:block;object-fit:cover;" />
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">One Talky</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Language conversation platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">📅 New Lesson Scheduled</p>
            <h2 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:700;">Hi, ${escapeHtml(tutorName)}!</h2>
            <p style="margin:0 0 24px;color:#c4b5fd;font-size:15px;line-height:1.6;">
              A new lesson has been booked with you by <strong style="color:#ffffff;">${escapeHtml(studentName)}</strong>. Here are the details:
            </p>

            <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:20px 22px;margin-bottom:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">👤 Student</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${escapeHtml(studentName)}</span>
                  </td>
                </tr>
                <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">🇧🇷 Date & Time (Brasília — America/Sao_Paulo)</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${escapeHtml(brasiliaTime)}</span>
                  </td>
                </tr>
                ${tutorTzRow}
                <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">📊 Student Level</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${escapeHtml(levelLabel(level))}</span>
                  </td>
                </tr>
                <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">🎯 Learning Objective</span><br>
                    <span style="color:#ffffff;font-size:15px;font-weight:600;">${escapeHtml(objective || 'Not specified')}</span>
                  </td>
                </tr>
                <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">💬 Conversation Topics</span><br>
                    <ul style="margin:6px 0 0;padding:0;list-style:none;">${topicsList}</ul>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background:rgba(242,106,27,0.1);border:1px solid rgba(242,106,27,0.25);border-radius:12px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#fdba74;font-size:14px;line-height:1.5;">
                💡 <strong>Tip:</strong> Use the student's topics and objective to personalize the lesson and make them feel more comfortable speaking.
              </p>
            </div>

            <div style="text-align:center;">
              <a href="https://onetalky.com/schedule" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">
                View my schedule →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="margin:0;color:#4b5563;font-size:11px;">One Talky · You are receiving this email because a student has booked a lesson with you.</p>
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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { lesson_id } = body;

    if (!lesson_id) {
      return Response.json({ error: 'Missing lesson_id' }, { status: 400 });
    }

    // Verify a real Lesson exists matching this id and that the caller is a
    // participant — prevents anyone from triggering fake "new lesson" emails
    // to arbitrary tutors.
    // Use filter (returns []) instead of get (throws) so a bad id cleanly 404s.
    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    const lesson = lessons[0];
    if (!lesson) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }
    if (lesson.tutor_id !== user.id && lesson.student_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tutor_id = lesson.tutor_id;
    const student_id = lesson.student_id;
    const scheduled_at = lesson.scheduled_at;

    if (!tutor_id || !scheduled_at) {
      return Response.json({ error: 'Lesson is missing tutor_id or scheduled_at' }, { status: 400 });
    }

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const smtpFrom = Deno.env.get('SMTP_FROM');

    if (!smtpHost) return Response.json({ error: 'SMTP not configured' }, { status: 500 });

    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: tutor_id });
    const tutorProfile = tutorProfiles[0];
    if (!tutorProfile) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    let tutorEmail: string | null = null;
    if (tutorProfile.bank_info) {
      try { tutorEmail = JSON.parse(tutorProfile.bank_info).pioneer_email || null; } catch { /* noop */ }
    }
    if (!tutorEmail) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const tutorUser = allUsers.find((u: any) => u.id === tutor_id);
      tutorEmail = tutorUser?.email || null;
    }

    if (!tutorEmail) return Response.json({ error: 'Could not determine tutor email' }, { status: 404 });

    let studentName = lesson.student_name || 'Student';
    let level = 'beginner';
    let topics: string[] = [];
    let objective = '';

    if (student_id) {
      const studentProfiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: student_id });
      const sp = studentProfiles[0];
      if (sp) {
        studentName = sp.full_name || studentName;
        level = sp.level || level;
        topics = sp.conversation_topics || [];
        objective = sp.objective || '';
      }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: tutorEmail,
      subject: `📅 New lesson booked with ${studentName} – One Talky`,
      html: buildEmail({
        tutorName: tutorProfile.full_name || 'Tutor',
        studentName,
        scheduledAt: scheduled_at,
        level,
        topics,
        objective,
        tutorTz: tutorProfile.timezone || 'America/Sao_Paulo',
      }),
    });

    return Response.json({ success: true, sent_to: tutorEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});