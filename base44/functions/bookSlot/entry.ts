import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tutor_profile_id, scheduled_at, action } = await req.json();
    if (!tutor_profile_id || !scheduled_at) return Response.json({ error: 'Missing params' }, { status: 400 });

    // Use service role to bypass RLS — student can't update TutorProfile directly
    const tutorProfile = await base44.asServiceRole.entities.TutorProfile.get(tutor_profile_id);
    if (!tutorProfile) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    const currentBooked = tutorProfile.booked_slots || [];

    let updatedSlots;
    if (action === 'release') {
      updatedSlots = currentBooked.filter(s => s !== scheduled_at);
    } else {
      // Check if already booked
      if (currentBooked.includes(scheduled_at)) {
        return Response.json({ error: 'Slot already booked' }, { status: 409 });
      }
      updatedSlots = [...currentBooked, scheduled_at];
    }

    await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });
    return Response.json({ success: true, booked_slots: updatedSlots });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});