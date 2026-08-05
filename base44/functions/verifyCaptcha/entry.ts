import { secrets } from "base44:runtime";

export default async function(req: Request): Promise<Response> {
  try {
    const { token } = await req.json();
    if (!token) {
      return Response.json({ success: false, error: "Missing token" }, { status: 400 });
    }

    const secret = secrets.get("TURNSTILE_SECRET_KEY");
    if (!secret) {
      return Response.json(
        { success: false, error: "TURNSTILE_SECRET_KEY not configured" },
        { status: 500 }
      );
    }

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await verifyRes.json();

    if (!data.success) {
      return Response.json({ success: false, error: "Captcha verification failed" }, { status: 400 });
    }
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ success: false, error: "Verification error" }, { status: 500 });
  }
}