import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tutor_profile_id, scheduled_at, action, lesson_id } = await req.json();
    if (!tutor_profile_id || !scheduled_at) return Response.json({ error: 'Missing params' }, { status: 400 });

    // For 'release' action, verify the lesson belongs to the calling user
    if (action === 'release') {
      if (!lesson_id) return Response.json({ error: 'lesson_id required to release a slot' }, { status: 400 });
      const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
      if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });
      if (lesson.student_id !== user.id && lesson.tutor_id !== user.id && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // For booking, verify the caller is a student (only students book slots)
      if (user.role !== 'student' && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const tutorProfile = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id);
    if (!tutorProfile) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    const currentBooked = tutorProfile.booked_slots || [];

    const normalize = (iso) => {
      const d = new Date(iso);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}T${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
    };

    const normalizedNew = normalize(scheduled_at);
    const normalizedBooked = currentBooked.map(normalize);

    let updatedSlots;
    if (action === 'release') {
      updatedSlots = currentBooked.filter((_, i) => normalizedBooked[i] !== normalizedNew);
    } else {
      if (normalizedBooked.includes(normalizedNew)) {
        return Response.json({ error: 'Slot already booked' }, { status: 409 });
      }
      updatedSlots = [...currentBooked, normalizedNew + ':00Z'];
    }

    await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });
    return Response.json({ success: true, booked_slots: updatedSlots });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});