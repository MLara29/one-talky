import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireNotBlocked } from "../../shared/requireNotBlocked.js";

// Cancels the student's paid plan and returns them to Free.
// Plan/credits are never accepted from the client — only "free" downgrade is
// allowed here; upgrades and paid-plan changes must go through real checkout
// (mpProcessPayment / mpConfirmPayment), which verify payment before crediting.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "student") return Response.json({ error: "Forbidden" }, { status: 403 });

    const blockedGate = await requireNotBlocked(base44, user.id);
    if (!blockedGate.ok) return Response.json({ error: blockedGate.error }, { status: blockedGate.status });

    const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: "Profile not found" }, { status: 404 });
    const profile = profiles[0];

    if (!profile.plan || profile.plan === "free") {
      return Response.json({ success: true, already_free: true });
    }

    await base44.asServiceRole.entities.StudentProfile.update(profile.id, {
      plan: "free",
      credits_minutes: 0,
      subscription_status: "cancelled",
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[cancelMyPlan]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});