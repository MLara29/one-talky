import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Tutor confirms receipt of a withdrawal payment.
// Only tutor_confirmed + confirmed_at are ever written — amount/status never
// come from the client, preventing the tutor from tampering with financial fields.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) return Response.json({ error: "withdrawal_id required" }, { status: 400 });

    const withdrawal = await base44.asServiceRole.entities.WithdrawalRequest.get(withdrawal_id);
    if (!withdrawal) return Response.json({ error: "Withdrawal not found" }, { status: 404 });

    if (withdrawal.tutor_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (withdrawal.status !== "paid") {
      return Response.json({ error: "Only payments marked as paid can be confirmed" }, { status: 400 });
    }
    if (withdrawal.tutor_confirmed) {
      return Response.json({ success: true, already_confirmed: true });
    }

    await base44.asServiceRole.entities.WithdrawalRequest.update(withdrawal_id, {
      tutor_confirmed: true,
      confirmed_at: new Date().toISOString(),
    });

    // Notify admins about payment confirmation
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      await base44.asServiceRole.entities.Notification.bulkCreate(
        admins.map((a) => ({
          user_id: a.id,
          title: `✅ Pagamento confirmado: ${withdrawal.tutor_name || ""}`,
          message: `Tutor ${withdrawal.tutor_name || ""} confirmou o recebimento de $${(withdrawal.amount || 0).toFixed(2)}.`,
          type: "general",
          is_read: false,
          link: "/admin/earnings",
        }))
      );
    } catch (e) {
      console.error("[confirmWithdrawal] notify admins failed:", e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[confirmWithdrawal]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});