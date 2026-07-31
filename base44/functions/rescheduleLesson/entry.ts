import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { normalizeSlot } from "../../shared/slotUtils.js";
import { requireOtp } from "../../shared/requireOtp.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id, new_scheduled_at, message } = await req.json();
    if (!lesson_id || !new_scheduled_at) {
      return Response.json({ error: "lesson_id and new_scheduled_at required" }, { status: 400 });
    }

    // Validate the new date is in the future
    if (new Date(new_scheduled_at) <= new Date()) {
      return Response.json({ error: "New scheduled time must be in the future" }, { status: 400 });
    }

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    if (lessons.length === 0) return Response.json({ error: "Lesson not found" }, { status: 404 });
    const lesson = lessons[0];

    // Only the tutor of this lesson can reschedule
    if (user.id !== lesson.tutor_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const otpGate = requireOtp(user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    if (lesson.status !== "scheduled") {
      return Response.json({ error: "Only scheduled lessons can be rescheduled" }, { status: 400 });
    }

    const normalizedNew = normalizeSlot(new_scheduled_at);
    const normalizedOld = normalizeSlot(lesson.scheduled_at);

    // ── Reject if the tutor already has a DIFFERENT lesson at the new time ──
    const tutorLessons = await base44.asServiceRole.entities.Lesson.filter({ tutor_id: lesson.tutor_id });
    const tutorConflict = tutorLessons.find((l: any) =>
      l.id !== lesson_id && l.status !== "cancelled" && l.scheduled_at && normalizeSlot(l.scheduled_at) === normalizedNew
    );
    if (tutorConflict) {
      return Response.json({ error: "Novo horário já está ocupado" }, { status: 409 });
    }

    // ── Reject if the student already has a DIFFERENT lesson (any tutor) at the new time ──
    const studentLessons = await base44.asServiceRole.entities.Lesson.filter({ student_id: lesson.student_id });
    const studentConflict = studentLessons.find((l: any) =>
      l.id !== lesson_id && l.status !== "cancelled" && l.scheduled_at && normalizeSlot(l.scheduled_at) === normalizedNew
    );
    if (studentConflict) {
      return Response.json({ error: "O aluno já tem outra aula agendada nesse horário" }, { status: 409 });
    }

    const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
    if (tutorProfiles.length === 0) return Response.json({ error: "Tutor profile not found" }, { status: 404 });
    const tp = tutorProfiles[0];

    const newSlotFull = `${normalizedNew}:00Z`;
    const oldSlotFull = (tp.booked_slots || []).find((s: string) => normalizeSlot(s) === normalizedOld) || `${normalizedOld}:00Z`;

    // Atomic slot move: only succeeds if the new slot isn't already booked on the
    // tutor profile at the moment of the write — protects against a concurrent
    // booking/reschedule claiming the same slot between our read and this update.
    const casResult = await base44.asServiceRole.entities.TutorProfile.updateMany(
      { id: tp.id, booked_slots: { $nin: [newSlotFull] } },
      { $addToSet: { booked_slots: newSlotFull }, $pull: { booked_slots: oldSlotFull } }
    );

    if (casResult.updated === 0) {
      return Response.json({ error: "Novo horário já está ocupado" }, { status: 409 });
    }

    await base44.asServiceRole.entities.Lesson.update(lesson_id, { scheduled_at: new_scheduled_at });

    // Notify student
    const newDate = new Date(new_scheduled_at).toLocaleString();
    await base44.asServiceRole.entities.Notification.create({
      user_id: lesson.student_id,
      title: "Lesson rescheduled",
      message: message
        ? `Your lesson was moved to ${newDate}. Note from tutor: "${message}"`
        : `Your lesson was rescheduled to ${newDate}.`,
      type: "lesson_reminder",
      is_read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[rescheduleLesson]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});