import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { requireOtp } from "../../shared/requireOtp.js";

// Admin-only: upserts the single PayoutSettings record with the chosen
// sweep_weekday (0=Sunday...6=Saturday) used to schedule the payout review.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { sweep_weekday, notification_email } = await req.json();

    const updates: Record<string, unknown> = {};
    if (sweep_weekday !== undefined) {
      if (typeof sweep_weekday !== "number" || sweep_weekday < 0 || sweep_weekday > 6) {
        return Response.json({ error: "sweep_weekday must be a number between 0 and 6" }, { status: 400 });
      }
      updates.sweep_weekday = sweep_weekday;
    }
    if (notification_email !== undefined) {
      const email = String(notification_email).trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: "notification_email inválido" }, { status: 400 });
      }
      updates.notification_email = email;
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.PayoutSettings.list("-created_date", 1);
    if (existing[0]) {
      await base44.asServiceRole.entities.PayoutSettings.update(existing[0].id, updates);
    } else {
      await base44.asServiceRole.entities.PayoutSettings.create(updates);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[updatePayoutSettings]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});