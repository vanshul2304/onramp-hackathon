# Curio — Build Spec & Coordination Contract

**Product:** Curio — personalized "next step" guide for beginners breaking into AI.
Turns the firehose of AI courses + events into ONE short, ordered plan:
**1 curated course to start now + 2–3 real upcoming events this month**, each with a
beginner-safe tag, a "learn this first" link, and a one-line "why this fits you."

**Anti-ChatGPT line (must appear on landing):**
"ChatGPT gives you a plan and forgets you. Curio gives you the next step, a real room
to walk into this week, and a nudge when it's time."

**Demo metric:** a stranger goes from open → "yes I'd follow this" plan in under 2 minutes, on a phone.

## Architecture (no build step — deliberate)

Static site, vanilla JS + one CSS file. Opens from any static server. No npm, no framework.

```
index.html        single page: landing → intake (5 quick taps) → plan screen
css/style.css     design system (Neurovia-inspired dark + mint)
js/app.js         state machine + rendering
js/matcher.js     rules-based matcher (pure functions, testable)
data/courses.js   window.COURSES = [...]   (curated, ~20)
data/events.js    window.EVENTS  = [...]   (real, hand-cached, ~16-20)
img/              logo + vivid SVG icons/abstracts
test/matcher-test.html  runs matcher across ALL intake combos, asserts non-empty
```

## Design language (from Neurovia inspiration, iterate don't copy)

- Background near-black `#051117`, surfaces `#151F25` / `#263035`, hairlines `#374145`
- Accent mint `#7AE2CF`, deep teal `#1B8C77`, text white / muted `#8A9BA3`
- Warm accent for highlights/CTAs allowed (e.g. coral `#FF6B5E` or amber) — use sparingly
- Big confident type, generous spacing, rounded-2xl cards, subtle glows/gradients
- Vivid inline SVG icons (no icon font, no external CDN dependencies)
- Micro-interactions: staggered card reveals, progress bar animation, button press states
- Mobile-first. Everything must look great at 375px wide.

## Intake (the 4-question motivation-aware intake — 5 quick taps, <45s)

Stored as `answers`:

| key         | values |
|-------------|--------|
| `level`     | `new` (never touched code/AI) · `dabbled` (tutorials, prompts) · `coder` (can code, new to AI) |
| `goal`      | `job` (get hired) · `switch` (change careers) · `build` (ship things) · `understand` (get literate) |
| `hours`     | `lt3` · `3to6` · `7plus` (hours/week) |
| `motivation`| `escape` · `compete` · `curious` · `belong`  ← the ⭐ differentiator question ("What's really driving this?") |
| `location`  | `{ city: string \| null, onlineOnly: boolean }` free text city, or "online only" |

## Data contract — data/courses.js

```js
window.COURSES = [{
  id: "ai-for-everyone",
  title: "AI For Everyone",
  provider: "DeepLearning.AI (Coursera)",
  url: "https://…",                 // REAL, verified URL
  levels: ["new","dabbled"],        // who it fits
  goals: ["understand","switch"],
  motivations: ["curious","escape"],
  hoursFit: ["lt3","3to6"],         // weekly-hours buckets it suits
  durationLabel: "~6 hrs total",
  cost: "free",                     // "free" | "freemium" | "paid"
  format: "video course",           // short human label
  tagline: "The classic non-technical AI primer",
  topics: ["fundamentals"],         // used to join events → "learn this first"
  firstStep: "Watch Week 1 (50 min) tonight" // the concrete do-this-now
}, …]
```

Topics vocabulary (shared with events): `fundamentals`, `prompting`, `python`, `ml`,
`llm-apps`, `agents`, `no-code`, `career`, `data`, `creative`.

## Data contract — data/events.js

```js
window.EVENTS = [{
  id: "luma-ai-tinkerers-jul",
  title: "AI Tinkerers Meetup",
  org: "AI Tinkerers",
  url: "https://lu.ma/…",           // REAL signup link
  source: "luma",                   // "luma" | "devpost" | "meetup" | other
  dateISO: "2026-07-18",
  dateLabel: "Sat · Jul 18",
  mode: "online",                   // "online" | "in-person" | "hybrid"
  city: null,                       // string when in-person/hybrid
  kind: "meetup",                   // "meetup" | "workshop" | "hackathon" | "talk" | "study-group"
  beginnerSafe: true,
  beginnerNote: "First-timers welcome — intros round, no demos required",
  prepTopic: "prompting",           // joins to a course topic → "learn this first"
  goals: ["build","job"],
  motivations: ["belong","curious"],
  free: true
}, …]
```

Events must be REAL and dated between 2026-07-12 and 2026-08-31. Online events are the
backbone (work for any city); in-person from major hubs are bonus flavor.

## Matcher rules (js/matcher.js)

Pure function `buildPlan(answers, courses, events)` → `{ course, events: [2-3], why: {…} }`
- Score = tag overlap: level match ×3 (courses), goal ×2, motivation ×2, hours ×1.
- Events: beginnerSafe first for `level=new`; online-first unless city matches; nearest date first on ties; max 1 hackathon unless goal=job/build.
- "Why this fits you" one-liners are TEMPLATED from answers (e.g. motivation=escape →
  "You said you want out — this is the shortest credible path from zero to employable"). One per pick.
- MUST never return empty for ANY combo (3×4×3×4 = 144 combos). Fallback: drop
  motivation, then hours, then goal — never drop level for courses.

## Plan screen (this IS the demo)

- "Step 1 of 3" progress framing: ① Start this course → ② Show up to this event → ③ Go here next
- Course card: title, provider, cost badge, duration, why-line, `firstStep`, [Start now →]
- Event cards (2–3): date, mode/city, 🛡 "Beginner-safe" tag + note, why-line,
  **"Learn this first →"** link that points at the plan's course (the ⭐ join), [Save] [Sign up →]
- "⬇️ Download my plan" — client-side PDF of the full plan with clickable resource links,
  downloads straight to the device, success toast (no capture, no server — nothing leaves the device)
- [Save] toggles saved state (localStorage). Share/copy-link button.
- "Remix answers" to retake intake.

## Ownership (who writes what — do not touch other lanes)

| Lane | Files | Agent |
|------|-------|-------|
| UI + app + matcher | index.html, css/, js/, img/, test/ | ui-build |
| Courses data | data/courses.js | data-courses |
| Events data | data/events.js | data-events |

UI agent ships with 3 sample courses + 3 sample events INLINE as fallback if
`window.COURSES`/`window.EVENTS` missing, so lanes never block each other.
