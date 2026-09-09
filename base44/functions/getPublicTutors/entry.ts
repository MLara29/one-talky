import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns tutor profiles with ONLY public-safe fields — strips bank_info,
// total_earnings, and all internal/admin-only fields so they never transit
// the API to student-facing screens. Uses asServiceRole to read, then
// whitelists fields before returning.
//
// Payload:
//   { id: "<profileId>" }              → returns a single public tutor object
//   { filter: { status: "approved" } } → returns an array of public tutors
//   { filter: { user_id: "..." } }     → returns an array (usually 1 element)
//
// Any authenticated user may call this — only public fields are returned.

const SAFE_FIELDS = [
  'id', 'created_date', 'updated_date',
  'user_id', 'full_name', 'display_name', 'photo_url',
  'country', 'nationality', 'timezone',
  'native_languages', 'other_languages',
  'bio', 'intro_video_url', 'interests',
  'price_per_minute', 'availability', 'booked_slots',
  'is_available_now', 'in_lesson', 'last_seen',
  'accent', 'average_rating', 'total_reviews', 'total_lessons',
  'status', 'min_booking_notice_hours', 'schedule_frozen',
];

function strip(t: any): any {
  if (!t) return null;
  const safe: any = {};
  for (const f of SAFE_FIELDS) {
    if (f in t) safe[f] = t[f];
  }
  return safe;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id, filter } = body;

    if (id) {
      const t = await base44.asServiceRole.entities.TutorProfile.get(id);
      return Response.json(strip(t));
    }

    const tutors = await base44.asServiceRole.entities.TutorProfile.filter(filter || {});
    return Response.json(tutors.map(strip));
  } catch (error) {
    console.error('[getPublicTutors]', error.message);
    return Response.json({ error: 'Erro ao buscar tutores.' }, { status: 500 });
  }
}