import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from "../../shared/requireOtp.js";

// Fields that tutors are allowed to update on their own profile
const TUTOR_ALLOWED_FIELDS = new Set([
  "full_name", "display_name", "bio", "bank_info", "photo_url", "intro_video_url",
  "availability", "is_available_now", "last_seen", "timezone", "accent",
  "booked_slots", "interests", "other_languages", "min_booking_notice_hours", "payout_frequency",
]);

// Fields that students are allowed to update on their own profile
const STUDENT_ALLOWED_FIELDS = new Set([
  "full_name", "photo_url", "nationality", "accent_preference",
  "conversation_topics", "objective", "level", "target_language", "last_seen",
]);

// Fields that affiliates are allowed to update on their own profile
const AFFILIATE_ALLOWED_FIELDS = new Set(["last_seen"]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { updates } = await req.json();
    if (!updates || typeof updates !== "object") {
      return Response.json({ error: "updates object required" }, { status: 400 });
    }

    const role = user.role;

    if (role === "tutor") {
      const otpGate = await requireOtp(base44, req, user);
      if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

      // Strip any fields not in the allowed list — financial fields are never touched
      const safeUpdates: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        if (TUTOR_ALLOWED_FIELDS.has(key)) {
          safeUpdates[key] = updates[key];
        }
      }
      if (Object.keys(safeUpdates).length === 0) {
        return Response.json({ error: "No allowed fields to update" }, { status: 400 });
      }
      const profiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length === 0) return Response.json({ error: "Profile not found" }, { status: 404 });
      await base44.asServiceRole.entities.TutorProfile.update(profiles[0].id, safeUpdates);
      return Response.json({ success: true });

    } else if (role === "student") {
      const safeUpdates: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        if (STUDENT_ALLOWED_FIELDS.has(key)) {
          safeUpdates[key] = updates[key];
        }
      }
      if (Object.keys(safeUpdates).length === 0) {
        return Response.json({ error: "No allowed fields to update" }, { status: 400 });
      }
      const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length === 0) return Response.json({ error: "Profile not found" }, { status: 404 });
      try {
        await base44.asServiceRole.entities.StudentProfile.update(profiles[0].id, safeUpdates);
      } catch (updateErr) {
        console.error('[updateMyProfile] student update failed:', updateErr.message);
        return Response.json({ error: `Falha ao gravar: ${updateErr.message}` }, { status: 500 });
      }
      return Response.json({ success: true });

    } else if (role === "affiliate") {
      const safeUpdates: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        if (AFFILIATE_ALLOWED_FIELDS.has(key)) {
          safeUpdates[key] = updates[key];
        }
      }
      if (Object.keys(safeUpdates).length === 0) {
        return Response.json({ error: "No allowed fields to update" }, { status: 400 });
      }
      const profiles = await base44.asServiceRole.entities.Affiliate.filter({ user_id: user.id });
      if (profiles.length === 0) return Response.json({ error: "Profile not found" }, { status: 404 });
      try {
        await base44.asServiceRole.entities.Affiliate.update(profiles[0].id, safeUpdates);
      } catch (updateErr) {
        console.error('[updateMyProfile] affiliate update failed:', updateErr.message);
        return Response.json({ error: `Falha ao gravar: ${updateErr.message}` }, { status: 500 });
      }
      return Response.json({ success: true });

    } else {
      return Response.json({ error: "Forbidden for this role" }, { status: 403 });
    }
  } catch (error) {
    console.error('[updateMyProfile]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});