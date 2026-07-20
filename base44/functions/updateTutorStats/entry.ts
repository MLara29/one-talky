import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { tutor_user_id } = body;
    if (!tutor_user_id) return Response.json({ error: 'tutor_user_id required' }, { status: 400 });

    const [reviews, lessons, profiles] = await Promise.all([
      base44.asServiceRole.entities.Review.filter({ tutor_id: tutor_user_id }),
      base44.asServiceRole.entities.Lesson.filter({ tutor_id: tutor_user_id, status: "completed" }),
      base44.asServiceRole.entities.TutorProfile.filter({ user_id: tutor_user_id }),
    ]);

    if (profiles.length === 0) return Response.json({ error: 'Tutor profile not found' }, { status: 404 });

    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total : 0;

    await base44.asServiceRole.entities.TutorProfile.update(profiles[0].id, {
      total_reviews: total,
      average_rating: Math.round(avg * 10) / 10,
      total_lessons: lessons.length,
    });

    return Response.json({ success: true, total_reviews: total, average_rating: Math.round(avg * 10) / 10, total_lessons: lessons.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});