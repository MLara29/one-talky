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

    // Normalize to "YYYY-MM-DDTHH:MM" (minute precision, no seconds/ms/tz) for reliable comparison
    const normalize = (iso) => {
      const d = new Date(iso);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}T${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
    };

    const normalizedNew = normalize(scheduled_at);
    const normalizedBooked = currentBooked.map(normalize);

    let updatedSlots;
    if (action === 'release') {
      updatedSlots = currentBooked.filter((s, i) => normalizedBooked[i] !== normalizedNew);
    } else {
      // Check if already booked (normalized comparison)
      if (normalizedBooked.includes(normalizedNew)) {
        return Response.json({ error: 'Slot already booked' }, { status: 409 });
      }
      // Store as normalized ISO (minute precision UTC) for consistent future comparisons
      updatedSlots = [...currentBooked, normalizedNew + ':00Z'];
    }

    await base44.asServiceRole.entities.TutorProfile.update(tutor_profile_id, { booked_slots: updatedSlots });
    return Response.json({ success: true, booked_slots: updatedSlots });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});