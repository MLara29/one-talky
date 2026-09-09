import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// One-time migration: replicates each tutor's weekly availability pattern
// (TutorProfile.availability, keyed by day-of-week name) into per-date
// TutorAvailabilityDate records for the next 90 days.
//
// After this migration, TutorAvailabilityDate becomes the single source of
// truth for scheduling. TutorProfile.availability is kept as an optional
// "template" the tutor can use to quickly fill new days, but is never again
// read directly for booking.
//
// Idempotent: uses bulkCreate after fetching all existing records per tutor
// in a single query, so re-running only fills gaps.
//
// Admin-only.

const MIGRATION_DAYS = 90;

function getDateInfoInTz(tz: string, offsetDays: number): { dateStr: string; dayName: string } {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "long",
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "";
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    dayName: get("weekday"),
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const tutors = await base44.asServiceRole.entities.TutorProfile.list("-created_date", 500);
    let created = 0;
    let tutorsWithAvailability = 0;
    let tutorsSkipped = 0;

    for (const tutor of tutors) {
      const availability = tutor.availability;
      if (!availability || Object.keys(availability).length === 0) {
        tutorsSkipped++;
        continue;
      }
      tutorsWithAvailability++;

      const tutorTz = tutor.timezone || "UTC";

      // Fetch all existing per-date records for this tutor in ONE query
      const existing = await base44.asServiceRole.entities.TutorAvailabilityDate.filter(
        { tutor_id: tutor.user_id }, "date", 500
      );
      const existingDates = new Set(existing.map(r => r.date));

      const toCreate: any[] = [];
      for (let offset = 0; offset < MIGRATION_DAYS; offset++) {
        const { dateStr, dayName } = getDateInfoInTz(tutorTz, offset);
        if (existingDates.has(dateStr)) continue;
        const slots = availability[dayName] || [];
        if (!slots || slots.length === 0) continue;
        toCreate.push({ tutor_id: tutor.user_id, date: dateStr, slots });
      }

      if (toCreate.length > 0) {
        await base44.asServiceRole.entities.TutorAvailabilityDate.bulkCreate(toCreate);
        created += toCreate.length;
      }
    }

    return Response.json({
      success: true,
      created,
      tutors_total: tutors.length,
      tutors_with_availability: tutorsWithAvailability,
      tutors_skipped_empty: tutorsSkipped,
      migration_days: MIGRATION_DAYS,
    });
  } catch (error) {
    console.error('[migrateAvailabilityToDate]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}