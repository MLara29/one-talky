import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
// Official Agora token library
import { RtcTokenBuilder, RtcRole } from 'npm:agora-token@2.0.3';

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

    const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const tokenExpirationInSeconds = 3600;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + tokenExpirationInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      Number(uid),
      agoraRole,
      tokenExpirationInSeconds,
      privilegeExpiredTs
    );

    console.log(`[agoraToken] appId=${appId} channel=${channelName} uid=${uid} role=${role || 'publisher'} token=${token.substring(0, 20)}...`);

    return Response.json({ token, appId, channelName, uid: Number(uid) });
  } catch (error) {
    console.error('[agoraToken] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});