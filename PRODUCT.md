# Product

## Register

brand

## Users

Beginners breaking into AI: career-switchers, students, and the AI-curious who are
overwhelmed by the firehose of courses, newsletters, and event listings. They arrive
on a phone, often in the evening, with low energy and high doubt. Target session:
open → "yes, I'd follow this plan" in under 2 minutes (SPEC.md demo metric).

## Product Purpose

OnRamp turns the AI-content firehose into ONE short, ordered plan: a single curated
course to start tonight plus 2–3 real upcoming events this month, each with a
beginner-safe tag and a "why this fits you" line built from the visitor's own answers.
Success = the visitor takes the first concrete step (starts the course, signs up for
one real room) instead of doomscrolling.

## Brand Personality

Confident, warm, anti-catalog. The voice hands you one next step and a real room to
walk into — it never lists, hedges, or upsells. Dark, calm surfaces with a single
mint identity accent and one warm highlight; editorial serif display against a
system sans body ("designed, not templated").

## Anti-references

- Course-catalog and listicle sites (Coursera browse pages, "40 best AI courses" posts).
- Generic AI-SaaS glow: purple gradients, gradient text, glassmorphism cards.
- ChatGPT itself — the explicit foil in the landing copy ("hands you a plan and forgets you").

## Design Principles

1. **One next step over choice overload.** Every screen has a single primary action.
2. **Honesty ledger.** UI never claims capabilities the code doesn't have (README's real-vs-faked ledger).
3. **Mobile-first, 375px is the demo.** Everything must look great on a phone first (SPEC.md).
4. **Momentum beats motivation.** Copy and interactions bias toward showing up, not planning.
5. **Tokens are the source of truth.** Spacing, containers, z-index, and type come from `:root` tokens; LAYOUT.md arbitrates.

## Accessibility & Inclusion

- ≥44px touch targets on every tappable control (LAYOUT.md rule).
- `prefers-reduced-motion: reduce` kills all animation/transition durations globally.
- No horizontal overflow at 320px; `overflow-wrap` guards on headings.
- Visible `:focus-visible` outlines on all interactive elements.
- Body text ≥4.5:1 contrast; large display text ≥3:1 (both themes once light mode ships).
