# Curio — UI smoke checklist (manual, ~5 min)

Static app, no build. Serve the repo root and open the page:

```bash
python3 -m http.server 8000    # then visit http://localhost:8000
```

Run top-to-bottom in one sitting. Each step lists the action and the pass condition.
`[ ]` = not run, `[P]` = pass, `[F]` = fail (note what happened).

---

- [ ] **1. Landing renders.** Load `/`. Pass: hero "A platform where Curiosity meets personalised AI Curation.", the "Get my plan" button, "How it works" 1-2-3, and the animated decor/glow all show. No console errors.

- [ ] **2. Intake step 1 (level).** Click "Get my plan". Pass: "Where are you starting?" with 3 options (Brand new / I've dabbled / I can code), progress reads "Question 1 of 5", bar animates.

- [ ] **3. Intake steps 2–4 advance on tap.** Pick a level → auto-advances to Goal (4 options) → Time (3 options) → Motivation (4 options). Pass: each selection pulses then advances; progress climbs 2/5 → 4/5.

- [ ] **4. Intake step 5 (location).** After motivation, land on "Where should we look for rooms?". Pass: city text input + "Online only works for me" toggle + "Build my plan" button. Typing a city clears the online-only toggle; toggling online-only clears the city.

- [ ] **5. Back button.** From step 5, click the back arrow repeatedly. Pass: walks back through 4→3→2→1, prior selections still highlighted; back from step 1 returns to landing.

- [ ] **6. Plan renders with course + events.** Complete intake (try level=new, goal=understand, online-only). Pass: Step 1 course card (title, provider, cost badge, "Why this fits you", "Do this first", Start button) + Step 2 with 2–3 event cards + Step 3 teaser + "Download my plan" box. Summary line reflects your answers.

- [ ] **7. Beginner-safe + why-lines populate.** On the plan, each event card shows a non-empty "Why this room" line; beginner-safe events show the shield tag and note. Pass: no blank why lines, no "undefined".

- [ ] **8. Save toggle persists after reload.** Click "Save" on an event (label → "Saved", filled). Reload the page **with the same hash URL**. Pass: after reload the plan restores and that event still reads "Saved".

- [ ] **9. Share copies hash link.** Click "Share". Pass: toast "Share link copied to clipboard."; pasted URL contains `#plan=...`.

- [ ] **10. Hash-shared URL restores plan.** Open the copied URL in a fresh tab (or new window). Pass: it boots straight to the plan screen (skips landing/intake) with the same course and events.

- [ ] **11. Download my plan.** Click "Download PDF" in the download box. Pass: `onramp-plan.pdf` downloads to the device, opens as a valid PDF with the plan content, and every course/event URL is a clickable link. Toast confirms; button briefly reads "Downloaded ✓".

- [ ] **12. Reduced motion.** Enable OS "Reduce motion" (or DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`), redo intake. Pass: option taps advance with no/instant animation; no jarring motion; app still fully usable.

- [ ] **13. Responsive layout — 375 / 768 / 1440 px.** Resize (DevTools device toolbar). Pass: at 375px cards stack single-column, nothing overflows horizontally, tap targets ≥ ~44px; at 768px comfortable; at 1440px content is centered/constrained, not stretched edge-to-edge.

- [ ] **14. Keyboard-only pass.** From landing, navigate with Tab/Enter/Space only through CTA → each intake option → location field → plan actions (Remix, Share, Save, Sign up). Pass: visible focus ring throughout, every control reachable and operable, focus lands sensibly on each new screen.

- [ ] **15. Toast behavior.** Trigger a toast (Share, Save, or Download). Pass: appears with icon, is readable, auto-dismisses after ~3s, and a second trigger resets the timer rather than stacking duplicates.

---

**Cross-cutting checks (watch throughout):**
- Console stays clean (no errors/warnings) across all screens.
- `esc()` escaping holds: type a city like `<b>x` in step 5 — it must render as literal text on the plan summary, not inject markup.
- External links (course "Start now", event "Sign up") open in a new tab with `rel="noopener"`.
- "Learn this first" on an event smooth-scrolls to the Step 1 course card and flashes it.
