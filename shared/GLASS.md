# Liquid Glass and region atmosphere

Written 27.11.2026 for the Ligamentum map (`src/template.html`, block "Liquid Glass + region atmosphere"). It records how the glass became visible and what to change when Thalamus (`app/`) adopts the same recipe. The shared tokens it builds on live in `shared/tokens.css`. DESIGN.md is the Thalamus system; this file adds to it, it does not replace it.

## Why the first glass did not read

Glass only reads when something with colour or texture passes behind it. Before this change:

- The page background was one flat colour (`--bg`).
- The header was filled with that colour down to 58% of its height, so the search and tools capsules blurred a solid band.
- The region rail was a grid column beside the content. Nothing ever passed under it.
- Search results and the phone sheets were opaque.
- In dark, glass over black is a grey card.

Raising transparency alone (the "glass lab" test of 27.11) changed almost nothing. The fix is structural: give the glass something to show, and let content pass under it.

## The three layers

1. **Atmosphere** (bottom, decorative, never carries meaning). A soft field of three blurred colour pools at the top of the page, in the current region's hue.
2. **Content** (middle, opaque). Cards, decisions, tests. Unchanged: clinical text never sits on glass or on the atmosphere directly. The region title, meta pills and lede do sit on the atmosphere, in a zone kept pale enough for AA.
3. **Navigation** (top, glass). Header capsules, region rail, phone tab bar, phone sheets, search results, display popover, the "שלבים ↓" hint.

## Atmosphere

Element: `<div class="cover" aria-hidden="true">`, the first child of `.app`. `.app` is `position:relative; isolation:isolate`, and the cover is `position:absolute; z-index:-1`. Positioning it this way paints it under the content without lifting `.cols` into its own stacking context. Lifting `.cols` broke the phone sheets: the scrim landed on top of them.

- **Since 28.11 it is fixed to the viewport** (`position:fixed; inset:0`), so colour stays at any scroll depth. (On 27.11 it was a band at the top that scrolled away. Platon wanted the colour to live through the page.)
- Four static radial gradients in OKLCH:
  - the region hue, top end;
  - `--h-a` (hue +38°), top centre;
  - `--h-b` (hue −34°), bottom start;
  - `--h-c` (hue +18°), bottom end.
- Two drifting pools on `::before` / `::after` (`--h-c` and `--h-d`, hue −16°). They are 70vmax circles (110vmax on phones) that translate and scale slowly, `drift-a` 46s and `drift-b` 58s, alternate, on `--ease-std`. Only `transform` animates, so the browser moves a finished layer and does not repaint the blur. Under reduced motion they stand still.
- All derived hues are clamped to 170–312 with `min()` / `max()`, so no region drifts into pink.
- Per theme, set by variables on `:root`:

| Theme | Pool 1 (L / C / α) | Pool 2 | Pool 3 |
|---|---|---|---|
| light | .80 / .13 / .72 | .86 / .10 / .55 | .90 / .07 / .50 |
| comfort | .80 / .09 / .62 | .85 / .07 / .50 | .88 / .05 / .45 |
| dark | .52 / .17 / .72 | .46 / .15 / .60 | .42 / .13 / .55 |

The fourth pool (bottom end) is `.88 / .08 / .38` in light, `.86 / .06 / .34` in comfort and `.40 / .12 / .45` in dark.

### Dark theme on the map (map only, not Thalamus)

Platon found pure black too flat. The map overrides the dark tokens; `shared/tokens.css` and Thalamus are unchanged.

| Token | Thalamus | Map |
|---|---|---|
| `--bg` | #000000 | #141417 |
| `--card` | #1c1c1e | #212125 |
| `--card-2` | #2c2c2e | #2b2b30 |
| `--glass` | rgba(36,36,38,.62) | rgba(44,44,50,.6) |
| `--glass-thick` | rgba(32,32,34,.9) | rgba(40,40,46,.88) |
| `--glass-solid` | #232325 | #2a2a2f |

