# OnRamp — Layout Rulebook

The discipline layer for `css/style.css`. When merging lanes, **this file is the arbiter for spacing, container widths, breakpoints, and z-index.** Visual identity (color, type personality, decoration, copy, motion) is owned by other lanes — this doc does not govern those.

All tokens live in `:root` in `css/style.css`. Use tokens; don't reintroduce ad-hoc `rem` values for structural rhythm.

---

## Tokens

### Spacing scale (4 / 8pt)
Use for padding, margin, and gap on structural elements.

| Token | Value | px | Typical use |
|-------|-------|----|-------------|
| `--space-1` | 0.25rem | 4 | hairline gaps |
| `--space-2` | 0.5rem | 8 | icon↔label gap, tight stacks |
| `--space-3` | 0.75rem | 12 | chip padding, small gaps |
| `--space-4` | 1rem | 16 | default gap, intake top padding |
| `--space-5` | 1.5rem | 24 | container gutters, spine gap |
| `--space-6` | 2rem | 32 | section separation, tablet gutters |
| `--space-7` | 3rem | 48 | hero top padding |
| `--space-8` | 4rem | 64 | container bottom padding, "how" margin |
| `--space-9` | 6rem | 96 | reserved for large desktop sections |

### Container widths
| Token | Value | Applies to |
|-------|-------|------------|
| `--container-narrow` | 480px | `.intake`, `.plan` (mobile/tablet) |
| `--container-wide` | 720px | `.landing-inner` (mobile/tablet) |
| `--container-max` | 1120px | `.plan` at ≥1024px |
| `--container-xl` | 1520px | `.landing-inner` at ≥1024px (full-bleed hero) |

### Fluid type scale (`clamp`, min @375 → max @1440+)
| Token | Range | Use |
|-------|-------|-----|
| `--text-xs` | 0.8rem | labels, footnotes |
| `--text-sm` | 0.875rem | secondary text |
| `--text-base` | 1rem | body, buttons |
| `--text-lg` | 1.08→1.25rem | card titles |
| `--text-xl` | 1.3→1.7rem | plan title |
| `--text-2xl` | 1.55→2rem | question title |
| `--text-3xl` | 2→3.2rem | hero title |

### Radius & border
| Token | Value |
|-------|-------|
| `--radius` | 1.25rem (cards, panels) |
| `--radius-sm` | 0.75rem (insets, ghost buttons) |
| `--radius-pill` | 999px (buttons, chips, pills) |
| `--border` | `1px solid var(--line)` |

### z-index (named levels only — no raw values)
| Token | Value | Layer |
|-------|-------|-------|
| `--z-decor` | 0 | background glow / orbs |
| `--z-content` | 1 | foreground content |
| `--z-ui` | 50 | fixed chrome (theme toggle) — above content, below toast |
| `--z-toast` | 100 | transient overlays |

---

## Breakpoint behavior

Mobile-first. Three breakpoints matter:

- **375px (base):** single focused column. Containers use `--container-narrow` / `--container-wide`. Gutters `--space-5`.
- **768px (tablet):** gutters widen to `--space-6`. `.how-steps` becomes 3 columns (from 620px). Layout otherwise unchanged.
- **1024px (laptop) and up:** `.plan` expands to `--container-max` (1120px) and its event cards (`.spine-events`) become a **2-column top-aligned grid**. The landing becomes a **full-height two-zone hero**: `.landing` fills `100dvh` and bleeds full-width (background to both viewport edges), while `.landing-inner` bounds content to `--container-xl` (1520px), centered, as a `1.12fr / .88fr` grid (hero left, "how it works" right). **Intake stays `--container-narrow` on purpose** — one question at a time is a focus decision, not an oversight.

---

## Do / Don't (specific to this app)

**DO**
- Use `minmax(0, 1fr)` in every grid track (`.how-steps`, `.spine-events`) so long content never forces overflow.
- Give every tappable control `min-height: 44px` (`.btn`, `.btn-ghost` already do).
- Put `white-space: nowrap` on short-label buttons; `overflow-wrap: break-word` on headings.
- Keep `.intake` narrow at all widths. Widen `.plan`, not the questions.
- Use `overflow-x: clip` (not `hidden`) on `html`/`body`, and `100dvh` (not `100vh`) for full-height.

**DON'T**
- Don't reintroduce a fixed `max-width: 480px` on `.plan` at desktop — it must reach `--container-max`.
- Don't hardcode `999px`, `1px solid var(--line)`, or raw `z-index` numbers — use the tokens.
- Don't add new ad-hoc `rem` padding/margin for structure; pick the nearest `--space-*`.
- Don't let the `.spine-events` grid collapse below `1024px` — it's single-column on mobile by design.

---

## Three rules the merge must not break

1. **`.plan` is responsive, not fixed.** `max-width: var(--container-narrow)` on mobile → `var(--container-max)` at ≥1024px, with `.spine-events` as a 2-col `minmax(0,1fr)` grid. Any lane that pins `.plan` back to 480px at desktop regresses this.
2. **No horizontal overflow at 320px.** Verified: nothing exceeds the viewport. Grids use `minmax(0,1fr)`, headings wrap, `overflow-x: clip` on `html`/`body`.
3. **Tokens are the source of truth for rhythm.** Spacing, container width, radius, and z-index come from `:root` tokens. Raw values for these are a merge conflict to resolve toward the token.
