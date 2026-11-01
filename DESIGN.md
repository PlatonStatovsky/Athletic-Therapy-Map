---
name: Thalamus
description: A Hebrew RTL clinic assistant in Apple's current design language, with opaque grouped content under a floating glass navigation layer.
colors:
  system-blue: "#007aff"
  action-blue: "#0071e3"
  blue-ink: "#0066cc"
  blue-soft: "rgba(0,122,255,.12)"
  system-red: "#ff3b30"
  red-ink: "#d70015"
  red-soft: "rgba(255,59,48,.12)"
  system-orange: "#ff9500"
  orange-ink: "#c93400"
  orange-soft: "rgba(255,149,0,.14)"
  system-yellow: "#ffcc00"
  yellow-ink: "#8f5a00"
  yellow-soft: "rgba(255,204,0,.18)"
  system-green: "#34c759"
  green-ink: "#248a3d"
  green-soft: "rgba(52,199,89,.14)"
  system-teal: "#30b0c7"
  teal-ink: "#007d8f"
  teal-soft: "rgba(48,176,199,.14)"
  system-indigo: "#5856d6"
  indigo-ink: "#3634a3"
  indigo-soft: "rgba(88,86,214,.12)"
  system-purple: "#af52de"
  purple-ink: "#8944ab"
  system-pink: "#ff2d55"
  pink-ink: "#c70d3f"
  pink-soft: "rgba(255,45,85,.12)"
  bodymap-pain: "#ff2d55"
  bodymap-radiation: "#af52de"
  bodymap-paresthesia: "#0a9bb5"
  bodymap-silhouette: "rgba(120,120,128,.16)"
  grouped-background: "#f2f2f7"
  card: "#ffffff"
  card-inset: "#f2f2f7"
  fill: "rgba(120,120,128,.12)"
  fill-quiet: "rgba(120,120,128,.08)"
  label: "#0b0b0f"
  label-secondary: "#6e6e73"
  label-tertiary: "#8e8e93"
  separator: "rgba(60,60,67,.16)"
  separator-strong: "rgba(60,60,67,.29)"
  glass: "rgba(255,255,255,.66)"
  glass-thick: "rgba(250,250,252,.9)"
  glass-solid: "#f9f9fb"
  glass-edge: "rgba(255,255,255,.75)"
  scrim: "rgba(0,0,0,.22)"
  comfort-background: "#ece7de"
  comfort-card: "#faf7f1"
  comfort-card-inset: "#f1ece3"
  comfort-label: "#2a251f"
  comfort-label-secondary: "#6a6156"
  comfort-action-blue: "#2462bd"
  comfort-blue-ink: "#1d5bb3"
  dark-background: "#000000"
  dark-card: "#1c1c1e"
  dark-card-inset: "#2c2c2e"
  dark-label: "#f5f5f7"
  dark-label-secondary: "#a1a1a6"
  dark-blue: "#0a84ff"
  dark-blue-ink: "#5aa9ff"
  dark-glass: "rgba(36,36,38,.62)"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title-2:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.47
  body-reading:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.62
  subheadline:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.45
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  nav-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
  metric:
    fontFamily: "-apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
rounded:
  glyph: "8px"
  s: "10px"
  m: "14px"
  nav-item: "16px"
  bubble: "18px"
  l: "20px"
  xl: "26px"
  island: "30px"
  capsule: "999px"
