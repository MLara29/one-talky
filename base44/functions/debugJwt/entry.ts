import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  let payload = null;
  try {
    const payloadB64 = token.split('.')[1];
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    payload = JSON.parse(atob(padded));
  } catch (e) {
    payload = { error: String(e) };
  }
  return Response.json({ userId: user?.id, tokenPrefix: token.slice(0, 12), tokenLength: token.length, payload });
});