---
name: Thalamus
description: The clinic assistant (עוזר קליני) at /app/ drawn as an anatomy-atlas plate, Hebrew RTL, glanced at mid-session.
colors:
  plate-paper: "#f3f1ec"
  plate-white: "#ffffff"
  plate-tint: "#ece9e2"
  atlas-ink: "#16202a"
  pencil-grey: "#55606b"
  hairline: "#dad5cc"
  venous-blue: "#1f5fa8"
  venous-wash: "#dce7f5"
  arterial-red: "#b3261e"
  arterial-wash: "#f7dcd8"
  nerve-ochre: "#f3dfa8"
  nerve-ochre-ink: "#6b4600"
  lymph-green: "#d6ebd9"
  lymph-green-ink: "#1f5a33"
  must-wash: "#f6d2cc"
  must-ink: "#8e1c14"
  warn-ink: "#8a5a00"
  ok-ink: "#2e6b45"
  band-ink-navy: "#16263a"
  band-paper: "#f3f1ec"
  band-pencil: "#b4c3d4"
  band-rule: "#2b3f57"
  band-field: "#21364f"
  band-error: "#ffb4a8"
typography:
  brand:
    fontFamily: "Assistant, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "0.01em"
  timer:
    fontFamily: "Assistant, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Assistant, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Assistant, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Assistant, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Assistant, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  badge:
    fontFamily: "Assistant, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
rounded:
  badge: "4px"
  chip: "6px"
  stage: "7px"
  plate: "8px"
  pill: "999px"
spacing:
  hair: "4px"
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.venous-blue}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.plate}"
    padding: "11px 16px"
  button-secondary:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.atlas-ink}"
    rounded: "{rounded.plate}"
    padding: "11px 16px"
  button-danger:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.arterial-red}"
    rounded: "{rounded.plate}"
    padding: "11px 16px"
  record-button:
    backgroundColor: "{colors.arterial-red}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.pill}"
    size: "48px"
  plate:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.atlas-ink}"
    rounded: "{rounded.plate}"
    padding: "16px"
  field:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.atlas-ink}"
    rounded: "{rounded.plate}"
    padding: "10px 12px"
  chip-not-said-must:
    backgroundColor: "{colors.nerve-ochre}"
    textColor: "{colors.nerve-ochre-ink}"
    rounded: "{rounded.chip}"
    padding: "5px 11px"
    height: "34px"
  chip-not-said-useful:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.pencil-grey}"
    rounded: "{rounded.chip}"
    padding: "5px 11px"
    height: "34px"
  stage-switch-on:
    backgroundColor: "{colors.band-paper}"
    textColor: "{colors.band-ink-navy}"
    rounded: "{rounded.stage}"
    padding: "6px 14px"
  stage-switch-off:
    backgroundColor: "{colors.band-field}"
    textColor: "{colors.band-pencil}"
    rounded: "{rounded.stage}"
    padding: "6px 14px"
  header-band:
    backgroundColor: "{colors.band-ink-navy}"
    textColor: "{colors.band-paper}"
    height: "68px"
  badge-verify:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.venous-blue}"
    rounded: "{rounded.badge}"
    typography: "{typography.badge}"
    padding: "1px 6px"
  badge-not-found:
    backgroundColor: "{colors.must-wash}"
    textColor: "{colors.must-ink}"
    rounded: "{rounded.badge}"
    typography: "{typography.badge}"
    padding: "1px 6px"
---

# Design System: Thalamus

Scope: this file covers the clinic assistant only (`app/index.html`, served at `/app/`). The root `index.html` is a separate product, the public decision map "שיקום שמרני מפת דרך", with its own look; it shares only the theme key `localStorage['uqmap-theme']` with this system. Do not apply these rules to the map.

## Overview

**Creative North Star: "The Anatomy-Atlas Plate"**

Thalamus reads like a plate from an anatomy atlas. The screen is a sheet of plate paper under a venous-ink header band; every captured fact is a labelled structure, marked with a small label dot and, when tapped, joined by a hairline leader line with dot terminals to the transcript line it was heard in. Colour is not decoration. The atlas inks carry state: arterial red for recording and "must rule out", nerve ochre for "not yet said", lymph green for done and verified, venous blue for action and selection.

The density suits Operate mode. A therapist glances at a landscape tablet (about 1000×625) or a phone between questions, so the band holds the patient, the record button with timer, the stage switch and the display tools in one row. Below it the main column shows the ochre "not yet said" chips and the "captured now" rows, and the transcript sits in a side pane whose width the therapist chooses. Plates are flat. Tone steps (paper, white plate, tinted wells) and 1px rules separate them; shadows do not.

