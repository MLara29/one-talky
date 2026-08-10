import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "affiliate") return Response.json({ error: "Forbidden" }, { status: 403 });

    const affiliates = await base44.asServiceRole.entities.Affiliate.filter({ user_id: user.id });
    if (affiliates.length === 0) {
      return Response.json({ data: { freeStudents: [], paidStudents: [] } });
    }
    const aff = affiliates[0];

    const allProfiles = await base44.asServiceRole.entities.StudentProfile.filter(
      { coupon_code: aff.coupon_code },
      "-created_date",
      200
    );

    const freeStudents = allProfiles.filter(s => s.plan === "free");
    const paidStudents = allProfiles.filter(s => s.plan !== "free");

    return Response.json({ data: { freeStudents, paidStudents } });
  } catch (error) {
    console.error("[getMyReferredStudents]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});