spacing:
  pad: "16px"
  gap: "14px"
  pad-compact: "12px"
  gap-compact: "10px"
  field: "10px 14px"
  toolbar-height: "72px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "#ffffff"
    typography: "{typography.subheadline}"
    rounded: "{rounded.capsule}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.system-blue}"
  button-tinted:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.blue-ink}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.capsule}"
    padding: "8px 16px"
    height: "40px"
  button-tinted-hover:
    backgroundColor: "{colors.fill-quiet}"
  button-small:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.blue-ink}"
    typography: "{typography.footnote}"
    rounded: "{rounded.capsule}"
    padding: "4px 12px"
    height: "32px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.label}"
    rounded: "{rounded.capsule}"
    size: "40px"
  icon-button-pressed:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-ink}"
  segmented-control:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.capsule}"
    padding: "2px"
  segmented-control-selected:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.capsule}"
    height: "34px"
  switch:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.capsule}"
    width: "51px"
    height: "31px"
  switch-on:
    backgroundColor: "{colors.system-green}"
  text-input:
    backgroundColor: "{colors.fill-quiet}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.s}"
    padding: "10px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.l}"
    padding: "{spacing.pad}"
  inset-grouped-list:
    backgroundColor: "{colors.card-inset}"
    rounded: "{rounded.m}"
    padding: "{spacing.field}"
  category-glyph:
    backgroundColor: "{colors.system-pink}"
    textColor: "#ffffff"
    rounded: "{rounded.glyph}"
    size: "28px"
  badge:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.capsule}"
    padding: "1px 8px"
  badge-verify:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-ink}"
  badge-beta:
    backgroundColor: "{colors.indigo-soft}"
    textColor: "{colors.indigo-ink}"
  token-chip:
    backgroundColor: "{colors.fill-quiet}"
    textColor: "{colors.label}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.capsule}"
    padding: "6px 13px"
    height: "36px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.label-secondary}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.nav-item}"
    height: "58px"
  nav-item-current:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-ink}"
  recording-island:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.label}"
    rounded: "{rounded.island}"
    padding: "6px 14px 6px 6px"
    height: "52px"
  record-button:
    backgroundColor: "{colors.system-red}"
    textColor: "#ffffff"
    rounded: "{rounded.capsule}"
    size: "42px"
  note-bar:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.capsule}"
    padding: "6px"
    height: "54px"
  popover:
    backgroundColor: "{colors.glass-thick}"
    rounded: "{rounded.l}"
    padding: "14px"
    width: "380px"
  settings-drawer:
    backgroundColor: "{colors.glass-thick}"
    rounded: "{rounded.xl}"
    width: "460px"
  drawer-tab-tile:
    textColor: "#ffffff"
    rounded: "9px"
    size: "32px"
  transcript-bubble:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.bubble}"
    padding: "8px 13px 7px"
  transcript-bubble-second-speaker:
    backgroundColor: "{colors.blue-soft}"
  phone-tab-bar:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.capsule}"
    padding: "4px"
    height: "60px"
---

# Design System: Thalamus

## Overview

**Creative North Star: "The Native iPad Chart"**

Thalamus should feel like a first-party iPad app that a clinician already knows how to use. It follows Apple's current design language (iPadOS 26, Liquid Glass), and the user chose that direction deliberately. There are two layers. The content layer is the patient's record: graphs, lists and form fields in opaque grouped cards on a grouped grey background. The navigation layer floats above it on glass: the sidebar or rail, the toolbar capsules, the recording island, popovers, the note bar, the settings drawer, the toast and the audio player. The content layer never turns into glass, and the glass layer never holds the record itself.

The app is used mid-session on a landscape tablet held at arm's length, so it reads like Health: one category hue per clinical domain, large numbers, and a 17px body. Colour comes in two steps. The vivid system colour marks glyphs, bars, dots and fills. The darker increased-contrast step carries any text in that hue. Three themes run on the same tokens: light (iOS grouped greys), comfort ("נוח לעין", a warm low-glare grouped tint) and dark (true black with elevated greys).

Motion is a single spring-out curve. The one theatrical moment is the recording island: each time a fact is captured, it expands over the content for 3.8 seconds and then settles back.

**Key Characteristics:**
- Opaque grouped cards for content; glass only for floating navigation and controls.
- Apple system colours in two steps: vivid for marks, ink for text.
- Fixed Health-style category hues for pain, mobility, strength, tests, hypotheses, notes and course.
- The system font on Apple devices, with self-hosted Heebo and Inter elsewhere. 17px body and 34px large titles.
- Concentric continuous corners (10/14/20/26) and capsules for every control.
- A density switch rescales the type ramp and padding together.
- Hebrew right-to-left throughout, laid out with logical properties.

