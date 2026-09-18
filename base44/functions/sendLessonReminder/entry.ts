import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireOtp } from '../../shared/requireOtp.js';
import { processLessonReminders } from '../../shared/lessonReminders.js';

// Manual admin-triggered lesson reminder sender.
// Requires admin + OTP (2FA). Used by the "Send reminders" button in
// AdminEmail.jsx for testing or manual re-sends.
//
// Body params:
//   tutor_minutes   — send tutor reminder when lesson is within this many minutes (default 60)
//   student_minutes — send student reminder when lesson is within this many minutes (default 30)
//   force           — if true, bypass reminder_tutor_sent / reminder_student_sent checks (re-send even if already sent)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const body = await req.json().catch(() => ({}));
    const tutorMinutes = Number(body.tutor_minutes) || 60;
    const studentMinutes = Number(body.student_minutes) || 30;
    const force = body.force === true;

    const { sent, results } = await processLessonReminders(base44, {
      tutorMinutes,
      studentMinutes,
      force,
      sentBy: user.id,
    });

    return Response.json({ success: true, sent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});