import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Agora AccessToken2 — official implementation based on:
// https://github.com/AgoraIO/Tools/blob/master/DynamicKey/AgoraDynamicKey/nodejs/src/AccessToken2.js

const VERSION = "007";
const SERVICE_TYPE_RTC = 1;

const PRIVILEGE_JOIN_CHANNEL = 1;
const PRIVILEGE_PUBLISH_AUDIO = 2;
const PRIVILEGE_PUBLISH_VIDEO = 3;
const PRIVILEGE_PUBLISH_DATA = 4;

function packUint16(v: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = v & 0xff;
  b[1] = (v >> 8) & 0xff;
  return b;
}

function packUint32(v: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = v & 0xff;
  b[1] = (v >> 8) & 0xff;
  b[2] = (v >> 16) & 0xff;
  b[3] = (v >> 24) & 0xff;
  return b;
}

function packString(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  return concat(packUint16(enc.length), enc);
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

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

async function buildToken(appId: string, appCert: string, channelName: string, uid: number, expireSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expire = now + expireSeconds;
  const salt = Math.floor(Math.random() * 0xffffffff) + 1;
  const uidStr = uid === 0 ? '' : String(uid >>> 0);

  // Pack privileges
  const privileges = [
    [PRIVILEGE_JOIN_CHANNEL, expire],
    [PRIVILEGE_PUBLISH_AUDIO, expire],
    [PRIVILEGE_PUBLISH_VIDEO, expire],
    [PRIVILEGE_PUBLISH_DATA, expire],
  ];

  const privPacked = concat(
    packUint16(privileges.length),
    ...privileges.flatMap(([k, v]) => [packUint16(k), packUint32(v)])
  );

  // Service body for RTC
  const serviceBody = concat(
    packUint16(1),             // num services
    packUint16(SERVICE_TYPE_RTC),
    packString(channelName),
    packString(uidStr),
    privPacked
  );

  // Build message to sign: appId bytes + timestamps + salt + serviceBody
  const appIdBytes = new TextEncoder().encode(appId);
  const certBytes = new TextEncoder().encode(appCert);

  const message = concat(
    appIdBytes,
    packUint32(now),
    packUint32(expire),
    packUint32(salt),
    serviceBody
  );

  const signature = await hmacSha256(certBytes, message);

  // Final token content
  const content = concat(
    packUint32(now),
    packUint32(expire),
    packUint32(salt),
    packUint16(signature.length),
    signature,
    serviceBody
  );

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

    const appId = (Deno.env.get('VITE_AGORA_APP_ID') || '').trim();
    const appCert = (Deno.env.get('VITE_AGORA_APP_CERTIFICATE') || '').trim();

    console.log(`[agoraToken] appId length=${appId.length}, cert length=${appCert.length}`);

    if (!appId) return Response.json({ error: 'VITE_AGORA_APP_ID not set' }, { status: 500 });
    if (!appCert) return Response.json({ error: 'VITE_AGORA_APP_CERTIFICATE not set' }, { status: 500 });

    const token = await buildToken(appId, appCert, channelName, Number(uid), 3600);

    console.log(`[agoraToken] appId=${appId} channel=${channelName} uid=${uid} tokenPrefix=${token.substring(0, 25)}`);

    return Response.json({ appId, token });
  } catch (error) {
    console.error('[agoraToken] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});