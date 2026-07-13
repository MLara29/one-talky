import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Agora AccessToken2 (RTC) — per official spec
// https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

function packUint16LE(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
}
function packUint32LE(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
}
function packString(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  return concat(packUint16LE(enc.length), enc);
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}
function toBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

// AccessToken2 format
async function buildAccessToken2(appId: string, appCert: string, channelName: string, uid: number, expireSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expire = now + expireSeconds;
  const issueTs = now;
  const salt = (Math.random() * 0xffffffff) >>> 0;

  // Service RTC (service type = 1)
  const uidStr = uid === 0 ? '' : String(uid >>> 0);

  // Privileges for RTC service: joinChannel=1, publishAudio=2, publishVideo=3, publishDataStream=4
  const privileges: [number, number][] = [[1, expire], [2, expire], [3, expire], [4, expire]];
  const privBytes = concat(
    packUint16LE(privileges.length),
    ...privileges.flatMap(([k, v]) => [packUint16LE(k), packUint32LE(v)])
  );

  // Service body: type(1) + num_services(1) + service_type(2) + channel(string) + uid(string) + privs
  const serviceBody = concat(
    packUint16LE(1),        // num services
    packUint16LE(1),        // service type: RTC = 1
    packString(channelName),
    packString(uidStr),
    privBytes
  );

  // Header to sign: appId + issueTs + expire + salt + serviceBody
  const appIdBytes = new TextEncoder().encode(appId);
  const certBytes = new TextEncoder().encode(appCert);

  const signing = await hmacSha256(certBytes, concat(
    appIdBytes,
    packUint32LE(issueTs),
    packUint32LE(expire),
    packUint32LE(salt),
    serviceBody
  ));

  // Token content: version(3) + appId(32) + issueTs(4) + expire(4) + salt(4) + sig_len(2) + sig + serviceBody
  const tokenContent = concat(
    packUint32LE(issueTs),
    packUint32LE(expire),
    packUint32LE(salt),
    packUint16LE(signing.length),
    signing,
    serviceBody
  );

  return '007' + appId + toBase64(tokenContent);
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

    const appId = Deno.env.get('VITE_AGORA_APP_ID') || '';
    const appCert = Deno.env.get('VITE_AGORA_APP_CERTIFICATE');

    if (!appId) {
      return Response.json({ error: 'VITE_AGORA_APP_ID not configured' }, { status: 500 });
    }

    if (!appCert) {
      return Response.json({ appId, token: null });
    }

    const token = await buildAccessToken2(appId, appCert, channelName, Number(uid), 3600);
    return Response.json({ appId, token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});