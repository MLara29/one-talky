import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { sendTikTokEvent } from "../../shared/tiktokConversions.js";

// Server-side TikTok Events API — sends conversion events direto pro servidor
// do TikTok, sem depender do pixel do navegador (mesmo motivo do Meta: o pixel
// client-side pode ser bloqueado por CSP/ad-blocker). Mesmo padrão das funções
// sendMetaConversion / sendMetaPurchase, unificado numa única function que
// aceita o nome do evento no body.
//
// Eventos suportados hoje:
//   - CompleteRegistration — disparado no onboarding do aluno (qualquer user autenticado)
//   - Purchase             — disparado pelo webhook da Stripe (service role) OU
//                            por esta function para teste (admin-only)
//
// ⚠️  TEST-FIRST DEFAULT: se nenhum testEventCode for passado explicitamente no
//     body, cai automaticamente pro secret TIKTOK_TEST_EVENT_CODE. Assim um teste
//     manual nunca dispara um evento de produção — sempre cai na aba Test Events
//     do TikTok Ads Manager (se o test code estiver configurado). Passe
//     testEventCode: "" pra forçar produção (admin-only, intencional).
//
// ⚠️  Purchase é admin-only por esta function: só role="admin" pode disparar
//     Purchase por aqui, pra evitar eventos falsos. O webhook de produção
//     (stripeWebhook) NÃO passa por esta function — chama sendTikTokEvent
//     diretamente — então este gate não afeta compras reais.
//
// Idempotency: TikTok deduplicates by event_id. Pass a stable eventId
// (e.g. o Stripe event id) pra que retries do webhook não criem eventos
// duplicados.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const { event, value, currency, eventId, userId, testEventCode } = body || {};
    const eventName = event || "CompleteRegistration";

    // Purchase via esta function é admin-only (webhook chama o shared module direto).
    if (eventName === "Purchase" && user.role !== "admin") {
      return Response.json({ error: "Forbidden — Purchase event is admin only" }, { status: 403 });
    }

    // ── Test-first fallback ─────────────────────────────────────────────────
    // Explicit body param wins. If absent, fall back to TIKTOK_TEST_EVENT_CODE
    // secret so manual tests never hit production. Pass testEventCode: "" to
    // explicitly force a production event (admin-only, intentional).
    const resolvedTestCode =
      testEventCode !== undefined
        ? testEventCode
        : (secrets.get("TIKTOK_TEST_EVENT_CODE") || "");

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const userAgent = req.headers.get("user-agent") || "";

    const result = await sendTikTokEvent(base44, {
      eventName,
      value,
      currency,
      eventId: eventId || "",
      // Se passou userId no body (teste admin), usa ele; senão usa o próprio user.
      userId: userId || user.id,
      ip,
      userAgent,
      testEventCode: resolvedTestCode,
    });
    return Response.json(result, { status: 200 });
  } catch (err) {
    // Best effort — nunca propaga erro pro fluxo do usuário.
    console.error("[sendTikTokConversion] erro inesperado:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 200 });
  }
}