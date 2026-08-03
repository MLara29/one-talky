import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function parseBrowser(ua) {
  if (!ua) return "";
  let browser = "Desconhecido";
  const m = ua.match(/(Edg|OPR|Chrome|Firefox|Safari)\/(\d+)/);
  if (m) {
    const names = { Edg: "Edge", OPR: "Opera", Chrome: "Chrome", Firefox: "Firefox", Safari: "Safari" };
    browser = `${names[m[1]] || m[1]} ${m[2]}`;
  }
  let os = "";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  return os ? `${browser} no ${os}` : browser;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    let user = null;
    try { user = await base44.auth.me(); } catch { /* usuário pode não estar totalmente autenticado */ }

    const userAgent = req.headers.get("user-agent") || "";

    await base44.asServiceRole.entities.ClientErrorLog.create({
      message: String(body.message || "Unknown error").slice(0, 2000),
      stack: String(body.stack || "").slice(0, 8000),
      page_path: String(body.page_path || "").slice(0, 500),
      user_id: user?.id || "",
      user_role: user?.role || "anonymous",
      user_agent: userAgent.slice(0, 500),
      browser_info: parseBrowser(userAgent),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}