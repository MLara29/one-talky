import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const publicKey = Deno.env.get("MERCADOPAGO_PUBLIC_KEY");
    return Response.json({ public_key: publicKey || "" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});