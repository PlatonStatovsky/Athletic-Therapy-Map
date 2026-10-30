// Cloudflare Pages Function: POST /api/soniox-key
// Hands the clinic assistant a short-lived Soniox key for one transcription stream.
// The account key stays here (secret SONIOX_API_KEY). Callers must send the access code
// (secret APP_ACCESS_CODE) in the x-access-code header; without that secret the function refuses
// to work, so a deployment without it can never spend Soniox credit for strangers.
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export async function onRequestPost({ request, env }) {
  if (!env.APP_ACCESS_CODE || !env.SONIOX_API_KEY) return json({ error: 'השרת לא הוגדר: חסרים APP_ACCESS_CODE או SONIOX_API_KEY' }, 500);
  if (request.headers.get('x-access-code') !== env.APP_ACCESS_CODE) return json({ error: 'קוד גישה שגוי' }, 401);
  const r = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SONIOX_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ usage_type: 'transcribe_websocket', expires_in_seconds: 60, single_use: true })
  });
  let body = {};
  try { body = await r.json(); } catch { }
  if (!r.ok) return json({ error: body.error_message || body.message || `Soniox ${r.status}` }, 502);
  return json({ api_key: body.api_key, expires_at: body.expires_at });
}

export const onRequest = () => json({ error: 'method not allowed' }, 405);
