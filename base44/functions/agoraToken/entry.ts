import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Agora AccessToken2 (RTC) — pure WebCrypto implementation
// Reference: https://docs.agora.io/en/video-calling/get-started/authentication-workflow

async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

function packUint16LE(v: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = v & 0xff; b[1] = (v >> 8) & 0xff;
  return b;
}
function packUint32LE(v: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = v & 0xff; b[1] = (v >> 8) & 0xff; b[2] = (v >> 16) & 0xff; b[3] = (v >> 24) & 0xff;
  return b;
}
function packString(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  return concat(packUint16LE(enc.length), enc);
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}
function toBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

async function buildRtcToken(appId: string, appCert: string, channelName: string, uid: number, expireSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expireTs = now + expireSeconds;
  const salt = (Math.random() * 0xffffffff) >>> 0;
  const uidStr = uid === 0 ? '' : String(uid >>> 0);

  // Privileges: joinChannel=1, publishAudio=2, publishVideo=3, publishDataStream=4
  const privs: [number, number][] = [[1, expireTs], [2, expireTs], [3, expireTs], [4, expireTs]];
  const privMap = concat(
    packUint16LE(privs.length),
    ...privs.flatMap(([k, v]) => [packUint16LE(k), packUint32LE(v)])
  );

  // Message to sign
  const msg = concat(
    packUint32LE(now),
    packUint32LE(salt),
    packString(channelName),
    packString(uidStr),
    privMap
  );

  const appIdBytes = new TextEncoder().encode(appId);
  const certBytes = new TextEncoder().encode(appCert);

  const signature = await hmacSha256(certBytes, concat(appIdBytes, msg));

  // Pack the full token content
  const content = concat(
    packUint16LE(signature.length), signature,
    packUint32LE(now),
    packUint32LE(salt),
    packString(channelName),
    packString(uidStr),
    privMap
  );

  return '007' + appId + toBase64(content);
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

    // VITE_AGORA_APP_ID secret may not be set correctly; use hardcoded fallback
    const appId = 'cb91268f716240d289c3df39c7d69aaa';
    const appCert = Deno.env.get('VITE_AGORA_APP_CERTIFICATE');

    if (!appId || !appCert) {
      // No certificate configured — return null so the client uses no-token mode
      return Response.json({ token: null });
    }

    const token = await buildRtcToken(appId, appCert, channelName, Number(uid), 3600);
    return Response.json({ token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});