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