The same plate is drawn under three lights: light (cool paper), comfort ("נוח לעין", warm parchment and low glare, the default when the device is not dark), and dark (blue-black). Every role token changes value per theme and keeps its meaning.

**Key Characteristics:**
- Venous-ink header band on a paper ground; the band is the only large dark mass.
- The four atlas inks carry state and are never used as decoration.
- Flat 8px plates, separated by tone and one hairline rule.
- The leader line with dot terminals is the signature device that ties a fact to its source.
- One humanist sans (Assistant, self-hosted, variable 200–800) for both Hebrew and Latin; English clinical terms stay upright inside RTL text.
- The therapist controls transcript pane width, focus mode and density.

## Colors

These are atlas inks on plate paper: one dark band, one blue for action, and the warm and warm-red washes reserved for clinical state. The frontmatter holds the light-theme values; the comfort and dark values of the same roles live in the CSS theme blocks and in the sidecar.

### Primary
- **Venous Blue** (`venous-blue`): the action and selection colour. Used for primary buttons ("אשר", "שמור ל-Drive"), the active tab rule outside the band, links, the label dot before every captured fact, the "לאמת" outline badge, focus rings, and the "דובר 1" speaker tag. **Venous Wash** (`venous-wash`) is its soft partner: the source-highlight on a transcript line, AI badges, the field focus halo, and text selection.

### Secondary
- **Arterial Red** (`arterial-red`): recording only. It fills the record button and the dot of the recording pill, and colours the danger button outline. **Arterial Wash** (`arterial-wash`) backs the recording pill that follows the therapist to other screens.
- **Must Wash / Must Ink** (`must-wash`, `must-ink`): "must rule out" highlights in the analysis, the "לא נמצא בתמלול" badge for a quote the transcript does not contain, and save errors on the finish screen.

### Tertiary
- **Nerve Ochre** (`nerve-ochre` with `nerve-ochre-ink`): "not yet said". The strongest step fills the "חובה" chips. A 45% mix into the surface makes the "חשוב" step, and the "כדאי" step falls back to a plain plate with a hairline. It also marks recommended items in the analysis and the ring on a field reached from a not-said chip.
- **Lymph Green** (`lymph-green` with `lymph-green-ink`): done. Used for verified badges, done highlights in the analysis, and the saved-to-Drive confirmation.

### Neutral
- **Plate Paper** (`plate-paper`): the page ground and the fixed footer.
- **Plate White** (`plate-white`): plates, fields, chips and secondary buttons.
- **Plate Tint** (`plate-tint`): recessed wells. Used for quote callouts, count pills, the manual-entry transcript segment and the second-speaker tag.
- **Atlas Ink** (`atlas-ink`): body text and the leader-line stroke in light theme.
- **Pencil Grey** (`pencil-grey`): labels, metadata, timestamps and placeholder text.
- **Hairline** (`hairline`): every 1px rule and plate border.
- **Band Navy** (`band-ink-navy`) with **Band Paper**, **Band Pencil**, **Band Rule**, **Band Field** and **Band Error**: the header band's own scale. Band Field is the recessed track of the stage switch and the pressed tool button; Band Rule divides the band's control row from its tabs row.

### Named Rules
**The Inks Carry State Rule.** Red, ochre, green and blue each mean exactly one family of things (recording or must-rule-out, not yet said, done, action or selection). A new surface uses an ink only for its meaning, never to decorate or to set a section apart.

**The One Band Rule.** The venous-ink band is the only large dark field on a screen in light and comfort themes. Plates below it stay light.

**The Three Lights Rule.** Every colour is a role token with light, comfort and dark values. Never hard-code a hex in a component; add the role to all three theme blocks.

## Typography

**Display Font:** Assistant (self-hosted woff2, Hebrew and Latin subsets, variable weight 200–800), falling back to system-ui
**Body Font:** Assistant
**Label/Mono Font:** none; numbers use tabular figures (`font-variant-numeric: tabular-nums`) rather than a mono face

**Character:** One humanist sans does all the work, and hierarchy comes from weight (400 / 500 / 600 / 700 / 800) more than size. The size range is narrow, about 11px to 21px. Latin clinical terms (AROM, test names) sit upright and unstyled inside the Hebrew.

