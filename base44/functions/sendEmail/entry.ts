import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.14';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, html, text } = await req.json();
    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: 'Missing required fields: to, subject, html or text' }, { status: 400 });
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

    const toList = Array.isArray(to) ? to : [to];

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toList.join(', '),
      subject,
      text: text || '',
      html: html || '',
    });

    return Response.json({ success: true, messageId: info.messageId, sent_to: toList });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});