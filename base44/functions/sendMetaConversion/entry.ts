import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";

// Envia o evento de conversão "CompleteRegistration" direto pro servidor
// do Meta (Conversions API), sem depender do pixel do navegador — o pixel
// client-side está bloqueado pela mesma política de segurança da
// plataforma que já bloqueava o do Reddit (confirmado via DevTools:
// "(blocked:csp)" em fbevents.js). Mesmo padrão da função
// sendRedditConversion, adaptado pro formato que o Meta espera.
//
// Chamada só uma vez, no momento em que o cadastro do aluno é de fato
// concluído (ver OnboardingStudent.jsx). Usa o e-mail do PRÓPRIO usuário
// autenticado (nunca confia em e-mail vindo do corpo da requisição), e
// nunca falha o cadastro do aluno se o envio pro Meta der erro — é best
// effort, roda depois do que realmente importa (criar o perfil).

const PIXEL_ID = "1558500632424709";
const API_VERSION = "v21.0";

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

    const token = secrets.get("META_CAPI_ACCESS_TOKEN");
    if (!token) {
      // Nunca deve quebrar o fluxo do usuário por causa disso — só loga.
      console.error("[sendMetaConversion] META_CAPI_ACCESS_TOKEN não configurado");
      return Response.json({ skipped: true }, { status: 200 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const userAgent = req.headers.get("user-agent") || "";

    const userData: Record<string, unknown> = {};
    if (user.email) userData.em = [await sha256Hex(user.email)];
    if (ip) userData.client_ip_address = ip;
    if (userAgent) userData.client_user_agent = userAgent;
    userData.external_id = [await sha256Hex(user.id)];

    const payload = {
      data: [
        {
          event_name: "CompleteRegistration",
          // Meta espera segundos, não milissegundos (diferente do Reddit).
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: userData,
        },
      ],
    };

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const resultText = await res.text();
    if (!res.ok) {
      console.error("[sendMetaConversion] Meta API error:", res.status, resultText);
      return Response.json({ ok: false, status: res.status }, { status: 200 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Best effort — nunca propaga erro pro fluxo de cadastro do aluno.
    console.error("[sendMetaConversion] erro inesperado:", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
