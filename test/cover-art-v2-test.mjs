#!/usr/bin/env node
/* Curio — Cover Art v2 self-check (zero deps, Node >=16).
 * Run:  node test/cover-art-v2-test.mjs
 * Loads js/cover-art-v2.js in a vm sandbox with a {window} shim and asserts:
 *   1. determinism — same (seed,kind,opts) => byte-identical string
 *   2. kind -> motif mapping is by meaning (class="cover-<motif>")
 *   3. unknown kind => a stable seeded motif pick
 *   4. accent switch — opts.primary => --accent:var(--warm), else var(--mint)
 *   5. every colour is a CSS var (no raw hex leaks into the markup)
 *   6. lean markup (< 4096 chars) and scoped <style> (no global class leak)
 * ponytail: node:vm + {window} shim is the whole loader — same pattern as run-tests.mjs.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(path.join(ROOT, 'js/cover-art-v2.js'), 'utf8'), sandbox, { filename: 'cover-art-v2.js' });
const coverArt = sandbox.window.OnRampVisuals.coverArt;

const failures = [];
let n = 0;
const ok = (c, m) => { n++; if (!c) failures.push(m); };

// 1. determinism
ok(coverArt('course-101', 'course') === coverArt('course-101', 'course'), 'course seed not byte-identical');
ok(coverArt('evt-9', 'hackathon', { primary: true }) === coverArt('evt-9', 'hackathon', { primary: true }), 'primary seed not byte-identical');
ok(coverArt('a', 'meetup') !== coverArt('b', 'meetup'), 'different seeds produced identical art');

// 2. kind -> motif by meaning
const MAP = { course: 'strata', hackathon: 'streak', meetup: 'constellation', talk: 'lattice', workshop: 'ascent', 'study-group': 'constellation' };
for (const [kind, motif] of Object.entries(MAP))
  ok(coverArt('seed-' + kind, kind).includes('cover-' + motif), `${kind} did not map to ${motif}`);

// 3. unknown kind => stable seeded pick from the 5 motifs
const u1 = coverArt('x', 'podcast'), u2 = coverArt('x', 'podcast');
ok(u1 === u2, 'unknown kind not deterministic');
ok(/cover-(strata|streak|constellation|lattice|ascent)/.test(u1), 'unknown kind produced no valid motif');

// 4. accent switch: fills = mint / warm; strokes = accent-ink / warm
ok(coverArt('p', 'course', { primary: true }).includes('--accf:var(--warm)'), 'primary did not use warm fill');
ok(coverArt('p', 'course').includes('--accf:var(--mint)'), 'non-primary did not use mint fill');
ok(coverArt('p', 'course').includes('--accs:var(--accent-ink)'), 'non-primary stroke did not use accent-ink');

// 5. no raw hex colours in the markup (theme-aware = vars only)
const svg = coverArt('audit', 'meetup');
ok(!/#[0-9a-fA-F]{3,6}\b/.test(svg), 'raw hex colour leaked into SVG: ' + (svg.match(/#[0-9a-fA-F]{3,6}\b/) || [''])[0]);
ok(/var\(--mint\)|var\(--warm\)/.test(svg), 'no accent var present');
ok(svg.includes('feTurbulence'), 'grain filter (feTurbulence) missing');

// 6. lean + scoped
for (const [kind] of Object.entries(MAP)) {
  const m = coverArt('lean-' + kind, kind);
  ok(m.length < 4096, `${kind} markup too large: ${m.length} bytes`);
  ok(/#cv[0-9a-z]+ \.p\{/.test(m), `${kind} <style> not id-scoped (would leak globally)`);
}

if (failures.length) {
  console.error('FAIL (' + failures.length + '/' + n + '):\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('ALL PASS (' + n + ' assertions)');
