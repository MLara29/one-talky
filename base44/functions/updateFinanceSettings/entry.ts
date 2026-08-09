import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireOtp } from "../../shared/requireOtp.js";
import { FINANCE_DEFAULTS } from "../../shared/financeSettings.js";

// Admin-only partial upsert of the singleton AdminFinanceSettings.
// OTP-gated like updatePayoutSettings. Only provided fields are updated.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const body = await req.json().catch(() => ({}));

    const allowedKeys = Object.keys(FINANCE_DEFAULTS);
    const updates: Record<string, number> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        const val = Number(body[key]);
        if (Number.isNaN(val)) {
          return Response.json({ error: `${key} deve ser um número` }, { status: 400 });
        }
        updates[key] = val;
      }
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.AdminFinanceSettings.list("-created_date", 1);
    if (existing[0]) {
      await base44.asServiceRole.entities.AdminFinanceSettings.update(existing[0].id, updates);
    } else {
      await base44.asServiceRole.entities.AdminFinanceSettings.create(updates);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[updateFinanceSettings]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});