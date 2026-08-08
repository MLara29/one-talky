import nodemailer from 'npm:nodemailer@6.9.14';

// Shared SMTP transporter factory — avoids duplicating SMTP_* env reads and
// nodemailer.createTransport(...) calls across every email-sending function.
export function getTransporter() {
  const port = parseInt(Deno.env.get('SMTP_PORT') || '465');
  return nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: { user: Deno.env.get('SMTP_USER'), pass: Deno.env.get('SMTP_PASS') },
  });
}

export const SMTP_FROM = () => Deno.env.get('SMTP_FROM');

// Sends an email via the given transporter AND logs it to EmailLog, with an
// automatic BCC to the address configured in PayoutSettings.email_bcc_address.
// Every email-sending function in the app should route through this helper so
// the full history is captured in one place.
//
// mailOptions is a standard nodemailer options object (from, to, subject,
// html, text, attachments, …). The internal `_sentBy` field is stripped before
// sending and used only for the log record (admin user id, or "system").
// Returns the nodemailer info object (same as transporter.sendMail).
export async function sendMailAndLog(base44, transporter, mailOptions, source) {
  const { _sentBy, ...sendOpts } = mailOptions;

  const settings = await base44.asServiceRole.entities.PayoutSettings.list("-created_date", 1);
  const bccAddress = settings[0]?.email_bcc_address;

  const info = await transporter.sendMail({
    ...sendOpts,
    ...(bccAddress ? { bcc: bccAddress } : {}),
  });

  try {
    await base44.asServiceRole.entities.EmailLog.create({
      to: sendOpts.to,
      subject: sendOpts.subject,
      html_preview: sendOpts.html || sendOpts.text || "",
      source,
      sent_by: _sentBy || "system",
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[mailer] EmailLog create failed:", e.message);
  }

  return info;
}