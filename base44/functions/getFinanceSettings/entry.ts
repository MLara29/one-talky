import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getFinanceSettings } from "../../shared/financeSettings.js";

// Admin-only read of the singleton AdminFinanceSettings. No OTP required
// (read-only — the values themselves are not sensitive).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const settings = await getFinanceSettings(base44);
    return Response.json({ data: settings });
  } catch (error) {
    console.error('[getFinanceSettings]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});