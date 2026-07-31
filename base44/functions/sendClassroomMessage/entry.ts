import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireNotBlocked } from "../../shared/requireNotBlocked.js";

// Creates a ClassroomMessage only after verifying the sender is a participant
// (tutor or student) of the referenced lesson — prevents posting into lessons
// the user has no part in.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lesson_id, text, sender_name } = await req.json();
    if (!lesson_id || !text) {
      return Response.json({ error: "lesson_id and text required" }, { status: 400 });
    }

    const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
    if (!lesson || (lesson.tutor_id !== user.id && lesson.student_id !== user.id)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (lesson.student_id === user.id) {
      const blockedGate = await requireNotBlocked(base44, user.id);
      if (!blockedGate.ok) return Response.json({ error: blockedGate.error }, { status: blockedGate.status });
    }

    const message = await base44.asServiceRole.entities.ClassroomMessage.create({
      lesson_id,
      sender_id: user.id,
      sender_name: sender_name || user.full_name || user.email || "User",
      text: String(text).slice(0, 2000),
    });

    return Response.json({ success: true, message });
  } catch (error) {
    console.error("[sendClassroomMessage]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});