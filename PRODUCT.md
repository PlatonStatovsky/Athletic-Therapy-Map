# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Platon, a sports-therapy student (Levinsky-Wingate) working toward independent manual-therapy practice, using it in real clinical sessions.
- Invited beta testers: independent sports therapists and physiotherapists in Israel.
- Situation: a live 30–45 minute session (intake, physical exam, summary) while talking to a patient. The therapist glances at the screen between questions and tests; typing during the session is rare.

## Product Purpose

The clinic assistant records the session, transcribes Hebrew with English clinical terms live, fills a structured intake/exam form from what was actually said, shows what has not been asked yet, and after the session produces a clinical-reasoning draft grounded in the therapist's own decision map. Success: the therapist finishes a session with a verified, saved record and fewer missed questions, without the screen pulling attention from the patient.

## Positioning

The only Hebrew tool that ties live session capture to a clinical decision map for sports and orthopaedic rehab: every AI-filled field shows the exact quote it came from, gaps are shown as "not yet said", and the analysis links back to the map's test cards. Clinic-management products (scheduling, billing, generic AI summaries) do not do this.

## Operating Context

- Devices: an Android tablet in landscape (Opera, about 1000×625 CSS px) on the treatment table, and phones. Same site as the public decision map ("שיקום שמרני מפת דרך"), hosted on Cloudflare Pages; the assistant lives at `/app/`.
- Session ritual: patient consent → record → anamnesis / exam / summary stages → end of session: verify AI-filled fields → save to the therapist's Google Drive.
- Transcription engines: the browser's speech recognition, or Soniox (paid, speaker labels).

## Capabilities and Constraints

- Hebrew only, right-to-left; English clinical test names and abbreviations inside Hebrew text.
- Three display themes shared with the map through `localStorage['uqmap-theme']`: light, comfort ("נוח לעין", warm and low-glare), dark.
- Patient data stays with the therapist: the session lives on the device until saved to the therapist's own Drive. With encryption on (Settings → נתונים), the session, patient list and recordings are stored sealed with a key kept in the therapist's Drive app folder, opened by Google sign-in.
- The assistant opens only for Google accounts on the server's allow list (`ALLOWED_EMAILS`); the public map stays open to everyone.
- No API key reaches the browser: Claude and Soniox calls go through the site's own server functions, which hold the keys as secrets; the browser sends only the access code.
- Static PWA, no build step: `app/index.html` (markup and styles), `app/app.js`, `app/boot.js`, `app/norms.js` (editable normal ROM ranges). A CSP in `_headers` forbids inline scripts.
- The user wants control over: transcript pane width, a focus mode, and density.
- Undecided: per-user settings and quotas (planned for the beta), subscription pricing.

## Brand Commitments

- Product name for the assistant: **Thalamus** (chosen 1.11.2026). The public map keeps its own name.

## Evidence on Hand

- No testimonials, customers, usage numbers or clinical outcome claims exist. None may be invented.
- Real content: the decision map's data (regions, ~82 test cards with evidence), the form's ~50 fields, the analysis prompts.

## Product Principles

1. The patient comes first: the screen is glanced at, never stared at.
2. Nothing enters the record without a source the therapist can check.
3. The therapist owns the data and the decisions; the AI drafts.
4. Calm under pressure: errors, gaps and unverified fields are stated plainly, in Hebrew, with the next step.

## Accessibility & Inclusion

- Readable at a glance from arm's length on a tablet; WCAG AA contrast in all three themes; full keyboard use on desktop.
