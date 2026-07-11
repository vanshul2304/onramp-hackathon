# Curio Visual Direction — "Signal"

Creative direction for the visual overhaul. Every agent working on visuals reads
this first and designs against it. This document wins over personal taste.

## Concept

Curio turns the AI-learning firehose into one ordered plan. The visual language
is **Signal**: out of noise, a clear path emerges. Every visual is generative,
code-driven, deterministic, and theme-aware. No raster images, no stock
photography, no robots, no sparkle-emoji AI clichés, no purple gradients, no
glassmorphism (see PRODUCT.md — these are hard bans).

Reference altitude: Linear's dark product shots, Stripe's generative gradients,
Arc's confident restraint, Apple's material honesty. Premium = fewer elements,
more intention.

## Motif → meaning map

Five motifs, each owned by one product value. Use them purposefully — a motif
appears because its meaning fits the content, never as decoration.

| Motif | Meaning | Visual form |
|---|---|---|
| **Ascent** | Progress | Strata/contour lines rising left→right; the "ramp" |
| **Lattice** | Intelligence | Sparse node-and-edge mesh, mostly dark, few lit nodes |
| **Strata** | Learning | Layered translucent planes, depth via offset + opacity |
| **Constellation** | Community | Point clusters with faint connective arcs |
| **Streak** | Momentum | Velocity lines with easing taper, directional |

## Tokens (source of truth: css/style.css `:root`)

Consume the existing custom properties — never hardcode hex values in CSS.
In generated SVG/canvas, read computed values from CSS variables at runtime
(`getComputedStyle(document.documentElement).getPropertyValue(...)`) so the
light/dark toggle (`html[data-theme]`) restyles visuals live.

Key vars: `--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`,
`--mint` (#7AE2CF dark), `--teal`, warm accents `#FF8A5E`/`#FFD37A` family.
Mint is the identity accent: use it sparingly — one lit element per composition.
Warm is rarer still: reserved for the single "act now" moment on a screen.

## Rules

1. **Deterministic**: seeded PRNG only (reuse the hash approach in
   js/app.js `coverArt()`); same input → same art, forever.
2. **Theme-aware**: must look intentional in both `data-theme="dark"` and
   `"light"`. Re-render or restyle on theme change (listen for the
   `onramp:theme` custom event, or observe `data-theme` mutations).
3. **Motion is meaning**: animation only communicates state change or draws
   the eye to the one next action. Durations ≤ 600ms for UI, slow ambient
   drift (≥ 20s cycles) allowed only in the hero. Full
   `prefers-reduced-motion` fallback: static composition, zero drift.
4. **Performance**: zero-build constraint stays. No dependencies, no fonts,
   no network requests. Hero field ≤ ~8KB JS; cap canvas work at 60fps with
   `requestAnimationFrame` paused when tab hidden or hero off-screen
   (IntersectionObserver).
5. **Grain over gloss**: keep the existing SVG turbulence grain as the
   material signature. Depth comes from layering and light, not drop shadows.
6. **File ownership** (no two writers on one file):
   - Hero: `js/hero-field.js`, `css/hero-field.css`
   - Cover art v2: `js/cover-art-v2.js`, `css/cover-art-v2.css`
   - Micro-visuals: `js/micro-visuals.js`, `css/micro-visuals.css`
   - Integration (later pass only): `index.html`, `js/app.js`
7. **Contracts**: each module attaches to `window.OnRampVisuals` and must not
   touch `js/app.js`. Signatures:
   - `OnRampVisuals.heroField(containerEl) -> { destroy() }`
   - `OnRampVisuals.coverArt(seedString, kind) -> svgMarkupString`
     (kind: 'course' | 'hackathon' | 'meetup' | 'talk' | 'workshop' | generic)
   - `OnRampVisuals.progressRail(currentStep, totalSteps) -> svgMarkupString`
   - `OnRampVisuals.emptyState() -> svgMarkupString`
   - `OnRampVisuals.planReveal(containerEl) -> void` (one-shot reveal choreography)
   Modules must be safe to load in any order and inert until called.

## Addendum — "Orb" wave (ported from the react reference)

Source of truth: the Next.js reference at
`/private/tmp/claude-501/-Users-vanshulgupta-Desktop-hackathon-scraper/08b97db8-2bdb-4ccc-9ab1-270fe39e93a9/scratchpad/react-ref/react`
(same palette as ours: `--color-black:#051117`, `--color-green:#7ae2cf`). Its
"3D background" is looped video masked into a sphere + inset rim-light +
blurred mint glows — no WebGL. We port that recipe exactly, adapted to
vanilla CSS and both themes. Video assets already transcoded into this repo:
`assets/videos/orb.mp4` (square, for spheres) and `assets/videos/horizon.mp4`
(wide, for the floor band).

Recipes to replicate exactly (read these reference files):
- Orb: `templates/HomePage/Hero/index.tsx:35-51` — circular container, video
  at -10% inset, radial mask fading 20%→52%, `rgba(255,255,255,.25)` inset
  rim-light overlay, two mint glows (`bg-green/20`, ~8rem blur).
- Horizon band: `components/Start/index.tsx:6-19` — video rotated ~12deg at
  120vw with a radial-gradient mask, negative margins, glows.
- Gradient text: `app/globals.css:86-95` — radial white→50% white
  `bg-clip-text`. Light theme equivalent: radial `--accent-ink`→60%.
- Rim-light shadows: `app/globals.css:101-106` (`--shadow-1/2/3`).
- Hairline button hover: `components/Button/index.tsx` (`after:border-line`
  brightening on hover).
- FAQ accordion: `components/Faq/Item/index.tsx` — animated height, rotating
  chevron, hairline card. Reimplement in vanilla JS (no react-animate-height).

No-overlap rules (this wave must not collide with the Signal wave):
1. The orb becomes the hero's SINGLE lit focal element. `heroField()` gains
   an option to shift/dim its lattice so the mint focal node never sits under
   the orb — one focal point per composition stands.
2. The horizon band appears ONLY around the plan screen's download-door / CTA
   block — a screen region no Signal motif occupies.
3. Rim-light shadows and gradient text ship as OPT-IN classes; do not
   restyle `.card` or headings globally (existing glow shadows must not
   stack).
4. Video pauses under `prefers-reduced-motion` (poster: static radial
   gradient) and when off-screen (IntersectionObserver), matching the field's
   lifecycle discipline. No glassmorphism: port the inset rim-light, not
   `backdrop-blur`.
5. File ownership this wave: Orb agent → `js/orb.js`, `css/orb.css`, plus
   sole rights to edit `js/hero-field.js`. Surface agent → `css/surface.css`
   only. FAQ/band agent → `js/faq-band.js`, `css/faq-band.css`. Integration
   (later) → `index.html`, `js/app.js`.
6. New contracts on `window.OnRampVisuals`:
   - `orb(opts) -> HTMLElement` ({size?, className?} — video sphere)
   - `horizonBand() -> HTMLElement` (decor layer to prepend inside a
     `position:relative` CTA section)
   - `faq(items) -> HTMLElement` (items: [{q, a}]; one open at a time)