### Hierarchy
- **Brand** (800, 21px home / 17px in the session band, letter-spacing 0.01em): the word "Thalamus" beside the twin-lobe mark, always in band ink.
- **Timer** (700, 20px, tabular): the recording clock in the band.
- **Headline** (600, 18–19px, 1.3): the patient name in the session band.
- **Title** (700, 16px; 600 at 15px for live plates such as "נקלט עכשיו" and "עוד לא נאמר"): plate headings, with a count in 500 pencil grey after them.
- **Body** (400, 16px, 1.55; 15px in compact density): field values and transcript lines.
- **Label** (400–600, 13–14px): field labels, row keys, metadata and status lines in pencil grey. 13.5px is used for chips and source links.
- **Badge** (500, 11px): verification state tags.

### Named Rules
**The Weight Not Size Rule.** Rank is set by weight within the 13–21px band. Don't add display sizes; the screen is read at arm's length in a glance, not scanned like a page.

**The Tabular Count Rule.** Timers, counts and timestamps always use tabular figures.

## Layout

The layout is mobile-first and single-file. The content container is `.wrap`: 720px max with 16px gutters on phones, 1060px with 24px gutters from 760px, and 1440px from 1000px.

- **Phone (<640px):** the band takes two rows (back, mark, patient and tools; then record, timer and stage switch), with a full-width tabs row under it. The "כדאי" chips fold into one dashed "+N כדאי" chip. Captured-row actions wrap under the value.
- **Tablet (≥760px):** finish and settings plates can flow into two columns; the form fields auto-fill columns of at least 330px.
- **Landscape (≥1000px):** the band collapses to one 68px row of name, recording, stage switch and tools, with the tabs row and the fill status at its far end. The session becomes a split: the main column beside a sticky transcript pane with a hairline inline-start rule. The pane width is the user's choice: narrow 300px, medium 38% or wide 50%. With the pane off, the main column centres at 900px and the transcript returns as a tab.
- **Focus mode** hides the "captured now" plate and the map and theme tools, and enlarges the not-said chips (15px, 38px tall) and the captured values (17px).
- **Compact density** trims the record button to 40px, the band to 54px, plate padding to 12px and chips to 30px.
- A fixed footer on paper with a top hairline holds the save state (a coloured dot plus text) and "סיום מפגש".

Spacing follows a loose 4px-based rhythm (4, 6, 10, 14, 16, 24). Plate padding is 14–16px, rows sit 10px apart, and chip gaps are 5–6px.

## Elevation & Depth

