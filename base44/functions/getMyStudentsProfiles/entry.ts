import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns StudentProfile records only for students the authenticated tutor
// actually has a real Lesson with — prevents a tutor from reading every
// student's billing/sensitive fields via a blanket RLS read.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'tutor' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { student_ids } = await req.json().catch(() => ({}));
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return Response.json({ profiles: [] });
    }

    // Verify each requested student_id corresponds to a real lesson with this tutor.
    const lessons = await base44.asServiceRole.entities.Lesson.filter({ tutor_id: user.id });
    const verifiedStudentIds = new Set(
      lessons.filter((l: any) => student_ids.includes(l.student_id)).map((l: any) => l.student_id)
    );

    if (verifiedStudentIds.size === 0) {
      return Response.json({ profiles: [] });
    }

    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({});
    const filtered = profiles.filter((sp: any) => verifiedStudentIds.has(sp.user_id));

    return Response.json({ profiles: filtered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}