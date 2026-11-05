// Runs before every /api function. Calls that spend money (Claude, Soniox) need either the Google sign-in
// cookie (see session.js) or, as a fallback, the access code (secret APP_ACCESS_CODE) in x-access-code.
// GET requests only report configuration and pass through, and /api/session handles sign-in itself.
import { readSession, sameString, json } from './session.js';

export async function onRequest({ request, env, next, data }) {
  const path = new URL(request.url).pathname;
  if (path === '/api/session' || request.method === 'GET') return next();
  const email = await readSession(request, env);
  if (email) { data.email = email; return next(); }
  const code = request.headers.get('x-access-code');
  if (code && env.APP_ACCESS_CODE && sameString(code, env.APP_ACCESS_CODE)) { data.email = ''; return next(); }
  return json({ error: code ? 'קוד גישה שגוי' : 'צריך להיכנס עם Google' }, 401);
}
