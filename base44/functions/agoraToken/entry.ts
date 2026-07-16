import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { RtcTokenBuilder, RtcRole } from 'npm:agora-token@2.0.3';

// Build RTM token manually using the same AccessToken2 approach but for RTM
// agora-token@2.0.3 RtmTokenBuilder has a known issue where it uses wrong salt — use RtcTokenBuilder with uid=0 as RTM workaround
// Actually use the correct RtmTokenBuilder but log everything for debugging

import { RtmTokenBuilder } from 'npm:agora-token@2.0.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { channelName, uid, role } = await req.json();
    if (!channelName || uid === undefined) {
      return Response.json({ error: 'channelName and uid are required' }, { status: 400 });
    }

    // Verifica se o usuário é participante da aula (tutor ou aluno)
    const lesson = await base44.asServiceRole.entities.Lesson.get(channelName);
    if (!lesson || (lesson.tutor_id !== user.id && lesson.student_id !== user.id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appId = (Deno.env.get('VITE_AGORA_APP_ID') || '').trim();
    const appCertificate = (Deno.env.get('VITE_AGORA_APP_CERTIFICATE') || '').trim();

    if (!appId) return Response.json({ error: 'VITE_AGORA_APP_ID not set' }, { status: 500 });
    if (!appCertificate) return Response.json({ error: 'VITE_AGORA_APP_CERTIFICATE not set' }, { status: 500 });

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expirationSeconds = 86400; // 24h
    const privilegeExpiredTs = nowSeconds + expirationSeconds;

    console.log(`[agoraToken] serverTime=${new Date().toISOString()} nowSeconds=${nowSeconds} privilegeExpiredTs=${privilegeExpiredTs} diff=${expirationSeconds}s`);

    const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      Number(uid),
      agoraRole,
      expirationSeconds,
      privilegeExpiredTs
    );

    // RTM token — uid must be a string
    const rtmUserId = String(uid);
    const rtmToken = RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      rtmUserId,
      1, // Rtm_User role
      privilegeExpiredTs
    );

    console.log(`[agoraToken] uid=${uid} rtmUserId=${rtmUserId} rtmToken_prefix=${rtmToken?.substring(0, 20)} privilegeExpiredTs=${privilegeExpiredTs}`);

    return Response.json({ token, rtmToken, appId, channelName, uid: Number(uid), rtmUserId, privilegeExpiredTs, nowSeconds });
  } catch (error) {
    console.error('[agoraToken] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});