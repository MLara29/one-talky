import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all earnings still waiting the 7-day window
    const pending = await base44.asServiceRole.entities.AffiliateEarning.filter({
      status: "aguardando_7_dias",
    });

    const now = new Date();
    const toRelease = pending.filter((e) => {
      if (!e.release_date) return false;
      return new Date(e.release_date) <= now;
    });

    let released = 0;
    for (const earning of toRelease) {
      await base44.asServiceRole.entities.AffiliateEarning.update(earning.id, {
        status: "liberado",
      });
      released++;
    }

    return Response.json({ success: true, released, checked: pending.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});