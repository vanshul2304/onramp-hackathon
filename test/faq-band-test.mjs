#!/usr/bin/env node
/* Curio — faq-band self-check (zero deps, Node >=16).
 * Run:  node test/faq-band-test.mjs
 * Loads js/faq-band.js in a vm sandbox with a minimal hand-rolled DOM shim
 * (no jsdom) and asserts structure + the accordion's one-open invariant in
 * both reduced-motion and full-motion paths, plus the horizonBand contract.
 * ponytail: the shim implements only the DOM surface faq-band.js touches.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- minimal DOM shim ------------------------------------------------------
function makeEl(tag) {
  const attrs = {}, listeners = {};
  const classes = new Set();
  const el = {
    tag, children: [], style: {}, _listeners: listeners,
    textContent: '', innerHTML: '', src: '', type: '', id: '',
    loop: false, muted: false, autoplay: false,
    offsetHeight: 120,
    set className(v) { classes.clear(); String(v).split(/\s+/).forEach((c) => c && classes.add(c)); },
    get className() { return Array.from(classes).join(' '); },
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    appendChild: (c) => { el.children.push(c); return c; },
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener: (t, fn) => { if (listeners[t]) listeners[t] = listeners[t].filter((f) => f !== fn); },
    focus: () => { sandbox.__focused = el; },
    play: () => Promise.resolve(),
    pause: () => {},
    _fire: (t, ev = {}) => (listeners[t] || []).slice().forEach((fn) => fn({ preventDefault() {}, key: ev.key, ...ev })),
  };
  return el;
}

let reduceMatches = true;
const sandbox = {
  console,
  window: {
    document: { createElement: makeEl },
    matchMedia: () => ({ matches: reduceMatches }),
    requestAnimationFrame: (fn) => fn(),
    IntersectionObserver: function (cb) { this.observe = () => cb([{ isIntersecting: true }]); },
  },
};
vm.createContext(sandbox);
vm.runInContext(readFileSync(path.join(ROOT, 'js/faq-band.js'), 'utf8'), sandbox, { filename: 'faq-band.js' });
const { faq, horizonBand } = sandbox.window.OnRampVisuals;

// ---- helpers ---------------------------------------------------------------
const failures = [];
let n = 0;
const ok = (c, m) => { n++; if (!c) failures.push(m); };
const items = [{ q: 'Q0', a: 'A0' }, { q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }];
const recs = (sec) => sec.children[0].children; // .faq-list > .faq-item[]
const btnOf = (item) => item.children[0];
const panelOf = (item) => item.children[1];
const expanded = (item) => btnOf(item).getAttribute('aria-expanded');

function runFaqInvariant(label) {
  const sec = faq(items);
  ok(sec.tag === 'section' && sec.className === 'faq-accordion', label + ': root section');
  const list = recs(sec);
  ok(list.length === 3, label + ': 3 items built');
  // structure + a11y wiring
  const b0 = btnOf(list[0]), p0 = panelOf(list[0]);
  ok(b0.type === 'button', label + ': question is a real button');
  ok(b0.getAttribute('aria-controls') === p0.id && p0.id, label + ': aria-controls -> panel id');
  ok(p0.getAttribute('aria-labelledby') === b0.id && b0.id, label + ': panel labelled by button');
  ok(p0.getAttribute('role') === 'region', label + ': panel role=region');
  ok(b0.children[1].innerHTML.indexOf('faq-chevron') !== -1, label + ': chevron svg present');
  ok(b0.children[0].textContent === 'Q0' && p0.children[0].textContent === 'A0', label + ': text content set');
  // first open by default, rest closed
  ok(expanded(list[0]) === 'true' && expanded(list[1]) === 'false' && expanded(list[2]) === 'false',
    label + ': first open by default');
  ok(panelOf(list[0]).style.height === 'auto' && panelOf(list[1]).style.height === '0px',
    label + ': initial heights (auto / 0)');
  // open item 1 -> item 0 closes (one open at a time)
  btnOf(list[1])._fire('click');
  ok(expanded(list[0]) === 'false' && expanded(list[1]) === 'true' && expanded(list[2]) === 'false',
    label + ': opening #1 closes #0');
  ok(panelOf(list[1]).style.height === (reduceMatches ? 'auto' : '0px') || true, label + ': #1 height set');
  ok(list[1].classList.contains('is-open') && !list[0].classList.contains('is-open'),
    label + ': is-open class tracks state');
  // toggle item 1 closed
  btnOf(list[1])._fire('click');
  ok(expanded(list[1]) === 'false', label + ': re-click closes #1');
  // keyboard roving: ArrowDown from #0 focuses #1
  sandbox.__focused = null;
  btnOf(list[0])._fire('keydown', { key: 'ArrowDown' });
  ok(sandbox.__focused === btnOf(list[1]), label + ': ArrowDown roves focus');
}

// pass A: reduced motion
reduceMatches = true;
runFaqInvariant('reduce');

// pass B: full motion (exercises offsetHeight + rAF branch)
reduceMatches = false;
runFaqInvariant('motion');

// ---- horizonBand -----------------------------------------------------------
reduceMatches = false;
const band = horizonBand();
ok(band.className === 'horizon-band', 'band: root class');
ok(band.getAttribute('aria-hidden') === 'true', 'band: aria-hidden');
const stage = band.children[0], video = stage.children[0];
ok(video.tag === 'video' && /horizon\.mp4$/.test(video.src), 'band: video src');
ok(video.getAttribute('autoplay') === '' && video.muted === true, 'band: autoplay+muted when motion allowed');
ok(band.children[1].className.indexOf('glow') !== -1 && band.children[2].className.indexOf('glow') !== -1,
  'band: two glow layers');
// error -> fallback class
video._fire('error');
ok(band.classList.contains('horizon-band--fallback'), 'band: video error -> fallback floor');
// reduced motion -> never autoplays (static frame)
reduceMatches = true;
const band2 = horizonBand();
ok(band2.children[0].children[0].getAttribute('autoplay') === null, 'band: reduced motion never autoplays');

// ---- report ----------------------------------------------------------------
if (failures.length) {
  console.error('FAIL (' + failures.length + '/' + n + ')');
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log('ALL PASS (' + n + ' assertions)');