On the lighter cards three inks dropped just under AA, so dark brightens them too:
- `--stop`: red ink + 14% white;
- `--pt`: teal ink + 18% white;
- content links: tint ink + 20% white.

Thalamus keeps black on purpose (DESIGN.md: glanced at mid-session). If Thalamus ever wants this, it is a token change in `shared/tokens.css`, followed by both contrast audits.

### Region hues

One hue per region, `--rh` (an OKLCH hue angle), set by `setHue(id)` from `show()`:

| Region | Hue | Region | Hue |
|---|---|---|---|
| tissue (רקמות) | 175 | general (מסגרת כללית) | 240 |
| neck (צוואר וראש) | 188 | found (עקרונות) | 253 |
| shoulder (כתף) | 201 | lowback (גב תחתון ואגן) | 266 |
| elbow (מרפק) | 214 | hip (ירך ומפשעה) | 279 |
| hand (שורש כף יד וכף יד) | 227 | knee (ברך) | 292 |
| | | ankle (קרסול וכף רגל) | 305 |

**Why only 175–305 (cyan → blue → indigo → violet):** DESIGN.md's Fixed Category Rule gives clinical meaning to pink (pain), red (stop, positive finding), orange (mobility, evidence), yellow (notes) and green (strength, go). The atmosphere is decoration, so it stays in the cool band where it cannot be read as one of those. Teal and indigo do appear in the band, but only as large, pale, blurred light, never as a mark, glyph, label or badge. That is the line: **a hue may tint the atmosphere; only the category may fill a mark.**

### The signature moment

`--rh` is registered with `@property --rh { syntax:'<number>'; inherits:true }` and `:root` transitions it over 0.9s on `--ease`. Switching region therefore makes the whole atmosphere, and everything glass on top of it, glide from one hue to the next while the new region fades up. This is the map's one authored motion. Do not add others that compete with it.

## Navigation glass material

| Token | Value | Used by |
|---|---|---|
| `--nav-glass` | `color-mix(in srgb, var(--glass-solid) 52%, transparent)` | rail, tools capsule, tab bar, hint |
| search field | `glass-solid` at 62% | `.field`: more frost, so the placeholder stays readable |
| `--nav-glass-thick` | `glass-solid` at 80% | search results, display popover, phone sheets |
| blur | 14px on capsules (with lens), 26px on rail, 30px on thick | |
| saturation | 180–190% | |
| `--rim` | light: `inset 0 1px 0 rgba(255,255,255,.85), inset 0 0 0 .5px rgba(255,255,255,.55)`; comfort: warm white; dark: `.24` / `.16` | every glass element, together with `--glass-sh` |

These are lighter than DESIGN.md's `glass` (.66 alpha). It works because the atmosphere is pale, but only after two adjustments, measured against real screenshot pixels (`tests/e2e/atmosphere_contrast.py`, every region × three themes × three widths):

- `.lede`, `.rail-h` and `.reg .cnt` take `--label-2` mixed 72% with `--label` (plain `--label-2` was 4.1–4.4:1 in light).
- In dark, the selected region row uses a solid `tint 34%` over `--card` with white text (tint ink on tint-soft over glass was 3.1:1). If Thalamus adopts the lighter tint, re-check contrast wherever glass sits over busy content (the transcript, the record).

### Header: glass only when needed

`header.bar` is transparent at rest, so the atmosphere runs up behind the capsules. Its `::before` is a frosted scroll-edge band:

- blur 18px;
- `--bg` at 72% fading to 25%;
- masked to fade out 26px below the bar.

The band fades in (opacity, `--dur-3`) when `.app.scrolled` is set (`scrollY > 6`). Content then passes under the capsules through frosted glass, the way iOS 26 handles the scroll edge.

### Lens (refraction)

An inline SVG filter `#lens`:

- `feImage` carries a 240×48 displacement map. It is a capsule-shaped distance field: R = x shift, G = y shift, neutral 128 in the middle, strongest at the rim. Generated with a small Python script; see the commit.
- `feDisplacementMap` uses `scale="-34"`.

