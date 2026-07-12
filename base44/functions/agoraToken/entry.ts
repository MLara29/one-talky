import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Agora RTC Token v2 generation (pure Deno/WebCrypto)
const VERSION = '007';
const PRIVILEGES = { joinChannel: 1, publishAudioStream: 2, publishVideoStream: 3, publishDataStream: 4 };

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(sig);
}

function packUint16(v: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v, true);
  return b;
}
function packUint32(v: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v, true);
  return b;
}
function packString(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  return new Uint8Array([...packUint16(enc.length), ...enc]);
}
function packMap(m: Record<number, number>): Uint8Array {
  const entries = Object.entries(m).sort(([a], [b]) => Number(a) - Number(b));
  const parts: Uint8Array[] = [packUint16(entries.length)];
  for (const [k, v] of entries) {
    parts.push(packUint16(Number(k)), packUint32(v));
  }
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function buildAgoraToken(appId: string, appCertificate: string, channelName: string, uid: number, expireTs: number): Promise<string> {
  const uidStr = uid === 0 ? '' : String(uid);
  const ts = Math.floor(Date.now() / 1000);
  const salt = Math.floor(Math.random() * 0xFFFFFFFF);

  const privileges: Record<number, number> = {
    [PRIVILEGES.joinChannel]: expireTs,
    [PRIVILEGES.publishAudioStream]: expireTs,
    [PRIVILEGES.publishVideoStream]: expireTs,
    [PRIVILEGES.publishDataStream]: expireTs,
  };

  const msg = new Uint8Array([
    ...packUint32(ts),
    ...packUint32(salt),
    ...packString(channelName),
    ...packString(uidStr),
    ...packMap(privileges),
  ]);

  const certBytes = new TextEncoder().encode(appCertificate);
  const appIdBytes = new TextEncoder().encode(appId);

  const toSign = new Uint8Array([...appIdBytes, ...msg]);
  const sig = await hmacSha256(certBytes, toSign);

  const content = new Uint8Array([
    ...packUint16(sig.length), ...sig,
    ...packUint32(ts),
    ...packUint32(salt),
    ...packString(channelName),
    ...packString(uidStr),
    ...packMap(privileges),
  ]);

  return VERSION + appId + toBase64(content);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { channelName, uid } = await req.json();
    if (!channelName || uid === undefined) {
      return Response.json({ error: 'channelName and uid are required' }, { status: 400 });
    }

    const appId = Deno.env.get('VITE_AGORA_APP_ID');
    const appCertificate = Deno.env.get('VITE_AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      return Response.json({ error: 'Agora credentials not configured' }, { status: 500 });
    }

    const expireTs = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const token = await buildAgoraToken(appId, appCertificate, channelName, uid, expireTs);

    return Response.json({ token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});