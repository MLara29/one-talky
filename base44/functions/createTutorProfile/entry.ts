import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { profile } = await req.json();
    if (!profile) return Response.json({ error: "profile required" }, { status: 400 });

    // Prevent duplicate profiles
    const existing = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: user.id });
    if (existing.length > 0) {
      return Response.json({ error: "Profile already exists" }, { status: 409 });
    }

    // Create profile — financial fields locked to defaults, status always "pending"
    const created = await base44.asServiceRole.entities.TutorProfile.create({
      user_id: user.id,
      full_name: String(profile.full_name || "").slice(0, 200),
      country: String(profile.country || "").slice(0, 100),
      nationality: String(profile.nationality || "").slice(0, 100),
      native_languages: Array.isArray(profile.native_languages) ? profile.native_languages.slice(0, 10) : [],
      bio: String(profile.bio || "").slice(0, 300),
      intro_video_url: profile.intro_video_url ? String(profile.intro_video_url).slice(0, 500) : undefined,
      interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 30) : [],
      // Financial / status fields are always server-defaults — never from client
      price_per_minute: 0.0833,
      status: "pending",
      total_earnings: 0,
      total_lessons: 0,
      total_minutes: 0,
      average_rating: 0,
      total_reviews: 0,
    });

    // Assign tutor role server-side (client cannot self-assign privileged roles)
    await base44.asServiceRole.entities.User.update(user.id, { role: "tutor" });

    return Response.json({ success: true, profile_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});