The system is flat. Depth comes from tonal layering (paper ground, white plate, tinted wells) and 1px hairlines; the theme shadow token is `none`. Shadows appear only in three narrow cases: things that float above the plate (the toast and the audio player), the live recording pulse, and focus halos.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 8px 24px rgba(0,0,0,.18)` for the player, `.25` for the toast): only for transient overlays fixed above the content.
- **Recording pulse** (an expanding red ring, 0 to 14px over 1.6s): only on the live record button; it is disabled under reduced motion.
- **Band ring** (`box-shadow: 0 0 0 3px` in band field): seats the record button in the band.
- **Focus halo** (`box-shadow: 0 0 0 3px` in venous wash, plus a venous-blue border): inputs and fields while focused.

### Named Rules
**The Flat Plate Rule.** Plates never cast shadows. Separate them by tone and one 1px rule. Shadows belong only to overlays that float above the plate.

## Shapes

Corners are small and consistent: 8px plates, buttons, inputs and fields; 7px for the stage switch track and its segments; 6px for chips, callouts and the sourced transcript highlight; 4px for badges. Circles are kept for the record button, label dots, leader-line terminals and the save-state dot. The twin-lobe mark (two 14°-tilted ellipses, one filled at 55% and one outlined) is the only figurative shape, and it always sits in band ink.

## Components

### Buttons
Plain and firm, at weight 600.
- **Shape:** gently squared (8px).
- **Primary:** venous blue fill with white text, 11px 16px padding. Used for the confirming action: "אשר", "שמור ל-Drive".
- **Secondary:** plate white with a hairline border and ink text, for "נקה את השדה", "סיום מפגש" and "חזרה למפגש".
- **Danger:** plate white with an arterial-red outline and text.
- **Pressed:** moves down 1px. Focus shows a 2px venous-blue outline with a 2px offset.
- **Row actions** (confirm / source / edit / undo on a captured row): 34–36px tall. "אשר" has a blue outline and blue text; "מקור" is a borderless blue text button.

### Record Button
A 48px arterial-red disc (40px in compact density) with a white microphone, ringed 3px in band field. While recording it pulses. The timer (tabular, 700) and a pencil-grey state line sit beside it.

### Stage Switch
One recessed track in band field holding the three stages (אנמנזה / בדיקה / סיכום). The current stage is a band-paper segment with navy text at weight 600; the others are band-pencil text. 7px corners.

### Chips
- **Not-yet-said chips:** three ochre steps. "חובה" uses the full ochre at weight 600, "חשוב" a 45% ochre mix, and "כדאי" a white plate with a hairline. All are 6px corners and 34px tall at 13.5px. A legend of three 10px swatches with inset outlines sits beside the plate title. On hover the border turns ochre ink.
- **Generic chip:** white with a hairline, turning venous blue when selected.

### Cards / Containers (Plates)
- **Corner Style:** 8px.
- **Background:** plate white on paper ground.
- **Shadow Strategy:** none (see The Flat Plate Rule).
- **Border:** 1px hairline.
- **Internal Padding:** 16px (14px 16px on live plates, 12px in compact density).
- Rows inside a plate are divided by 1px hairlines; the first row has none.

### Inputs / Fields
- **Style:** form fields are white plates (8px corners, hairline border) with the label in pencil grey above a borderless auto-growing textarea. Empty fields collapse to one 46px row with the label and the input side by side.
- **Focus:** the border turns venous blue with a 3px venous-wash halo.
- **Just filled:** the field flashes venous wash, or plays a 1.6s ochre ring when reached from a chip.
- **Badges** in the label: AI (venous wash), manual (tint), verify (blue outline), verified (lymph green), not found in transcript (must wash).

### Navigation
- **Header band:** a sticky venous-ink band. On the home screen it shows the mark, "Thalamus" and "עוזר קליני". In a session it shows a back chevron, then the mark, "Thalamus", the patient name and region · visit type, the record controls, the stage switch, and 40px icon tools (settings, focus, pane, theme, map). These are outline SVG icons at stroke 1.8–2, drawn in band ink.
- **Tabs** (מפגש / טופס / תמלול / ניתוח): 600 weight. In the band, inactive tabs are band pencil and the active tab is band paper with a 3px underline. The fill status ("7/50") rides inside the טופס label.
- **Recording pill:** a full-width arterial-wash strip with a red dot and the tabular time, shown when recording continues while another screen is open.

### Source Leader (signature)
Tapping "מקור" on a captured fact draws a fixed SVG line (1.25px stroke in the lead colour) from the fact to the transcript line it was heard in. The line has a hollow dot at the fact and a filled dot at the source. The source line takes a venous-wash highlight, and the row's action buttons hide while the line is drawn. On the finish screen the same device appears inline as a **callout**: a tinted 6px well holding «the quote», with a short vertical leader and a filled terminal dot at its inline-start edge. Every captured key and field label carries the 7px venous **label dot** that starts the line.

### Transcript
Segments are separated by dashed hairlines. Each shows a play control, a tabular timestamp, a speaker tag ("דובר 1" in venous wash, "דובר 2" in tint with a hairline) and the text. Stage changes are marked by the stage name in 13px 700 venous blue.

## Do's and Don'ts

### Do:
- **Do** take every colour from the role tokens, and define any new role in all three theme blocks (light `:root`, dark under `prefers-color-scheme` and `[data-theme=dark]`, comfort under `[data-theme=comfort]`).
- **Do** keep plates flat: 8px corners, a 1px hairline, separation by tone.
- **Do** tie every AI-filled value to its source with the leader line or the quote callout, and start every captured key with the venous label dot.
- **Do** express "not yet said" in ochre steps, from strong to neutral, by priority.
- **Do** keep the venous-ink band as the home of the patient, recording, stage and tools.
- **Do** honour the therapist's layout controls (`data-side`, `data-side-on`, `data-focus`, `data-density`) in any new session surface.
- **Do** use tabular figures for every number that changes or counts.
- **Do** keep icons as inline outline SVG in `currentColor`, stroke 1.8–2.

### Don't:
- **Don't** use arterial red for anything but recording, must-rule-out and quotes not found in the transcript.
- **Don't** add drop shadows to plates or cards. Floating overlays (toast, player) are the only exception.
- **Don't** fall back to a white card stack with one teal accent; that is the category default this world refuses.
- **Don't** add a second typeface, or italicise or restyle Latin clinical terms inside Hebrew.
- **Don't** apply this system to the root decision map (`index.html`).
