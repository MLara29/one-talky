import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appId = (Deno.env.get('VITE_AGORA_APP_ID') || '').trim();
    if (!appId) return Response.json({ error: 'VITE_AGORA_APP_ID not set' }, { status: 500 });

    console.log(`[agoraToken] returning appId=${appId} (testing mode, no token)`);
    return Response.json({ appId, token: null });
  } catch (error) {
    console.error('[agoraToken] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});