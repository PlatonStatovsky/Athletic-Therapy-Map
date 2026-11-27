# Handoff for the next Claude chat (state on 27.11.2026)

Platon moved the work on Ligamentum / Thalamus to a new chat because the old one got too long. This file is what that chat knew and the repo did not. Read it together with `CLAUDE.md` (repo rules and contracts) and the top of `CHANGELOG.md` (what changed, newest first). Then ask Platon what to do next; do not start on the open items below on your own.

## Who you work with

- **Platon** — sports-therapy graduate (Levinsky-Wingate), not a programmer. He owns the clinical content, the legal side and every product decision; Claude writes the code. He writes Hebrew or Russian: answer in the language of his message. He wants direct, substantive answers, honest reassessment when he corrects you, and a short numbered list at the end of a round: what was done, what is left, what needs his clarification.
- **Leon** — his partner on Thalamus. They share the Google Doc "SRS - Thalamus 0.1" (the spec). Leon writes bugs and requests in its tab "באגים\תיקונים\הבהרות".
- Before a round of changes Platon often asks you to say back how you understood him, numbered, and waits for "כן". Do that whenever a request has several parts or anything is unclear.

## Where everything is

| What | Where |
|---|---|
| Code | GitHub `PlatonStatovsky/Athletic-Therapy-Map` (in a session: add the repo, then clone it) |
| Production | branch `main` → https://ligamentum.pages.dev (Cloudflare Pages project `ligamentum`) |
| Preview | branch `app` → https://app.ligamentum.pages.dev (home), `/map/`, `/app/` |
| Google sign-in for the app works only on | `app.ligamentum.pages.dev` and production (authorized origins of Google Cloud project `thalamus-513815`) |
| Secrets (Cloudflare, Production + Preview) | `ANTHROPIC_API_KEY`, `SONIOX_API_KEY`, `ALLOWED_EMAILS`, `APP_ACCESS_CODE`. Platon sets them himself. Never ask him to paste a key into the chat, never put one in the browser or the repo |
| Spec / log doc | Google Doc "SRS - Thalamus 0.1", id `1Hw096WIK_PkTVawSZUUqwa1o0RtyNQxBlsDd7iHP9dA`. Tabs: "יומן שינויים — Claude" (`t.m9rqpmjq4k21`, your change log), "רשימת הפתולוגיות" (`t.9fb7tj2vp4h9`, the 97 map pathologies), "תצוגה וצבעים" (`t.d51sz8mgicia`, every app colour, where it is used), "באגים\תיקונים\הבהרות" (Leon's requests), plus the spec tabs |
| Drive folder for log drafts and screenshots | "Thalamus יומן — צילומי מסך", id `1arE6gltZtR7p9xhiazTJGAGJMBE8PE_e`. It also holds the helper "טיוטה להעתקה" docs used to paste into the SRS doc; Platon may delete them, never delete Drive files without asking |
| Browser checks | `tests/e2e/` (see its README). Run `spec_regress.py` before and after any change to `app/` |

`app` is 44 commits ahead of `main` and `main` has nothing that `app` lacks, so a merge is a fast-forward. **Merge or push to `main` only when Platon asks.**

## Standing rules from Platon (keep all of them)

1. Keys never in the browser, never pasted into chat, never committed. You do not type secrets for him and do not sign into his accounts.
2. Never commit `.impeccable/`.
3. Do not break stored data: any change to what is kept in localStorage or in saved sessions needs a migration (see `fixRegion`, `fixTags`, `kbVer`).
4. Do not change behaviour that works: consent before recording, the confirmation before replacing an open session, masked keys, the body map, the patient-name / transcript match check (do not touch it).
5. The Drive copy of a session is not encrypted — his decision.
6. Stop and ask on clinical, legal or cost decisions.
7. Every change is logged twice: a row in `CHANGELOG.md` and an entry in the SRS log tab, spec style, no tables, before/after image for anything visual (rule and method in `CLAUDE.md`). Decisions without code changes get a row too ("לא שונה קוד").
8. Hypotheses board direction: "iron rules and determinism" — what the app decides is fixed in code; the AI only judges the hypotheses and their support / against.
9. Map content (`src/`) is developed in other chats; do not edit it from app work. Never edit `map/index.html` by hand.

## Pasting into the SRS doc (what worked, what broke)

- Build the entry as HTML with base64 images, upload it with the Drive connector as a Google Doc into the folder above, open it in Chrome, click **on the title** (not inside a table: Ctrl+A inside a table cell copies only that cell), Ctrl+A, Ctrl+C.
- In the log tab: click the last line of the tab's intro paragraph, End, Enter, then paste on that empty line. Pasting at the start of a heading misplaced content once.
- A new tab: "+" next to "Document tabs", paste, then double-click the tab name to rename it.
- Check the result (Find a phrase from the end of the entry, look at the seam with the previous entry). If a paste goes wrong, Ctrl+Z at once.

## What was done most recently (details in CHANGELOG.md)

24–26.11, all on `app`: three data-loss bugs; lower-body regions in the assistant; session without recording consent; "אמת" on the body map and the injury course before saving; unified home page with the map moved to `/map/`; hypotheses board rules (threshold, 1–5, red flags, stable order with marks, therapist rules out / adds from the map, support / against uncapped); SRS tabs for the 97 pathologies and for display and colours.

## Open items (ask before starting any of them)

1. Merge `app` into `main` — waiting for Platon.
2. Red-flag detection is the one non-deterministic part of the hypotheses board (the AI decides whether the free-text field reports a flag). Offered: turn the red-flags field into a checklist (yes / no per flag) so the code decides. Not decided.
3. Closed 27.11: support / against are 0–5 per side, as the SRS says; the board stays hidden before the threshold (confirmed); the threshold hint now names every counted field.
4. "תצוגה וצבעים" covers the app and the home page only; the map has its own palette (offered to add).
5. The home page is functional only; its texts and design are for a later round.
6. Closed 27.11: a session without recording has no transcript at all (no open button, no side panel, no overlay: `trAllowed()` in `app/app.js`); text goes only into the free-text field. Older no-recording sessions keep any typed lines in the data and in Drive as "טקסט מוקלד", not shown on screen. The interim label change (40a43ce) was dropped and is marked "לא רלוונטי" in the SRS log.
7. Remote branch `merge-main` is an old review branch; deleting it failed twice (network). Platon can delete it on GitHub.
8. Next stage Platon named: accessibility statement, terms of use and privacy that every user accepts; later, username / password login for beta testers and a paid subscription.

## Code map of the assistant (`app/app.js`, about 3,900 lines)

- Session lifecycle: `startSession` (no-consent popup, `noRec(s)`), `openFinish`, `finishBlock` (gate on "סיום"), `recLocked` (24 h lock), `saveFiles` / `sessionDocHtml` (Drive).
- Recording / transcript: `startRec`, `islandHtml`, `addSegment`, `quoteSpan` + `playSeg` (quote-only playback).
- AI calls: `runInsight` builds the request and the JSON schema per part; `applyInsight` applies the answer; `mergeHypo` holds the board's rules; `hypoReady` is the threshold; `activeFlags` the red flags; `vizMissing` / `vizOk` the finish-screen confirmations.
- Map knowledge: `app/kb-site.js` parses the map's data literals; `mapCatalog(region)` gives the region's pathways, test ids and pattern groups.
- Regions and old names: `REGIONS`, `REGION_ALIAS`, `fixRegion`, `fixTags`.
- Patient details (27.11): fields with `intake: 1` in `FORM` (age, sex, address, occupation, marital). `sectionsFor` / `fieldsFor` = the form without them (form, fill, "still not said"); `allSectionsFor` / `allFieldsFor` = with them (Drive doc, record, AI context). Start screen `intakeInputs('p')`, popup on the patient name `intakePopHtml` / `saveIntakePop`, prefill `prefillIntake` (from `patients[].intake`), follow-up fallback in `attachPrev`.
- Claude is fixed (27.11): `CLAUDE_MODEL` = Sonnet 5.5 for every call; effort `CLAUDE_EFFORT_LIVE` = medium for fill and insight (live updates), `CLAUDE_EFFORT` = high for the analysis; no model choice in the settings; the proxy (`functions/api/claude/[[path]].js`) allows only that model. Changing it is Platon's cost decision.
- Ligamentum redesign (27.11), one phase per round, branch `redesign` (off `app`, merged into `app` after each phase; the old `new` branch is to be deleted on GitHub): phase 0 base — `shared/tokens.css` holds the Thalamus tokens (3 themes, ThalamusSans, radii, shadows, glass, motion) for app, map and home; the map and home page keep their own variable names as aliases (`--surface`, `--ink`, `--accent`…). Phase 1 frame (done 27.11): glass capsule header, the region rail as a floating glass panel (`#side`), the tests panel a solid rounded card; ≤1180 it slides in from the side (`.panel.shown`, transform, not display); ≤900 a glass bottom bar `#mbar` (`data-mbar` = regions | tests | disp, plus a Thalamus link) opens `#side` (`.shown`), the tests panel and `#disp` as bottom sheets — handlers `toggleSide`, `closeDisp` in template.html; all the frame CSS is one block at the end of the template style. Phase 2 content components (done 27.11): a second block after it ("redesign phase 2") restyles cards, decisions, checks, chips, tables, patterns/paths and the panel test card — CSS only, no markup or data change; every accordion uses one CSS chevron (`summary::after`); check/questionnaire summaries are `display:block` so mixed text and abbreviations wrap as one line; on phones the step number sits on the card corner (`.st` block, `.num` absolute). Next phase 3 motion and polish. Glass on the navigation layer only; clinical content on solid cards. Log: a separate SRS tab for Ligamentum, not the Thalamus log.
- Recording limit (27.11): `REC_MAX_STARTS` = 10 recordings and `REC_MAX_MS` = 2 h per session, whichever first; counters `session.recStarts` (fallback: `audioParts`) and `session.recordedMs`; `tickTimer` stops at 2 h and turns the clock orange in the last 5 min (`REC_WARN_MS`); the button greys out with title / aria only (no message, Platon's rule). Server-side abuse protection (Soniox key limit, KV-based counting, spend caps) is proposed and waiting for Platon.
- Layout (27.11): card rows are `div.grid` as flex (equal height, even widths, lone card fills the row); `flipCapture` / `flipPlay` animate card moves in `refreshLive`; the player is placed by `placePlayer` (beside the folded note button on a phone, above the note bar elsewhere). Watch class collisions: `.main` is the page column and `.seg` the segmented control (transcript lines reuse `.seg`, so their buttons are reset in `#segList`).
- Styling: all CSS in `app/index.html`; colour tokens in three blocks (light, `comfort`, dark), documented in the SRS tab "תצוגה וצבעים" and in `DESIGN.md`.
