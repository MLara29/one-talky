import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    // No authenticated user in this context — invoked directly by the scheduled
    // workflow (cron), which carries no user session. Safe without auth because:
    // this function takes no input from the caller, and only acts on earnings
    // whose release_date has already objectively passed — there's no way to
    // release a commission early by calling this out of schedule.
    const base44 = createClientFromRequest(req);

    // Fetch all earnings still waiting the 7-day window
    const pending = await base44.asServiceRole.entities.AffiliateEarning.filter({
      status: "aguardando_7_dias",
    });

    const now = new Date();
    const toProcess = pending.filter((e) => {
      if (!e.release_date) return false;
      return new Date(e.release_date) <= now;
    });

    let released = 0;
    let voided = 0;

    for (const earning of toProcess) {
      // Antes de liberar, confere se o aluno recebeu um reembolso (dentro da
      // garantia de 7 dias) ENTRE a data da venda e a data de liberação desta
      // comissão específica. Se sim, a venda que gerou essa comissão foi
      // revertida — a comissão não deve ser paga ao afiliado.
      // Usa StudentAccountEvent (type: "refund_issued"), que já registra o
      // horário exato de cada reembolso — mais preciso do que um flag genérico
      // no perfil, porque permite casar o reembolso com a venda certa mesmo
      // que o aluno tenha assinado e cancelado mais de uma vez ao longo do tempo.
      let wasRefunded = false;
      if (earning.sale_date && earning.release_date) {
        try {
          const refundEvents = await base44.asServiceRole.entities.StudentAccountEvent.filter({
            student_id: earning.student_id,
            type: "refund_issued",
          });
          const saleMs = new Date(earning.sale_date).getTime();
          const releaseMs = new Date(earning.release_date).getTime();
          wasRefunded = refundEvents.some((ev) => {
            if (!ev.created_at) return false;
            const evMs = new Date(ev.created_at).getTime();
            return evMs >= saleMs && evMs <= releaseMs;
          });
        } catch (e) {
          console.error("[releaseAffiliateCommissions] failed to check refund events for earning", earning.id, e.message);
        }
      }

      if (wasRefunded) {
        await base44.asServiceRole.entities.AffiliateEarning.update(earning.id, {
          status: "cancelado",
        });
        voided++;
        console.log(`[releaseAffiliateCommissions] voided earning ${earning.id} — refund found between sale and release`);
        continue;
      }

      await base44.asServiceRole.entities.AffiliateEarning.update(earning.id, {
        status: "liberado",
      });
      released++;
    }

    return Response.json({ success: true, released, voided, checked: pending.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
