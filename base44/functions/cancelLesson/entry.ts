import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id, message } = await req.json();
    if (!lesson_id) return Response.json({ error: "lesson_id required" }, { status: 400 });

    const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lesson_id });
    if (lessons.length === 0) return Response.json({ error: "Lesson not found" }, { status: 404 });
    const lesson = lessons[0];

    // Only participants can cancel
    if (user.id !== lesson.tutor_id && user.id !== lesson.student_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only scheduled lessons can be cancelled this way
    if (lesson.status !== "scheduled") {
      return Response.json({ error: "Only scheduled lessons can be cancelled" }, { status: 400 });
    }

    await base44.asServiceRole.entities.Lesson.update(lesson_id, { status: "cancelled" });

    // Release the booked slot on the tutor's profile
    if (lesson.scheduled_at) {
      const tutorProfiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
      if (tutorProfiles.length > 0) {
        const tp = tutorProfiles[0];
        const booked = (tp.booked_slots || []).filter((s: string) => s !== lesson.scheduled_at);
        await base44.asServiceRole.entities.TutorProfile.update(tp.id, { booked_slots: booked });
      }
    }

    // Notify the other party
    const isStudent = user.id === lesson.student_id;
    const notifyUserId = isStudent ? lesson.tutor_id : lesson.student_id;
    const notifyName = isStudent ? lesson.student_name : lesson.tutor_name;
    await base44.asServiceRole.entities.Notification.create({
      user_id: notifyUserId,
      title: `Lesson cancelled by ${isStudent ? "student" : "tutor"}`,
      message: message
        ? `${notifyName} cancelled the lesson. Message: "${message}"`
        : `${notifyName} cancelled the scheduled lesson.`,
      type: "general",
      is_read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});