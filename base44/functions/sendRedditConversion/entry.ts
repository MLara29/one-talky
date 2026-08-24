import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";

// Envia o evento de conversão "SignUp" direto pro servidor da Reddit
// (Conversions API), sem depender do pixel rodando no navegador da pessoa —
// contorna o bloqueio de CSP da plataforma que impede o pixel client-side
// de carregar, e também não é afetado por bloqueador de anúncio no
// navegador do usuário final.
//
// Chamada só uma vez, no momento em que o cadastro do aluno é de fato
// concluído (ver OnboardingStudent.jsx). Usa o e-mail do PRÓPRIO usuário
// autenticado (nunca confia em e-mail vindo do corpo da requisição), e
// nunca falha o cadastro do aluno se o envio pro Reddit der erro — é best
// effort, roda depois do que realmente importa (criar o perfil).

const PIXEL_ID = "a2_jk4d5od7cftz";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = secrets.get("REDDIT_CAPI_ACCESS_TOKEN");
    if (!token) {
      // Nunca deve quebrar o fluxo do usuário por causa disso — só loga.
      console.error("[sendRedditConversion] REDDIT_CAPI_ACCESS_TOKEN não configurado");
      return Response.json({ skipped: true }, { status: 200 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const userAgent = req.headers.get("user-agent") || "";

    const userSignals: Record<string, string> = {};
    if (user.email) userSignals.email = await sha256Hex(user.email);
    if (ip) userSignals.ip_address = await sha256Hex(ip);
    if (userAgent) userSignals.user_agent = userAgent;

    const payload = {
      data: {
        events: [
          {
            event_at: Date.now(),
            action_source: "WEBSITE",
            type: { tracking_type: "SignUp" },
            ...(Object.keys(userSignals).length > 0 ? { user: userSignals } : {}),
          },
        ],
      },
    };

    const res = await fetch(
      `https://ads-api.reddit.com/api/v3/pixels/${PIXEL_ID}/conversion_events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const resultText = await res.text();
    if (!res.ok) {
      console.error("[sendRedditConversion] Reddit API error:", res.status, resultText);
      return Response.json({ ok: false, status: res.status }, { status: 200 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[sendRedditConversion] erro inesperado:", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
