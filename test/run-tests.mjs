#!/usr/bin/env node
/* Curio — headless QA harness (zero deps, Node >=16).
 * Run:  node test/run-tests.mjs
 * Loads data/*.js + js/matcher.js in a vm sandbox (browser `window` shim),
 * exercises window.buildPlan across all 144 intake combos × 3 location cases,
 * validates data schemas, and statically lints js/app.js.
 * Exits non-zero with a readable failure list; prints "ALL PASS (N assertions)".
 *
 * ponytail: node:vm + a {window} shim is the whole "loader" — no jsdom, no bundler.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ---- assertion plumbing ---------------------------------------------------
const failures = [];
let assertions = 0;
function ok(cond, msg) {
  assertions++;
  if (!cond) failures.push(msg);
  return !!cond;
}

// ---- load browser globals in a sandbox ------------------------------------
const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const file of ['data/courses.js', 'data/events.js', 'js/matcher.js']) {
  try {
    vm.runInContext(read(file), sandbox, { filename: file });
  } catch (e) {
    console.error(`FATAL: could not load ${file}: ${e.message}`);
    process.exit(2);
  }
}
const { COURSES, EVENTS, EVENTS_UPDATED, buildPlan } = sandbox.window;

ok(typeof buildPlan === 'function', 'matcher.js did not attach window.buildPlan');
ok(Array.isArray(COURSES) && COURSES.length > 0, 'window.COURSES missing/empty');
ok(Array.isArray(EVENTS) && EVENTS.length > 0, 'window.EVENTS missing/empty');
if (failures.length) { report(); process.exit(1); }

const TODAY = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// (b) buildPlan across all 144 combos × 3 location cases
// ---------------------------------------------------------------------------
const LEVELS = ['new', 'dabbled', 'coder'];
const GOALS = ['job', 'switch', 'build', 'understand'];
const HOURS = ['lt3', '3to6', '7plus'];
const MOTIVATIONS = ['escape', 'compete', 'curious', 'belong'];
const LOCATIONS = [
  { name: 'online-only', location: { city: null, onlineOnly: true } },
  { name: 'city-known', location: { city: 'San Francisco', onlineOnly: false } },
  { name: 'city-unknown', location: { city: 'Nowhereville', onlineOnly: false } },
];

let combos = 0;
for (const level of LEVELS)
  for (const goal of GOALS)
    for (const hours of HOURS)
      for (const motivation of MOTIVATIONS)
        for (const loc of LOCATIONS) {
          combos++;
          const answers = { level, goal, hours, motivation, location: loc.location };
          const tag = `[${level}/${goal}/${hours}/${motivation}/${loc.name}]`;
          let plan;
          try {
            plan = buildPlan(answers, COURSES, EVENTS);
          } catch (e) {
            ok(false, `${tag} buildPlan threw: ${e.message}`);
            continue;
          }

          // course: non-null, real object
          const c = plan && plan.course;
          if (!ok(c && typeof c === 'object' && c.title, `${tag} course is null/empty`)) continue;

          // level HARD filter never violated
          ok(Array.isArray(c.levels) && c.levels.indexOf(level) !== -1,
            `${tag} course "${c.id}" does not match level "${level}" (levels=${JSON.stringify(c.levels)})`);

          // events: 2..3
          const evs = plan.events || [];
          ok(evs.length >= 2 && evs.length <= 3, `${tag} expected 2-3 events, got ${evs.length}`);

          // why.course non-empty
          ok(plan.why && typeof plan.why.course === 'string' && plan.why.course.trim().length > 0,
            `${tag} why.course is empty`);

          // per-event: why non-empty + not dated in the past
          let hacks = 0;
          for (const e of evs) {
            const why = plan.why && plan.why.events ? plan.why.events[e.id] : '';
            ok(typeof why === 'string' && why.trim().length > 0, `${tag} why for event "${e.id}" is empty`);
            ok(!e.dateISO || e.dateISO >= TODAY, `${tag} event "${e.id}" is in the past (${e.dateISO} < ${TODAY})`);
            if (e.kind === 'hackathon') hacks++;
          }

          // max 1 hackathon unless goal is job/build
          if (goal !== 'job' && goal !== 'build') {
            ok(hacks <= 1, `${tag} ${hacks} hackathons chosen but max is 1 for goal "${goal}"`);
          }
        }

// ---------------------------------------------------------------------------
// (c) data schema validation
// ---------------------------------------------------------------------------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COST_ENUM = ['free', 'freemium', 'paid'];
const KIND_ENUM = ['talk', 'meetup', 'workshop', 'hackathon', 'study-group'];
const MODE_ENUM = ['online', 'in-person', 'hybrid'];
const isHttps = (u) => typeof u === 'string' && /^https:\/\//.test(u);
const nonEmptyArr = (v) => Array.isArray(v) && v.length > 0;

COURSES.forEach((c, i) => {
  const id = c && c.id ? c.id : `courses[${i}]`;
  ok(!!c.id, `course ${id}: missing id`);
  ok(!!c.title, `course ${id}: missing title`);
  ok(!!c.provider, `course ${id}: missing provider`);
  ok(isHttps(c.url), `course ${id}: url must be https (${c.url})`);
  ok(nonEmptyArr(c.levels), `course ${id}: levels[] missing/empty`);
  ok(nonEmptyArr(c.goals), `course ${id}: goals[] missing/empty`);
  ok(nonEmptyArr(c.motivations), `course ${id}: motivations[] missing/empty`);
  ok(nonEmptyArr(c.hoursFit), `course ${id}: hoursFit[] missing/empty`);
  ok(COST_ENUM.indexOf(c.cost) !== -1, `course ${id}: cost "${c.cost}" not in ${COST_ENUM.join('|')}`);
  ok(!!c.firstStep, `course ${id}: missing firstStep`);
});

EVENTS.forEach((e, i) => {
  const id = e && e.id ? e.id : `events[${i}]`;
  ok(!!e.id, `event ${id}: missing id`);
  ok(!!e.title, `event ${id}: missing title`);
  ok(!!e.org, `event ${id}: missing org`);
  ok(isHttps(e.url), `event ${id}: url must be https (${e.url})`);
  ok(DATE_RE.test(e.dateISO), `event ${id}: dateISO "${e.dateISO}" not YYYY-MM-DD`);
  ok(!!e.dateLabel, `event ${id}: missing dateLabel`);
  ok(MODE_ENUM.indexOf(e.mode) !== -1, `event ${id}: mode "${e.mode}" not in ${MODE_ENUM.join('|')}`);
  ok(KIND_ENUM.indexOf(e.kind) !== -1, `event ${id}: kind "${e.kind}" not in ${KIND_ENUM.join('|')}`);
  ok(nonEmptyArr(e.goals), `event ${id}: goals[] missing/empty`);
  ok(nonEmptyArr(e.motivations), `event ${id}: motivations[] missing/empty`);
});

ok(typeof EVENTS_UPDATED === 'string' && !isNaN(new Date(EVENTS_UPDATED)),
  `EVENTS_UPDATED missing/unparseable (${EVENTS_UPDATED})`);

// ---------------------------------------------------------------------------
// (d) static lint of js/app.js
// ---------------------------------------------------------------------------
const appSrc = read('js/app.js');

// esc() must be defined if used
if (/[^A-Za-z0-9_]esc\s*\(/.test(appSrc)) {
  ok(/function\s+esc\s*\(/.test(appSrc), 'app.js calls esc(...) but no `function esc(` definition found');
}

// no insecure http:// URLs (ignore XML namespace declarations)
appSrc.split('\n').forEach((line, n) => {
  const m = /http:\/\/(?!www\.w3\.org)/.exec(line);
  ok(!m, `app.js:${n + 1}: insecure http:// URL — ${line.trim().slice(0, 80)}`);
});

// no leftover TODO/FIXME
appSrc.split('\n').forEach((line, n) => {
  ok(!/\b(TODO|FIXME|XXX)\b/.test(line), `app.js:${n + 1}: leftover ${(/\b(TODO|FIXME|XXX)\b/.exec(line) || [])[0]} — ${line.trim().slice(0, 80)}`);
});

// getElementById('literal') must have a matching id source (best-effort).
// ids can be authored in index.html (static mount) or generated in app.js strings.
const definedIds = new Set();
const indexSrc = read('index.html');
for (const m of indexSrc.matchAll(/id="([^"]+)"/g)) definedIds.add(m[1]);         // static markup
for (const m of appSrc.matchAll(/id="([^"]+)"/g)) definedIds.add(m[1]);          // in HTML strings
for (const m of appSrc.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g)) definedIds.add(m[1]); // createElement().id = '...'
for (const m of appSrc.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
  ok(definedIds.has(m[1]), `app.js: getElementById('${m[1]}') has no matching id="${m[1]}" (or .id assignment)`);
}

// ---------------------------------------------------------------------------
report();
process.exit(failures.length ? 1 : 0);

function report() {
  console.log(`\nCurio QA harness`);
  console.log(`  combos exercised : ${combos} (144 intake × 3 locations expected = 432)`);
  console.log(`  courses          : ${COURSES ? COURSES.length : 0}`);
  console.log(`  events           : ${EVENTS ? EVENTS.length : 0}`);
  console.log(`  today (UTC)      : ${TODAY}`);
  if (failures.length) {
    console.log(`\n❌ ${failures.length} FAILURE(S) of ${assertions} assertions:\n`);
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('');
  } else {
    console.log(`\n✅ ALL PASS (${assertions} assertions)\n`);
  }
}
