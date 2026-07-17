import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.14';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Find lessons scheduled in the next 60 minutes
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 60 * 1000);

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ status: 'scheduled' });
    const upcoming = lessons.filter(l => {
      const t = new Date(l.scheduled_at);
      return t >= now && t <= in60;
    });

    if (upcoming.length === 0) {
      return Response.json({ success: true, sent: 0, message: 'No upcoming lessons in next 60 min' });
    }

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

    // Fetch tutor profiles to get contact emails
    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({});
    const tutorMap = {};
    for (const tp of tutorProfiles) {
      tutorMap[tp.user_id] = tp;
    }

    let sent = 0;
    const results = [];

    for (const lesson of upcoming) {
      const lessonTime = new Date(lesson.scheduled_at).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const tutor = tutorMap[lesson.tutor_id];
      let tutorEmail = null;
      if (tutor?.bank_info) {
        try {
          const parsed = JSON.parse(tutor.bank_info);
          tutorEmail = parsed.pioneer_email || null;
        } catch { /* noop */ }
      }

      // Email to tutor
      if (tutorEmail) {
        try {
          await transporter.sendMail({
            from: smtpFrom,
            to: tutorEmail,
            subject: `⏰ Lembrete: aula em 1 hora — ${lesson.student_name}`,
            html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
              <h2 style="color:#7c3aed;">OneTalky — Lembrete de Aula</h2>
              <p>Olá <strong>${lesson.tutor_name}</strong>,</p>
              <p>Sua aula com <strong>${lesson.student_name}</strong> está agendada para <strong>${lessonTime}</strong> (horário de Brasília).</p>
              <p>Acesse a plataforma alguns minutos antes para se preparar.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
              <p style="color:#94a3b8;font-size:12px;">OneTalky Language Platform</p>
            </div>`,
          });
          sent++;
          results.push({ role: 'tutor', email: tutorEmail, lesson_id: lesson.id });
        } catch (e) {
          results.push({ role: 'tutor', email: tutorEmail, error: e.message });
        }
      }
    }

    return Response.json({ success: true, sent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});