It is applied as `backdrop-filter: url(#lens) blur(14px) saturate(190%) brightness(1.04)` on `.field`, `.tools` and `.mbar`. Only Chromium renders SVG filters in `backdrop-filter`, so the class `lens` is added to `<html>` only when `navigator.userAgentData.brands` names Chromium (Chrome, Edge, Opera, Samsung Internet). Everyone else keeps the plain blur declared before it. The rail does not use the lens: on a tall panel the stretched map distorts too much.

## Custom scrollbars (28.11)

`#side` and `#panel` (the rail, the tests panel and both phone sheets) hide the system scrollbar (`scrollbar-width:none`). Their system bar ran past the rounded corners.

`customScroll(el)` adds a `.sb-thumb` instead:
- a 5px pill at `inset-inline-end:4px`, inset 18px from the ends when the corner radius is above 20px, otherwise 10px;
- positioned by `translateY(scrollTop + inset + ratio × track)`;
- 45% opacity at rest when the content can scroll, full opacity on hover or while scrolling, 8px wide on hover or while dragged;
- draggable with pointer capture, with a 6–7px invisible hit area.

Wheel, touch, keyboard and assistive tech still use the native scroll. The page scrollbar stays native but thin and rounded. Port to Thalamus: the same function fits its side pane and sheets.

## Fallbacks and accessibility

- **No backdrop-filter:** an `@supports not (backdrop-filter)` rule turns every navigation glass element (and `.glass`) into `--glass-solid`.
- **`prefers-reduced-transparency: reduce`:** every navigation glass element becomes `--glass-solid` with no blur, and the atmosphere drops to 45% opacity.
- **`prefers-reduced-motion: reduce`:** no hue transition and no header fade.
- **`forced-colors: active`:** the atmosphere and the scroll-edge band are hidden.
- **Region title** (`.region-head h2`): `clamp(40px, 3.3vw, 56px)`, weight 800, tracking −0.028em. It sits on the atmosphere and holds its own against the large wordmark.

## Porting to Thalamus

What carries over directly:

1. `--nav-glass`, `--nav-glass-thick` and `--rim` belong in `shared/tokens.css` once Thalamus uses them. Move them there; do not copy them.
2. The scroll-edge header band, for Thalamus's toolbar over the session column.
3. The lens on toolbar capsules, the island and the tab bar, behind the same Chromium check. The island is 52px tall with a 30px radius, so regenerate the displacement map for its aspect, or use the 240×48 map with `preserveAspectRatio="none"` and check the rim.
4. The `.app` isolation plus `z-index:-1` pattern for any background layer. Never lift a container that holds fixed sheets into its own stacking context.

What needs a decision first:

- **Atmosphere in Thalamus.** The session screen is read at arm's length mid-session (PRODUCT.md: "the screen is glanced at, never stared at"). A pale atmosphere behind the toolbar is fine. A hue per screen would need its own meaning: per stage (anamnesis, exam, summary)? Keep it out of the transcript and form area. Decide with Platon.
- **Hue band.** Thalamus uses teal for tests and indigo for hypotheses as marks. If the atmosphere runs behind those cards, choose a band that avoids both (for example 200–245) or drop the atmosphere there.
- **Dark.** Thalamus dark cards have no shadow. Keep the atmosphere low (L ≤ .46) so the cards stay the brightest thing.

## Files and selectors

- **CSS:** `src/template.html`, from the comment "Liquid Glass + region atmosphere" to the reduced-transparency block.
- **Markup:** `.cover` and the `#lens` SVG, just before `<header class="bar">`.
- **JS:** `REGION_HUE`, `setHue()` (called in `show()`), `onScrollGlass`, the Chromium `lens` check, `customScroll()`.
- **Checks:** `tests/e2e/frame_tour.py`, `content_tour.py`, `phone_width.py`, `desk_grid.py`, `contrast_audit.py` (computed colours), `atmosphere_contrast.py` (screenshot pixels).
