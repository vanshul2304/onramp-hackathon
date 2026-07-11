#!/usr/bin/env node
/* Curio — scripts/refresh-events.mjs
 * Regenerates data/events.js every 6h (GitHub Action, ubuntu-latest, Node 20+, zero deps).
 *
 * Sources (both verified 2026-07-11 with plain fetch — no headless browser needed):
 *  1. Devpost JSON API:
 *     https://devpost.com/api/hackathons?challenge_type[]=online&status[]=open&themes[]=Machine%20Learning%2FAI
 *     → { hackathons: [{ title, url, open_state, submission_period_dates, themes, ... }] }
 *  2. Luma calendar pages (server-rendered Next.js): fetch HTML, extract the
 *     <script id="__NEXT_DATA__"> JSON, read props.pageProps.initialData.data.featured_items
 *     → [{ event: { name, start_at, location_type, url(slug), geo_address_info } }]
 *     location_type: "offline" = in-person; "zoom"/"meet"/"unknown" = online.
 *
 * Merge: fresh scraped + carry-forward of still-future, still-resolving events from the
 * current data/events.js (existing curated entries win URL-dedupe over fresh heuristic ones).
 * Safety: never overwrites with <8 events; writes temp file, eval-validates, then renames.
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'events.js');
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const TODAY = new Date().toISOString().slice(0, 10);
const MAX = new Date(Date.now() + 60 * 86400e3).toISOString().slice(0, 10); // today..+60d

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function dateLabel(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return `${DAYS[d.getUTCDay()]} · ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
const inWindow = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= TODAY && iso <= MAX;

async function get(url, opts = {}) {
  return fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(15000), ...opts });
}

/* ---------- tagging heuristics (title-only; Luma payload has no description) ----------
 * kind:        hackathon > workshop (hands-on words) > study-group > talk (listen-only words) > meetup
 * prepTopic:   first keyword bucket that matches; unsure → "fundamentals"
 * beginnerSafe: ONLY when the title itself signals open/intro level; unsure → false
 * goals/motivations: derived from kind + career words; defaults understand/curious
 */
function tag(title) {
  const t = title.toLowerCase();
  const kind =
    /hackathon|hack night|buildathon|build challenge/.test(t) ? 'hackathon' :
    /study group|paper club|reading group|book club/.test(t) ? 'study-group' :
    /workshop|masterclass|bootcamp|hands-on|lunch & hack|build your|build an|build with/.test(t) ? 'workshop' :
    /webinar|roundtable|panel|fireside|keynote|talk|demo day|showcase|forum|town hall|discussion|session|effect|future of/.test(t) ? 'talk' :
    'meetup';
  const prepTopic =
    /agent/.test(t) ? 'agents' :
    /prompt/.test(t) ? 'prompting' :
    /python/.test(t) ? 'python' :
    /no.?code|low.?code|vibe cod|base44|bubble|zapier|n8n/.test(t) ? 'no-code' :
    /career|job|hiring|resume|future of work|upskill/.test(t) ? 'career' :
    /\bdata\b|analytics|copilot.*fabric|sql/.test(t) ? 'data' :
    /\bart\b|creative|music|design|image|video|media/.test(t) ? 'creative' :
    /llm|\brag\b|claude|gpt|gemini|api|copilot|chatbot/.test(t) ? 'llm-apps' :
    /machine learning|\bml\b|model|fine.?tun|neural/.test(t) ? 'ml' :
    'fundamentals';
  const beginnerSafe = /beginner|first.?timer|intro\b|101|all levels|everyone|all are welcome|no experience|getting started|newbie|curious|study group/.test(t);
  const goals = kind === 'hackathon' || kind === 'workshop' ? ['build']
    : prepTopic === 'career' ? ['job', 'switch'] : ['understand'];
  const motivations = kind === 'hackathon' ? ['compete', 'curious']
    : kind === 'meetup' || kind === 'study-group' ? ['belong', 'curious'] : ['curious'];
  return {
    kind, prepTopic, beginnerSafe, goals, motivations,
    beginnerNote: beginnerSafe ? 'The event page pitches this as open to newcomers — no prerequisites listed, come as you are.' : ''
  };
}

