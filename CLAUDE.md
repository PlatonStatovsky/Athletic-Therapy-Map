# Repository notes for Claude

Two parts, one static site, no build step:
- `index.html` (root) — the decision map ("שיקום שמרני מפת דרך"). Platon develops its content in other conversations.
- `app/` — the clinic assistant (עוזר קליני), a self-contained PWA. Do not edit it from map-content work.
- `functions/api/soniox-key.js` — Cloudflare Pages Function that mints short-lived Soniox keys for the assistant's cloud transcription. Needs the secrets `SONIOX_API_KEY` and `APP_ACCESS_CODE` (set for both Production and Preview).

Contracts between the two parts — keep them or update both sides together:
- `app/kb-site.js` reads these data literals from `index.html` by name: `T, GENERAL, REGIONS, FIVE_D, THREE_N, TEST_GEN, TX, TX2, TX3, FOUND`. Each must stay declared at line start as `const NAME = {` or `const NAME = [` and parse as JSON5. If you rename a literal or change the shape of a region (`anam, s1, s2, q, s3.patterns[].paths[], prog, rts, tx, phases, principles, surgery, re`) or a test card, update `app/kb-site.js` too.
- Deep links into the map: `#<tab>` opens a region, `#<tab>&t=<testId>` also opens that test's card (handled at the end of `index.html`). The app links to tests this way.
- Theme is shared through `localStorage['uqmap-theme']` (`light` | `comfort` | `dark`; absent = comfort, or dark when the device is dark).

Hosting: Cloudflare Pages project `ligamentum` — production https://ligamentum.pages.dev from `main`; every other branch gets a preview at https://<branch>.ligamentum.pages.dev. No build step, output directory = repo root.

Workflow:
- `main` is production. Work in a branch; merge or push to `main` only when Platon asks.
- Hebrew RTL throughout; keep the existing house style of each part.
