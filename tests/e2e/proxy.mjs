// Cloudflare Pages Function: POST /api/claude/messages and /api/claude/messages/count_tokens
// Forwards the clinic assistant's calls to the Anthropic API, so the API key never reaches a browser.
// The key is the secret ANTHROPIC_API_KEY. Callers must send the access code (secret APP_ACCESS_CODE,
// the same one the Soniox function uses) in the x-access-code header.
// Rate limit: a per-IP window kept in this isolate's memory (best effort, always on), plus a per-IP
// daily cap when a KV namespace is bound as RATE_KV (optional; see the setup notes).
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const PATHS = new Set(['messages', 'messages/count_tokens']);
const MODELS = new Set(['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1']);
const PER_MINUTE = 40, PER_DAY = 1500, MAX_TOKENS = 20000, MAX_BODY = 2_500_000;
const hits = new Map(); // ip -> timestamps within the last minute (per isolate)

function sameString(a, b) { // constant-time comparison of two strings
  const ea = new TextEncoder().encode(String(a)), eb = new TextEncoder().encode(String(b));
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}
function minuteLimited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 60_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return list.length > PER_MINUTE;
}
async function dayLimited(env, ip) {
  if (!env.RATE_KV) return false;
  const key = `claude:${new Date().toISOString().slice(0, 10)}:${ip}`;
  const n = (+(await env.RATE_KV.get(key)) || 0) + 1;
  await env.RATE_KV.put(key, String(n), { expirationTtl: 60 * 60 * 26 });
  return n > PER_DAY;
}

export async function onRequestPost({ request, env, params }) {
  if (!env.APP_ACCESS_CODE || !env.ANTHROPIC_API_KEY) return json({ error: 'השרת לא הוגדר: חסרים APP_ACCESS_CODE או ANTHROPIC_API_KEY' }, 503);
  if (!sameString(request.headers.get('x-access-code') || '', env.APP_ACCESS_CODE)) return json({ error: 'קוד גישה שגוי' }, 401);
  const path = [].concat(params.path || []).join('/');
  if (!PATHS.has(path)) return json({ error: 'נתיב לא מוכר' }, 404);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (minuteLimited(ip) || await dayLimited(env, ip)) return json({ error: 'יותר מדי בקשות. נסה שוב בעוד דקה.' }, 429);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'הבקשה גדולה מדי' }, 413);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'גוף הבקשה אינו JSON' }, 400); }
  if (!MODELS.has(body.model)) return json({ error: 'מודל לא מורשה: ' + body.model }, 400);
  if (path === 'messages' && !(body.max_tokens > 0 && body.max_tokens <= MAX_TOKENS)) return json({ error: 'max_tokens מחוץ לטווח' }, 400);

  const upstream = await fetch(`https://api.anthropic.com/v1/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  });
  // streamed answers (server-sent events) pass straight through
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.set('content-type', upstream.headers.get('content-type') || 'application/json');
  return new Response(upstream.body, { status: upstream.status, headers });
}

// a quick check that the secrets reached this deployment (says nothing about their values)
export const onRequestGet = ({ env }) => json({ ok: true, configured: Boolean(env.ANTHROPIC_API_KEY && env.APP_ACCESS_CODE), dailyCap: Boolean(env.RATE_KV) });
export const onRequest = () => json({ error: 'method not allowed' }, 405);
