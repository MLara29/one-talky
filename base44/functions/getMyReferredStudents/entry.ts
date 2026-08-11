import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "affiliate") return Response.json({ error: "Forbidden" }, { status: 403 });

    console.log("[getMyReferredStudents] DEBUG user.id:", user.id, "user.email:", user.email);

    const affiliates = await base44.asServiceRole.entities.Affiliate.filter({ user_id: user.id });
    console.log("[getMyReferredStudents] DEBUG affiliates found:", affiliates.length, JSON.stringify(affiliates.map(a => ({ id: a.id, user_id: a.user_id, coupon_code: a.coupon_code }))));

    if (affiliates.length === 0) {
      return Response.json({ data: { freeStudents: [], paidStudents: [] } });
    }
    const aff = affiliates[0];

    const allProfiles = await base44.asServiceRole.entities.StudentProfile.filter(
      { coupon_code: aff.coupon_code },
      "-created_date",
      200
    );
    console.log("[getMyReferredStudents] DEBUG coupon:", aff.coupon_code, "profiles found:", allProfiles.length);

    const freeStudents = allProfiles.filter(s => s.plan === "free");
    const paidStudents = allProfiles.filter(s => s.plan !== "free");

    return Response.json({ data: { freeStudents, paidStudents } });
  } catch (error) {
    console.error("[getMyReferredStudents]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});