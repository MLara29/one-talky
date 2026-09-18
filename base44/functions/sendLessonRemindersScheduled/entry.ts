import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { processLessonReminders } from '../../shared/lessonReminders.js';

// Automated lesson reminder sender — invoked by the SendLessonReminders
// workflow (cron every 5 minutes). No authenticated user in this context;
// safe without auth because this function takes no input from the caller
// and only sends reminders for lessons that are objectively "scheduled"
// and within the time window. The reminder_tutor_sent /
// reminder_student_sent flags on each Lesson guarantee idempotency —
// running this multiple times never sends the same reminder twice.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { sent, results } = await processLessonReminders(base44, {
      tutorMinutes: 60,
      studentMinutes: 30,
      force: false,
      sentBy: 'system',
    });

    return Response.json({ success: true, sent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});