/* ---------- source: Devpost ---------- */
async function fetchDevpost() {
  const r = await get('https://devpost.com/api/hackathons?challenge_type[]=online&status[]=open&themes[]=Machine%20Learning%2FAI');
  if (!r.ok) throw new Error(`devpost ${r.status}`);
  const { hackathons = [] } = await r.json();
  const out = [];
  for (const h of hackathons) {
    if (h.open_state !== 'open' || h.invite_only) continue;
    // "submission_period_dates": "Jul 06 - Aug 17, 2026" or "Jul 06 - 12, 2026"
    const m = /-\s*(?:([A-Za-z]{3})[a-z]*\s+)?(\d{1,2}),\s*(\d{4})$/.exec(h.submission_period_dates || '');
    const sm = /^([A-Za-z]{3})/.exec(h.submission_period_dates || '');
    if (!m || !sm) continue;
    const mon = MONTHS.indexOf(m[1] || sm[1]);
    if (mon < 0) continue;
    const dateISO = `${m[3]}-${String(mon + 1).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
    if (!inWindow(dateISO)) continue;
    const t = tag(h.title + ' hackathon');
    out.push({
      id: 'devpost-' + new URL(h.url).hostname.split('.')[0],
      title: h.title, org: h.organization_name || 'Devpost', url: h.url, source: 'devpost',
      dateISO, dateLabel: `Open now · ends ${MONTHS[mon]} ${+m[2]}`,
      mode: 'online', city: null, ...t, kind: 'hackathon', free: true
    });
  }
  return out;
}

/* ---------- source: Luma calendars ---------- */
const LUMA_CALENDARS = [
  ['https://luma.com/genai-collective', 'The AI Collective'],
  ['https://luma.com/ls', 'Latent.Space'],
  ['https://luma.com/claudecommunity', 'Claude Community'],
];

async function fetchLumaCalendar(url, org) {
  const r = await get(url);
  if (!r.ok) throw new Error(`luma ${url} ${r.status}`);
  const html = await r.text();
  const m = /<script id="__NEXT_DATA__" type="application\/json"[^>]*>(.*?)<\/script>/s.exec(html);
  if (!m) throw new Error(`luma ${url}: no __NEXT_DATA__`);
  const items = JSON.parse(m[1])?.props?.pageProps?.initialData?.data?.featured_items || [];
  const out = [];
  for (const { event: e } of items) {
    if (!e?.name || !e.start_at || !e.url) continue;
    const dateISO = e.start_at.slice(0, 10);
    if (!inWindow(dateISO)) continue;
    const offline = e.location_type === 'offline';
    out.push({
      id: 'luma-' + e.url, title: e.name, org, url: 'https://luma.com/' + e.url, source: 'luma',
      dateISO, dateLabel: dateLabel(dateISO),
      mode: offline ? 'in-person' : 'online',
      city: offline ? (e.geo_address_info?.city_state || null) : null,
      ...tag(e.name),
      free: true // ponytail: featured_items payload carries no price; Luma community events default free
    });
  }
  return out;
}

/* ---------- carry-forward from current file ---------- */
function readExisting() {
  if (!existsSync(OUT)) return [];
  try {
    const window = {};
    eval(readFileSync(OUT, 'utf8'));
    return (window.EVENTS || []).filter(e => e.dateISO >= TODAY && e.dateISO <= MAX);
  } catch (err) {
    console.warn('warn: could not parse existing events.js:', err.message);
    return [];
  }
}

async function urlAlive(url) {
  try {
    let r = await get(url, { method: 'HEAD' });
    if (r.status === 405) r = await get(url); // some hosts reject HEAD
    return r.status < 400 || r.status === 403; // 403 = anti-bot but page exists
  } catch { return false; }
}

/* ---------- validation (SPEC schema) ---------- */
const REQUIRED = ['id','title','org','url','source','dateISO','dateLabel','mode','city','kind','beginnerSafe','beginnerNote','prepTopic','goals','motivations','free'];
const TOPICS = ['fundamentals','prompting','python','ml','llm-apps','agents','no-code','career','data','creative'];
const KINDS = ['meetup','workshop','hackathon','talk','study-group'];
const MODES = ['online','in-person','hybrid'];

function validEvent(e) {
  return REQUIRED.every(k => k in e) &&
    typeof e.id === 'string' && e.id && typeof e.title === 'string' && e.title &&
    /^https:\/\//.test(e.url) && inWindow(e.dateISO) &&
    MODES.includes(e.mode) && KINDS.includes(e.kind) && TOPICS.includes(e.prepTopic) &&
    typeof e.beginnerSafe === 'boolean' && typeof e.free === 'boolean' &&
    Array.isArray(e.goals) && e.goals.length && Array.isArray(e.motivations) && e.motivations.length;
}

/* ---------- main ---------- */
const results = await Promise.allSettled([
  fetchDevpost(),
  ...LUMA_CALENDARS.map(([u, o]) => fetchLumaCalendar(u, o)),
]);
const fresh = [];
results.forEach((r, i) => {
  const name = i === 0 ? 'devpost' : LUMA_CALENDARS[i - 1][0];
  if (r.status === 'fulfilled') { console.log(`ok  ${name}: ${r.value.length} events`); fresh.push(...r.value); }
  else console.warn(`FAIL ${name}: ${r.reason.message}`); // a failed source just contributes 0
});

// carry forward existing events whose URL still resolves
const existing = readExisting();
const aliveFlags = await Promise.all(existing.map(e => urlAlive(e.url)));
const carried = existing.filter((_, i) => aliveFlags[i]);
console.log(`carry-forward: ${carried.length}/${existing.length} existing events still future + alive`);

// dedupe by URL — curated existing entries beat fresh heuristic ones
const byUrl = new Map();
for (const e of [...carried, ...fresh]) if (!byUrl.has(e.url)) byUrl.set(e.url, e);
const all = [...byUrl.values()].filter(validEvent);

// cap at 24: carried events (curated tags) are kept over fresh (heuristic tags);
// remaining slots fill nearest-date-first, then present the lot sorted by date
const carriedUrls = new Set(carried.map(e => e.url));
const merged = all.filter(e => carriedUrls.has(e.url)).slice(0, 24);
for (const e of all.filter(e => !carriedUrls.has(e.url)).sort((a, b) => a.dateISO.localeCompare(b.dateISO))) {
  if (merged.length >= 24) break;
  merged.push(e);
}
merged.sort((a, b) => a.dateISO.localeCompare(b.dateISO));

console.log(`merged: ${merged.length} valid events`);

// SAFETY: never replace good data with a thin scrape
if (merged.length < 8) {
  console.warn(`WARNING: only ${merged.length} events (<8) — keeping existing data/events.js untouched.`);
  process.exit(0);
}

const body =
  `window.EVENTS_UPDATED = ${JSON.stringify(new Date().toISOString())};\n` +
  `// data/events.js — auto-generated by scripts/refresh-events.mjs. Do not hand-edit;\n` +
  `// curated fields survive refreshes only while the event is future + its URL resolves.\n` +
  `window.EVENTS = ${JSON.stringify(merged, null, 2)};\n`;

// validate the generated file text itself before touching events.js
{
  const window = {};
  eval(body);
  if (!Array.isArray(window.EVENTS) || !window.EVENTS.every(validEvent) || !window.EVENTS_UPDATED)
    throw new Error('generated file failed self-validation — aborting without writing');
}

const tmp = OUT + '.tmp';
writeFileSync(tmp, body);
renameSync(tmp, OUT); // atomic-ish: events.js is never half-written
console.log(`wrote ${OUT}: ${merged.length} events (updated ${new Date().toISOString()})`);
