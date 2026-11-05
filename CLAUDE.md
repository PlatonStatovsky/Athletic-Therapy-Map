# Repository notes for Claude

Two parts, one static site, no build step:
- `index.html` (root) — the decision map ("שיקום שמרני מפת דרך"). Platon develops its content in other conversations.
- `app/` — the clinic assistant (Thalamus, עוזר קליני), a PWA: `index.html` (markup + CSS), `app.js` (all logic), `boot.js` (theme before first paint), `norms.js` (editable normal ROM ranges), `sw.js`. Do not edit it from map-content work.
- `functions/api/soniox-key.js` — Cloudflare Pages Function that mints short-lived Soniox keys for the assistant's cloud transcription. Needs the secret `SONIOX_API_KEY` (set for both Production and Preview); callers are checked by `_middleware.js`.
- `functions/api/claude/[[path]].js` — proxy for the assistant's Claude calls (`/api/claude/messages`, `/api/claude/messages/count_tokens`). Needs the secret `ANTHROPIC_API_KEY` (callers are checked by `_middleware.js`); optional KV binding `RATE_KV` adds a per-IP daily cap. GET on the same path reports whether the secrets are set.
- `functions/api/session.js` + `functions/api/_middleware.js` — Google sign-in for the assistant. `session.js` checks a Google ID token against `ALLOWED_EMAILS` (variable, comma-separated, kept out of the repo) and sets a 30-day HttpOnly cookie; the middleware lets non-GET `/api/*` calls through with that cookie or, as a fallback, `x-access-code` = `APP_ACCESS_CODE`. Without `ALLOWED_EMAILS` the app opens as before (access code only). Every allowed email must also be a test user of the Google Cloud project `thalamus-513815` while it is in Testing.
- Saved sessions: every save to Drive also writes `<name>.thalamus.json` (`{format:'thalamus-session', v:1, session}`, `appProperties.ca='session'`) in the patient folder; the patients screen lists and reopens them. Records lock 24 h after the first save (amendments logged before that, addenda only after) — enforced in the app (`recLocked`).
- `_headers` — CSP and security headers for `/app/*` (no inline scripts: keep all script in files) and no-store for `/api/*`.

Contracts between the two parts — keep them or update both sides together:
- `app/kb-site.js` reads these data literals from `index.html` by name: `T, GENERAL, REGIONS, FIVE_D, THREE_N, TEST_GEN, TX, TX2, TX3, FOUND`. Each must stay declared at line start as `const NAME = {` or `const NAME = [` and parse as JSON5. If you rename a literal or change the shape of a region (`anam, s1, s2, q, s3.patterns[].paths[], prog, rts, tx, phases, principles, surgery, re`) or a test card, update `app/kb-site.js` too.
- Deep links into the map: `#<tab>` opens a region, `#<tab>&t=<testId>` also opens that test's card (handled at the end of `index.html`). The app links to tests this way.
- Theme is shared through `localStorage['uqmap-theme']` (`light` | `comfort` | `dark`; absent = comfort, or dark when the device is dark).

Hosting: Cloudflare Pages project `ligamentum` — production https://ligamentum.pages.dev from `main`; every other branch gets a preview at https://<branch>.ligamentum.pages.dev. No build step, output directory = repo root.

Workflow:
- `main` is production. Work in a branch; merge or push to `main` only when Platon asks.
- Hebrew RTL throughout; keep the existing house style of each part.
