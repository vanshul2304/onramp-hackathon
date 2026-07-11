# Curio

**Your one next step into AI — not another catalog.**

Curio is a personalized "next step" guide for beginners breaking into AI. Instead of the
firehose of courses, newsletters, and event listings, it asks five quick questions (including
the one that matters: *what's really driving this?*) and hands back ONE short, ordered plan:
a single curated course to start tonight, plus 2–3 real upcoming events this month — each with
a beginner-safe tag, a "learn this first" link back to the course, and a one-line "why this
fits you" written from your own answers.

Why not just ask ChatGPT? ChatGPT gives you a plan and forgets you. Curio gives you the next
step, a real room to walk into this week, and a nudge when it's time. The bet: momentum comes
from one concrete step and one real room, not a 40-item listicle.

## Try it

**Live:** https://vanshul2304.github.io/onramp-hackathon/ (GitHub Pages, auto-deploys from `main`)

Or run locally — any static server from the repo root:

```
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no npm, no framework — vanilla HTML/CSS/JS by design.

## Live events (backend job)

`data/events.js` is regenerated every 6 hours by a GitHub Action
([.github/workflows/refresh-events.yml](.github/workflows/refresh-events.yml)) running
[scripts/refresh-events.mjs](scripts/refresh-events.mjs) — zero-dependency Node that pulls
the Devpost hackathon JSON API plus three stable Luma calendars (`__NEXT_DATA__` parse),
merges with still-upcoming curated events (curated tags win on dedupe), schema-validates,
and refuses to overwrite the file if fewer than 8 valid events survive. The plan screen
shows "Live events — refreshed N min ago" from the embedded timestamp, and the matcher
also filters past events client-side between refreshes.

## Turn on real email (2 minutes)

The "Email me my plan" box sends the plan to the visitor's inbox once you connect a free
[EmailJS](https://www.emailjs.com/) account — no backend, no server code, just three IDs
pasted into [js/app.js](js/app.js). Until you do, it stays an honest offline capture
(saves the plan on the visitor's device, no false "sent" message).

1. Sign up at emailjs.com and **Add an Email Service** (Gmail works) → copy its **Service ID**.
2. **Create a template**. In the template, set the recipient ("To Email") field to `{{to_email}}`,
   and put `{{plan_text}}` in the body (and `{{course_title}}` in the subject if you like).
   Copy the **Template ID**.
3. Account → General → copy your **Public Key**.
4. Open `js/app.js`, fill the `EMAIL_CONFIG` block at the top with those three values, commit
   and push. Done — submissions now email the full plan (links included) to whoever typed
   their address. Free tier is 200 emails/month.

> EmailJS is called over plain `fetch` (no SDK), so the app stays 100% CDN-free. The Public
> Key is safe to expose client-side; that's what it's for. In EmailJS → Account → Security you
> can restrict sends to your Pages domain to prevent abuse.

## What's real vs. faked (honesty ledger)

- **Real:** the intake, the rules-based matcher (144-combo tested), curated course data with
  verified URLs, real event listings with real signup links refreshed every 3 hours by CI,
  Save buttons (localStorage), shareable plan links (answers encoded in the URL hash).
- **Real once configured:** "Email me my plan" sends the plan to the visitor via EmailJS when
  `EMAIL_CONFIG` is filled (see above). **Before that it's an offline capture** — stores
  `{email, plan, answers}` to localStorage with an honest "saved on this device" message,
  no false claim of sending.
- **Still faked:** there is no account system and no automated weekly nudge loop — the copy
  never claims either.

## File map

```
index.html              single page: landing → intake → plan (state machine, no router)
css/style.css           hand-rolled design system (dark + mint, one warm accent)
js/app.js               state machine, rendering, micro-interactions, inline fallback data
js/matcher.js           pure rules matcher: window.buildPlan(answers, courses, events)
data/courses.js         window.COURSES — curated courses (owned by data-courses lane)
data/events.js          window.EVENTS — real upcoming events (owned by data-events lane)
test/matcher-test.html  exhaustive matcher test: all 144 intake combos + city cases
```

If `data/courses.js` / `data/events.js` are missing or empty, `js/app.js` falls back to
4 inline sample courses + 4 sample events so the app always runs standalone.

## Matcher rules (short version)

Course: level match is a hard filter (never violated); then goal ×2, motivation ×2, hours ×1.
Events: beginner-safe strongly boosted for `level=new`, online-first unless your city matches,
sooner dates win ties, max 1 hackathon unless your goal is job/build. If filters starve the
pool, soft requirements are dropped in order (motivation → hours → goal for courses;
motivation → goal → beginner-preference → any upcoming online event for events) so the plan
is never empty. Open `test/matcher-test.html` to see every combo pass.
