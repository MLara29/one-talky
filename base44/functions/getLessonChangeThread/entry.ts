import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Returns the LessonChangeRequest + all LessonChangeMessage records for a
// given request_id, provided the caller is the tutor or student of that
// request. Uses asServiceRole (LessonChangeMessage RLS is admin-only).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { request_id } = await req.json();
    if (!request_id) return Response.json({ error: "request_id required" }, { status: 400 });

    const requests = await base44.asServiceRole.entities.LessonChangeRequest.filter({ id: request_id });
    if (requests.length === 0) return Response.json({ error: "Request not found" }, { status: 404 });
    const request = requests[0];

    if (user.id !== request.tutor_id && user.id !== request.student_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await base44.asServiceRole.entities.LessonChangeMessage.filter(
      { request_id }, "created_date"
    );

    return Response.json({ request, messages });
  } catch (error) {
    console.error('[getLessonChangeThread]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});