## Colors

The palette is Apple's system palette on grouped greys. Hue carries clinical meaning and is never used as decoration.

### Primary
- **System Blue** (`system-blue`): the app tint. It colours sidebar icons on the full sidebar, the text caret, the pressed hover of primary buttons, the transcript "playing" ring and the recording category glyph. In dark mode it becomes `dark-blue`.
- **Action Blue** (`action-blue`): the fill for primary buttons, the send button, the play buttons in source quotes, checked note ticks, and the confirm action in the capture feed. It is slightly deeper than System Blue so that white labels on it pass AA.
- **Blue Ink** (`blue-ink`): blue text. It is used for links, tinted-button labels, the current nav item, the "to verify" badge and the field label in the expanded island.
- **Blue Soft** (`blue-soft`): the selected and hover wash. It backs the current nav item, pressed icon buttons, text selection, a focused field row, a hovered record sentence, the second speaker's transcript bubble and the halo on the expanded island.

### Secondary (clinical category hues)
Each category has a vivid mark colour, an ink colour for text and, where needed, a soft wash. A category is shown as a white glyph on a 28px tile in the vivid colour, with its label in the ink colour.
- **Pain Pink** (`system-pink` / `pink-ink` / `pink-soft`): the pain course card, the VAS meters and line, pain values in the exam bars, and the body-map card.
- **Mobility Orange** (`system-orange` / `orange-ink` / `orange-soft`): ROM, the "important" priority dot, equivocal test results, warning banners and a sourced transcript line.
- **Strength Green** (`system-green` / `green-ink` / `green-soft`): MMT, switches in the on state, saved state, success banners and the "done" highlight.
- **Tests Teal** (`system-teal` / `teal-ink` / `teal-soft`): special tests.
- **Hypotheses Indigo** (`system-indigo` / `indigo-ink` / `indigo-soft`): hypothesis rows and their strength pips, the BETA badge, and the next-step icons.
- **Notes Yellow** (`system-yellow` / `yellow-ink` / `yellow-soft`): the notes card glyph and the note-bar glyph. The glyph on yellow is dark brown (#5c3b00), not white.
- **Course Purple** (`system-purple` / `purple-ink`): timeline events on the course chart.
- **System Red** (`system-red` / `red-ink` / `red-soft`): recording, positive test findings, gaps ("not yet said", critical priority), errors and must-do highlights.

### Tertiary (body-map kinds)
These three hues are kept apart for colour-vision safety and have been checked with the dataviz validator. They appear only on the silhouette map and its legend.
- **Pain** (`bodymap-pain`), **Radiation** (`bodymap-radiation`), **Paresthesia** (`bodymap-paresthesia`), on a **Silhouette** (`bodymap-silhouette`) fill. Unverified zones are drawn at 45% fill opacity.

### Neutral
- **Grouped Background** (`grouped-background`): the page behind the cards.
- **Card** (`card`): every content card, grouped list, inspector and segmented-control thumb.
- **Card Inset** (`card-inset`): field groups inside a card, which gives the inset-grouped look.
- **Fill / Fill Quiet** (`fill`, `fill-quiet`): translucent greys for tinted buttons, segmented tracks, switch tracks, inputs, chips, quotes and the first speaker's bubble.
- **Label / Secondary / Tertiary** (`label`, `label-secondary`, `label-tertiary`): primary text, supporting text, and glyph-only greys. Tertiary is never used for text a person has to read.
- **Separator / Strong** (`separator`, `separator-strong`): 0.5px hairlines between rows, and chart axes.
- **Glass family** (`glass`, `glass-thick`, `glass-solid`, `glass-edge`): the navigation-layer material and its solid fallback.
- **Comfort** (`comfort-*`): warm parchment greys with a softened blue (`comfort-action-blue`, `comfort-blue-ink`). Category hues stay the same as in light.
- **Dark** (`dark-*`): a true-black background, #1c1c1e cards, #2c2c2e insets, and brighter ink steps for every hue (for example, pink ink is #ff7a93). In dark mode, cards have no shadow.

### Named Rules
**The Two Steps Rule.** The vivid system colour fills marks: glyph tiles, bars, dots, meters and switches. Text in a hue always uses its ink step. Vivid colour is never used for text.

**The Fixed Category Rule.** Each clinical category has exactly one hue, the same in every card, chart, legend and badge. A new category takes an unused system hue. It never borrows a hue that already has a meaning.

**The Three Themes Rule.** Every colour is a custom property on the root, redefined for comfort and dark, and selected by the theme attribute on the html element. Theme choice is shared with the map. No component may hard-code a colour that has no value in all three themes.

## Typography

**Display Font:** -apple-system / BlinkMacSystemFont (SF on Apple devices)
**Body Font:** ThalamusSans, a self-hosted variable family that maps Heebo to the Hebrew range and Inter to the Latin range, with system-ui as the fallback
**Label/Mono Font:** same family, with tabular numerals for figures

**Character:** On Apple hardware the app should read as native SF. Everywhere else, Heebo sets the Hebrew and Inter sets the English clinical terms, and they share one family name so mixed lines have consistent metrics.

### Hierarchy
- **Large Title** (700, 34px; the session view uses clamp(28px, 3.4vw, 34px); line-height 1.15; -0.01em): the patient name and the home title.
- **Title 2** (700, 22px, 1.25): the settings drawer heading. Analysis H2 sits close to it at 20px.
- **Headline** (700, 17px, 1.25): card titles, stage summaries and hypothesis names.
- **Body** (400, 17px, 1.47): default text and form values. **Body Reading** (line-height 1.62) is used for the live record and the analysis.
- **Subheadline** (500 to 600, 15px): buttons, segmented controls, chips, bubbles and list secondary lines.
- **Footnote** (600 to 700, 13px): field labels, section headers inside cards in secondary grey, and card category labels.
- **Caption** (500, 12px): badges, chart ticks, legends and timestamps.
- **Nav Label** (600, 11px): rail and tab-bar labels under their icons.
- **Metric** (700, 22px, line-height 1, tabular): VAS readouts.

### Named Rules
**The 17-Point Rule.** Body text is 17px, and every other size comes from the same five-step ramp (17/15/13/12, plus titles). The compact density setting moves the whole ramp down (15/14/12) along with padding (12px) and gap (10px). It never shrinks a single element on its own.

**The Tabular Figures Rule.** Counts, timers, timestamps, scores and chart values always use tabular numerals.

## Layout

The layout is a three-column shell: the rail or sidebar on the start edge (right, in RTL), the main column, and an optional transcript inspector on the end edge.

- **Rail and sidebar:** below 1280px the rail is 84px wide, with icons above 11px labels and counts. At 1280px and up it becomes a 252px sidebar with the app identity, the patient block, icon-and-label rows with trailing counts. The views are Session, Form, Summary and Analysis; there is no stage switch, because the phase (anamnesis, exam, summary) follows what has been filled. The rail is a glass panel inset 10px from the viewport edges, with a 26px radius.
- **Main column:** the content is centred with a max width of 1080px (880px on the home and finish screens), and side padding of clamp(14px, 2.2vw, 28px). The sticky toolbar is 72px tall. Its capsules float over the content and the gaps between them pass pointer events through.
- **Cards:** an auto-fit grid with columns of at least 300px and a 14px gap. Wide cards span the full row.
- **Transcript panel:** at 1000px and up it sits on the end edge as an opaque card, sticky at full height, at narrow (300px), medium (36%) or wide (46%), chosen in its own header. Its hide button folds it into a half-circle glass tab on the left screen edge (34×84px, 42px end radius, chat icon and line count), which reopens it at the last width. Below 1000px the same tab opens it as a panel over the session from the left edge (up to 440px), closed by its button or Escape.
- **Focus mode:** removes the rail and inspector so the main column is the only column.
- **Phone (below 760px):** a single column. The rail is replaced by a floating glass capsule tab bar 12px from the sides and bottom, respecting the safe area. The island fills the toolbar. The settings drawer becomes a bottom sheet at 92dvh. The note bar, toast and player move up to clear the tab bar.
- **Rhythm:** card padding is 16px, gaps are 14px, field rows are 10px by 14px, and list rows have a minimum height of 46 to 54px.

## Elevation & Depth

Depth is material, not shadow. Content is opaque and nearly flat: cards have a 1px whisper shadow in light and comfort, and none in dark. Everything that floats is glass: a 24px blur with 180% saturation, a 0.5px bright edge, a soft two-part drop shadow, and a 1px inset specular highlight along the top. Popovers and the settings drawer use the thicker glass tint so their text stays readable over busy content. When the browser has no backdrop-filter support, glass becomes a solid tint (`glass-solid`). Under forced colours, glass and cards get a 1px CanvasText border.

### Shadow Vocabulary
- **Card whisper** (`box-shadow: 0 1px 2px rgba(0,0,0,.04)`): content cards and the inspector in light and comfort. None in dark.
- **Glass lift** (`box-shadow: 0 8px 28px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)`): every glass element. In comfort the tint is warm brown, and in dark it is 0 10px 30px at .45.
- **Specular edge** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.8)`): the top highlight on glass, always paired with the glass lift.
- **Segment thumb** (`box-shadow: 0 2px 8px rgba(0,0,0,.12), 0 0 0 .5px rgba(0,0,0,.04)`): the selected segment.
- **Switch knob** (`box-shadow: 0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16)`).
- **Active halo** (`0 0 0 3px` in blue-soft, added to the glass lift): the expanded island and the focused note bar.

### Named Rules
**The Glass Is Navigation Rule.** Glass is used only on the floating layer: the sidebar or rail, toolbar capsules, the island, popovers, the note bar, the drawer, the toast, the player and the tab bar. A card that holds patient data is always opaque.

**The Solid Fallback Rule.** Every glass surface has to stay readable without backdrop-filter, so the solid fallback tint ships alongside it.

## Shapes

Corners are continuous and nest concentrically, with inner corners tighter than outer ones. The steps are: 26px for the panels that hold the app (the rail, inspector and drawer), 20px for cards and popovers, 14px for inset field groups, banners and grouped lists in settings, and 10px for inputs, quotes and callouts. Small icon tiles use 8 to 9px. Transcript bubbles are 18px. The island is 30px. Every control is a capsule (999px): buttons, segmented tracks and thumbs, switches, chips, badges, the note bar, the tab bar and the toast. Round controls are 40 to 42px circles. Rows are divided by 0.5px hairlines, never boxed.

**The Concentric Corner Rule.** A shape inside a rounded container uses the next smaller radius step: 26, then 20, then 14, then 10.

## Components

### Buttons
- **Shape:** capsule (999px), 40px minimum height, 8px by 16px padding, 15px semibold. Small buttons are 32px with 13px text. Block buttons are 48px at 17px.
- **Primary:** Action Blue fill with a white label. On hover the fill becomes System Blue.
- **Tinted (default):** a Fill background with a Blue Ink label. On hover it changes to Fill Quiet. Destructive buttons keep the tinted fill with a Red Ink label.
- **Press:** scale(.97) over 0.12s. The focus-visible ring is 3px in the focus blue, offset 2px.
- **Icon buttons:** 40px circles, transparent at rest with a Fill background on hover. When pressed they take a Blue Soft fill and Blue Ink icon. Icons are inline SVG at 21px.

### Segmented control
A Fill capsule track with 2px of inset padding. Each segment is a capsule at least 34px tall. The selected segment is a raised Card-coloured thumb (#636366 in dark) with the segment-thumb shadow and semibold text. Its background and shadow animate over 0.25s on the spring curve. The transcript panel's width control is a compact variant (28px segments, caption text).

### Switches
iOS geometry: a 51 by 31px capsule track with a 27px white knob. The track is Fill when off and System Green when on, and the knob slides over 0.25s on the spring curve.

### Chips and badges
- **Token chips** (the "not yet said" items): a Fill Quiet capsule, 36px tall, 15px medium text, with a leading 8px priority dot (red for critical, orange for important, grey otherwise). Critical items are semibold.
- **Badges:** caption capsules with 1px by 8px padding. Variants are neutral (Fill), verify (Blue Soft with Blue Ink), bad (red), ok (green) and BETA (indigo, +.02em tracking).
- **Map link chips:** capsules on the Card colour with a hairline border and Blue Ink text. They link to test cards in the decision map.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** Card on the grouped background.
- **Shadow Strategy:** the card whisper only (see Elevation & Depth).
- **Header:** a 28px category glyph tile (white icon on the vivid hue), a Headline title, and a trailing meta time and badge.
- **Internal Padding:** 16px, or 12px in compact density.

### Inputs / Fields
- **Text input:** Fill Quiet background, no border, 10px radius, 44px minimum height, 17px text, blue caret. On focus it gets a 2px outline in the focus blue.
- **Inset grouped form:** collapsible stage cards (20px) with field groups in Card Inset (14px) and 0.5px separators between rows. A field shows a 13px secondary label above a borderless, auto-growing textarea. When focused, the row takes a Blue Soft wash. An empty field collapses into a single row with the label at the start and a muted placeholder at the end. When the AI fills a field, it flashes Blue Soft and fades over 1.6s.

### Navigation
- **Rail item:** a 58px column with a 24px icon over an 11px semibold label and a 10px count. The radius is 16px. At rest it uses Secondary Label, on hover it gets a Fill Quiet background, and the current item has a Blue Soft background with Blue Ink text.
- **Sidebar item (1280px and up):** a 44px row with a 22px icon tinted System Blue, a 15px label and a trailing count.
- **Phone tab bar:** a glass capsule with four equal items, 52px tall, with 23px icons and 10.5px labels. Counts are hidden.
- **Toolbar:** glass capsules. The island sits at the leading edge, and the tools capsule (focus, more, Done) sits at the trailing edge. "More" holds the display mode, the map and all settings.

### Recording Island (signature)
A 52px glass capsule with a 30px radius, flexing between 220px and 540px wide. From the start edge it contains:
- a 42px record button: red with a white mic, or, while recording, a white disc with a red inset ring and a stop glyph;
- a top line with a timer in tabular bold, a blinking red dot (1.6s), and the stage name;
- the newest captured fact in one line;
- a "to verify" capsule badge.

When a fact is captured, the island pulses (scale 1.035 over 0.9s) and the caption enters with a blur-up (0.7s). The island then expands to a maximum width of 760px. In the expanded state, the caption wraps to as many as about three lines at 17px semibold, the field name appears above it in Blue Ink, and a 3px Blue Soft halo is added. After 3.8s it settles back.

**The 3.8-Second Island Rule.** The island grows over the content only after a capture, and only for 3.8s. It never stays expanded and never pushes the layout.

### Source popover
A thick-glass panel with a 20px radius, up to 380px wide, that enters with a 0.32s scale, rise and blur. It shows the field label, the value, and the quoted transcript line in a 14px Fill Quiet block with a speaker and time line and a round play button. Actions are capsule buttons. A quote that the transcript could not find takes the red soft wash. Only one popover is open at a time.

### Live record
A notes-style card set in Body Reading. Section heads are 13px secondary. Each sentence can be tapped: on hover or when active it gets a Blue Soft wash with a 6px radius, and draft sentences are shown in Secondary Label. A trailing "to verify" badge marks unverified sentences.

### Health-style graphic cards
- **Course:** a pink VAS line with dots ringed in the card colour, a pink peak marker, purple event dots on a timeline (the current event is drawn hollow), axes and grid in the separator colours, and 12 to 13.5px tick labels.
- **Body map:** front and back silhouettes up to 108px wide, with zones in the three body-map hues and a legend of rounded squares.
- **Exam:** horizontal bars that end with a 4px radius at the end edge, a hairline baseline, tabular values, dot strips for comparing sides, and test rows with result dots: filled red for positive, a hollow grey ring for negative, a half-filled orange dot for equivocal.
- **Hypotheses:** separator-divided rows with a three-pip strength meter (14 by 6px pips) in indigo, two columns of evidence (stacked on phone), and map link chips.

### Next steps (BETA)
The only card that shows AI-drafted suggestions. It is a regular card with a 1.5px conic-gradient rim (blue, purple, pink, orange, green, at .75 opacity) behind it, in the style of Apple Intelligence. Each row has a 30px indigo-soft icon circle, a 15px semibold step and a caption reason.

**The One Rim Rule.** The multicolour rim marks AI-drafted suggestions only. No other card or control uses it.

### Settings drawer
A thick-glass panel 460px wide with a 26px radius, inset 10px from the start edge. It slides in over 0.42s on the spring curve, slides out over 0.28s on an ease-in, and sits over a scrim. Tabs are icon tiles: a 32px rounded square (9px radius) in a category hue with a white icon, over an 11.5px label. The selected tab sits on a Fill background. The body is a set of inset grouped lists: 14px Card groups with 50px rows, 13px secondary headers and caption footers. On phone it becomes a bottom sheet (92dvh) that slides up.

### Transcript inspector
Laid out as a conversation. The first speaker's bubbles are Fill and sit at the start. The second speaker's bubbles are Blue Soft and sit at the end. Bubbles have an 18px radius, take at most 86% of the width, and use 15px text with an 11px meta line (speaker, time, a 22px play disc). A centred 11px bold stage marker separates the stages. A typed line uses a dashed border on a transparent background. A playing line gets a 2px blue ring, and a line opened as a source gets an orange ring with an orange-soft wash. Interim recognition shows as a Fill Quiet bubble in secondary text.

### Note bar, toast and player
- **Note bar:** a glass capsule up to 720px wide, sticky 12px above the bottom. It has a 34px yellow note glyph, a borderless 17px input and a 40px Action Blue send circle (Fill when disabled). When the input has focus, the bar gets the active halo.
- **Toast:** a glass capsule with 15px semibold text that pops in and stays for 3.8s. Error toasts use Red Ink.
- **Player:** a centred glass capsule with 36px round buttons. The main button is Action Blue.

## Do's and Don'ts

### Do:
- **Do** put patient content on opaque Card surfaces (20px radius, 16px padding) over the grouped background, and keep glass for the floating navigation layer.
- **Do** colour marks with the vivid system step and text with its ink step, in every theme.
- **Do** use the fixed category hue for its domain everywhere it appears: pain pink, mobility orange, strength green, tests teal, hypotheses indigo, notes yellow, course purple.
- **Do** make every control a capsule or circle, and nest container corners 26, then 20, then 14, then 10.
- **Do** animate with the spring-out curve cubic-bezier(.16,1,.3,1), and turn all motion off under prefers-reduced-motion.
- **Do** keep the body at 17px, and let the density switch rescale the whole ramp and padding together.
- **Do** use logical properties (inline-start and inline-end) so the RTL layout mirrors correctly.
- **Do** ship a solid fallback for every glass surface, and give the comfort and dark themes a value for every new token.

### Don't:
- **Don't** put glass, blur or translucency on a card that holds patient data.
- **Don't** use a vivid system colour (System Yellow, System Teal, System Orange) for text. Use its ink step.
- **Don't** reuse a category hue for a different meaning, or add decorative colour that carries no category.
- **Don't** use the multicolour Apple-Intelligence rim on anything other than an AI-drafted suggestion.
- **Don't** keep the recording island expanded beyond its 3.8s, and don't let it change the layout around it.
- **Don't** give content cards more than the 1px whisper shadow, and don't give them any shadow in dark mode.
- **Don't** use Tertiary Label for text that has to be read. It is for glyphs and markers only.
