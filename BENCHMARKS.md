# OnRamp MVP — Ship Benchmarks (from MoSCoW Musts)

Every loop iteration scores this table. MVP ships when all MUST rows pass.

| # | Benchmark | Bar | Status |
|---|-----------|-----|--------|
| M1 | Motivation-aware intake | 5 quick taps incl. WHY (escape/compete/curious/belong), <45s to finish | ☑ browser-driven 11 Jul |
| M2 | Rules matcher | Non-empty plan for ALL 144 intake combos (automated test passes) | ☑ 146/146 browser + 576-combo node sweep (incl. city cases) |
| M3 | Plan screen | 1 course + 2–3 events, ordered "step 1 of 3" framing | ☑ verified at 375px |
| M4 | Why-lines | Every pick has a personal "why this fits you" referencing the user's answers | ☑ course + per-event |
| M5 | Beginner-safe join | Events carry 🛡 tag + note + "learn this first" link → the plan's course | ☑ critic found 3 uncovered prepTopics → fallback join added, re-verified |
| M6 | Curated courses | ≥18 real courses, real URLs, tagged so every combo has a level-correct hit | ☑ 20 courses, URLs spot-checked 200 |
| M7 | Real events | ≥15 real events dated Jul 12–Aug 31 2026, real signup URLs, ≥8 online | ☑ 18 events, 11 online, URLs spot-checked 200 |
| M8 | Mobile <2min | Flow completes on 375px viewport, no horizontal scroll, loads instantly | ☑ zero console errors, no h-scroll |
| M9 | Anti-ChatGPT line | Landing answers "why not ChatGPT?" in one line | ☑ verbatim (curly apostrophe) |
| S1 | Email fake-door | Capture + success toast, localStorage, no oversell copy | ☑ stores {saved,email,answers,plan,ts} |
| S2 | Save buttons + progress cue | Save toggles persist; "step N of 3" visible | ☑ localStorage persists; "Question N of 5" + step spine |
| S3 | Vivid design | Dark+mint Neurovia-derived system, custom SVG icons, micro-interactions, zero external CDN | ☑ critic grep: zero external requests |
| S4 | Honesty | No UI copy claims a built weekly loop or accounts | ☑ critic grep: no "weekly"/account claims |
| M10 | Live events data | Auto-refresh ≤6h via backend job; past events filtered client-side; safety valve keeps old data if scrape <8 events | ☑ Action run green on CI runner, bot commit verified, idempotent ×2 |
| M11 | Public deployment | Mentors can open the tool anytime at a public URL | ☑ https://vanshul2304.github.io/onramp-hackathon/ — full flow + 146/146 test verified ON the deployed site |
| M12 | Freshness visible | Plan screen shows "Live events — refreshed N min/hours ago" | ☑ renders from window.EVENTS_UPDATED |

Verification method per iteration:
1. Open in browser at 375px, run full flow as 3 different personas (Riya/new, Sam/coder-job, Diana/switch).
2. Open test/matcher-test.html → all combos green.
3. Spot-check 5 random course URLs + 5 event URLs resolve (HTTP 200).
4. Screenshot proof.
