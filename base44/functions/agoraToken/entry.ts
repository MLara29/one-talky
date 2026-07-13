import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Agora AccessToken2 — faithful port of the official Node.js implementation
// Source: https://github.com/AgoraIO/Tools/blob/master/DynamicKey/AgoraDynamicKey/nodejs/src/AccessToken2.js

const VERSION = "007";
const kRtcServiceType = 1;
const kPrivilegeJoinChannel = 1;
const kPrivilegePublishAudioStream = 2;
const kPrivilegePublishVideoStream = 3;
const kPrivilegePublishDataStream = 4;

// ── ByteBuf (little-endian writer) ──────────────────────────────────────────
function createByteBuf() {
  let buf = new Uint8Array(1024);
  let pos = 0;

  function ensureCapacity(needed: number) {
    if (pos + needed > buf.length) {
      const next = new Uint8Array(buf.length * 2 + needed);
      next.set(buf);
      buf = next;
    }
  }

  const self = {
    putUint16(v: number) {
      ensureCapacity(2);
      buf[pos++] = v & 0xff;
      buf[pos++] = (v >> 8) & 0xff;
      return self;
    },
    putUint32(v: number) {
      ensureCapacity(4);
      const u = v >>> 0;
      buf[pos++] = u & 0xff;
      buf[pos++] = (u >> 8) & 0xff;
      buf[pos++] = (u >> 16) & 0xff;
      buf[pos++] = (u >> 24) & 0xff;
      return self;
    },
    putBytes(bytes: Uint8Array) {
      self.putUint16(bytes.length);
      ensureCapacity(bytes.length);
      buf.set(bytes, pos);
      pos += bytes.length;
      return self;
    },
    putString(s: string) {
      return self.putBytes(new TextEncoder().encode(s));
    },
    putTreeMapUInt32(map: Record<number, number>) {
      const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
      self.putUint16(keys.length);
      for (const k of keys) {
        self.putUint16(k);
        self.putUint32(map[k]);
      }
      return self;
    },
    pack(): Uint8Array {
      return buf.slice(0, pos);
    },
  };
  return self;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

// zlib deflate using DecompressionStream workaround — use raw deflate via CompressionStream
async function zlibDeflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return concat(...chunks);
}

async function buildToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  tokenExpire: number,
  privilegeExpire: number
): Promise<string> {
  const issueTs = Math.floor(Date.now() / 1000);
  const salt = Math.floor(Math.random() * 99999999) + 1;
  const uidStr = uid === 0 ? '' : String(uid >>> 0);

  const certBytes = new TextEncoder().encode(appCertificate);

  // Two-step signing: HMAC(cert, issueTs) then HMAC(result, salt)
  const step1 = await hmacSha256(certBytes, createByteBuf().putUint32(issueTs).pack());
  const signing = await hmacSha256(step1, createByteBuf().putUint32(salt).pack());

  // Build privileges map
  const privileges: Record<number, number> = {
    [kPrivilegeJoinChannel]: privilegeExpire,
    [kPrivilegePublishAudioStream]: privilegeExpire,
    [kPrivilegePublishVideoStream]: privilegeExpire,
    [kPrivilegePublishDataStream]: privilegeExpire,
  };

  // Service pack: type(uint16) + privileges(treeMap) + channelName(string) + uid(string)
  const servicePack = concat(
    createByteBuf().putUint16(kRtcServiceType).pack(),
    createByteBuf().putTreeMapUInt32(privileges).pack(),
    createByteBuf().putString(channelName).putString(uidStr).pack()
  );

  // signing_info: appId(string) + issueTs + expire + salt + numServices(uint16) + servicePack
  const signingInfo = concat(
    createByteBuf()
      .putString(appId)
      .putUint32(issueTs)
      .putUint32(tokenExpire)
      .putUint32(salt)
      .putUint16(1) // 1 service
      .pack(),
    servicePack
  );

  // Final signature over signingInfo
  const signature = await hmacSha256(signing, signingInfo);

  // content = putString(signature) + signingInfo
  const content = concat(
    createByteBuf().putBytes(signature).pack(),
    signingInfo
  );

  // Compress with zlib deflate
  const compressed = await zlibDeflate(content);

  // Encode to base64
  let binary = '';
  for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
  return VERSION + btoa(binary);
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

    if (!appId) return Response.json({ error: 'VITE_AGORA_APP_ID not set' }, { status: 500 });

    // If no certificate configured, return appId only (testing mode)
    if (!appCert) {
      console.log(`[agoraToken] no cert — testing mode, appId=${appId}`);
      return Response.json({ appId, token: null });
    }

    const expire = 3600;
    const token = await buildToken(appId, appCert, channelName, Number(uid), expire, expire);
    console.log(`[agoraToken] appId=${appId} channel=${channelName} uid=${uid} token=${token.substring(0, 25)}...`);

    return Response.json({ appId, token });
  } catch (error) {
    console.error('[agoraToken] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});