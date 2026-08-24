// Whitelist of fields safe to expose to students. Used by the realtime
// subscription handler in StudentDashboard to strip sensitive data (bank_info,
// total_earnings, etc.) from incoming entity events before storing in React
// state. The authoritative stripping happens server-side in getPublicTutors;
// this is a client-side defense-in-depth for subscription payloads.
const SAFE_TUTOR_FIELDS = [
  'id', 'created_date', 'updated_date',
  'user_id', 'full_name', 'display_name', 'photo_url',
  'country', 'nationality', 'timezone',
  'native_languages', 'other_languages',
  'bio', 'intro_video_url', 'interests',
  'price_per_minute', 'availability', 'booked_slots',
  'is_available_now', 'in_lesson', 'last_seen',
  'accent', 'average_rating', 'total_reviews', 'total_lessons',
  'status', 'min_booking_notice_hours',
];

export function stripTutorFields(tutor) {
  if (!tutor) return null;
  const safe = {};
  for (const f of SAFE_TUTOR_FIELDS) {
    if (f in tutor) safe[f] = tutor[f];
  }
  return safe;
}