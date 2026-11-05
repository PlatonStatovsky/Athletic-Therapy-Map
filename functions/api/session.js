// Cloudflare Pages Function: /api/session — Google sign-in for the clinic assistant.
//   POST {credential}  a Google ID token from "Sign in with Google": checked against Google's keys, this app's
//                      client ID and the ALLOWED_EMAILS list, then answered with a 30-day session cookie.
//   GET                {configured, email} of the signed-in account (401 when not signed in).
//   DELETE             signs out (clears the cookie).
// Settings in Cloudflare (Settings → Variables and Secrets):
//   ALLOWED_EMAILS     required: the Google accounts allowed in, separated by commas. Kept out of the public repo.
//   GOOGLE_CLIENT_ID   optional: overrides the client ID below.
//   SESSION_SECRET     optional: signs the cookie; without it a key is derived from ANTHROPIC_API_KEY.
// The other /api functions accept this cookie through _middleware.js.
export const DEFAULT_CLIENT_ID = '1009141837069-m296bl86eh7jvej9fprpfdhhaihrot1m.apps.googleusercontent.com';
const COOKIE = 'th_session', DAYS = 30;
const te = new TextEncoder(), td = new TextDecoder();

export const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});
const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));

export function sameString(a, b) { // constant-time comparison
  const ea = te.encode(String(a)), eb = te.encode(String(b));
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}
export const allowed = env => String(env.ALLOWED_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
const configured = env => allowed(env).length > 0 && Boolean(env.SESSION_SECRET || env.ANTHROPIC_API_KEY);

async function sessionKey(env) {
  const base = await crypto.subtle.importKey('raw', te.encode(env.SESSION_SECRET || env.ANTHROPIC_API_KEY), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode('thalamus-session-v1') },
    base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign', 'verify']);
}
async function makeSession(env, email) {
  const body = b64u(te.encode(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + DAYS * 86400 })));
  const sig = await crypto.subtle.sign('HMAC', await sessionKey(env), te.encode(body));
  return body + '.' + b64u(sig);
}
// the signed-in email from the cookie, or '' (expired, tampered, or no longer on the list)
export async function readSession(request, env) {
  if (!configured(env)) return '';
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return '';
  const [body, sig] = m[1].split('.');
  try {
    const ok = await crypto.subtle.verify('HMAC', await sessionKey(env), unb64u(sig), te.encode(body));
    if (!ok) return '';
    const { e, x } = JSON.parse(td.decode(unb64u(body)));
    return x * 1000 > Date.now() && allowed(env).includes(e) ? e : '';
  } catch { return ''; }
}
const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

let JWKS = null, jwksAt = 0;
async function googleKey(kid, fresh = false) {
  if (fresh || !JWKS || Date.now() - jwksAt > 3600_000) {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!r.ok) throw new Error('Google keys ' + r.status);
    JWKS = (await r.json()).keys || []; jwksAt = Date.now();
  }
  return JWKS.find(k => k.kid === kid);
}
// checks a Google ID token and returns its verified email
async function verifyIdToken(token, aud) {
  const [h, p, s] = String(token || '').split('.');
  if (!s) throw new Error('token');
  const head = JSON.parse(td.decode(unb64u(h))), claims = JSON.parse(td.decode(unb64u(p)));
  if (head.alg !== 'RS256') throw new Error('alg');
  const jwk = await googleKey(head.kid) || await googleKey(head.kid, true);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(s), te.encode(h + '.' + p))) throw new Error('signature');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw new Error('iss');
  if (claims.aud !== aud) throw new Error('aud');
  if (!(claims.exp * 1000 > Date.now())) throw new Error('expired');
  if (claims.email_verified !== true && claims.email_verified !== 'true') throw new Error('email not verified');
  return String(claims.email || '').toLowerCase();
}

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json({ error: 'השרת לא הוגדר: חסר ALLOWED_EMAILS' }, 503);
  let body = {};
  try { body = await request.json(); } catch { }
  let email;
  try { email = await verifyIdToken(body.credential, env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID); }
  catch { return json({ error: 'הכניסה עם Google לא אומתה. נסה שוב.' }, 400); }
  if (!allowed(env).includes(email)) return json({ error: `החשבון ${email} לא ברשימת המורשים`, email }, 403);
  return json({ configured: true, email }, 200, { 'set-cookie': cookie(await makeSession(env, email), DAYS * 86400) });
}
export async function onRequestGet({ request, env }) {
  if (!configured(env)) return json({ configured: false });
  const email = await readSession(request, env);
  return email ? json({ configured: true, email }) : json({ configured: true }, 401);
}
export const onRequestDelete = () => json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
export const onRequest = () => json({ error: 'method not allowed' }, 405);
