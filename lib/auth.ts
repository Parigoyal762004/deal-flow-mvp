// Team auth - HMAC-signed session cookie.
// Works in both the Edge runtime (middleware.ts) and Node (API routes) because
// it uses only Web Crypto (globalThis.crypto.subtle) + btoa/atob.
//
// Credentials are verified in lib/users.ts (salted SHA-256 hashes, no plaintext).
// The session payload carries the logged-in username; AUTH_SECRET signs the
// token so a cookie can't be forged.

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  // Fail closed: in production we refuse to sign/verify with a known fallback,
  // otherwise anyone reading this source could forge a valid session cookie.
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is missing or too short — refusing to operate.");
    }
    return "dev-insecure-secret-change-me";
  }
  return secret;
}

async function hmac(data: string): Promise<Uint8Array> {
  const secret = sessionSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

// Session token: base64url(payload).base64url(hmac(payload))
// Payload carries the logged-in username (`u`) so every page/route knows who is
// acting. Older tokens used `e` (email); we read either for backward-compat.
export async function createSessionToken(username: string, days = 30): Promise<string> {
  const exp = Date.now() + days * 86400000;
  const payload = b64url(enc.encode(JSON.stringify({ u: username, exp })));
  const sig = b64url(await hmac(payload));
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return (await getSessionUser(token)) !== null;
}

// Verify signature + expiry and return the username, or null if invalid/expired.
export async function getSessionUser(token: string | undefined): Promise<string | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (!timingSafeEqual(b64urlToBytes(sig), expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    if (typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    const u = (data.u ?? data.e ?? "") as string;
    return u ? String(u).toLowerCase() : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "session";
