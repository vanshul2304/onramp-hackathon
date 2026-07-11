/* Curio — Cover Art v2 ("Signal")
 * Deterministic, seeded SVG banner art for course & event cards. The motif is
 * chosen by MEANING (kind → motif), not randomly; the seed drives composition
 * variance within a motif so every card is unique but recognizably one family.
 *
 * Public API (attaches to window.OnRampVisuals):
 *   OnRampVisuals.coverArt(seedString, kind, opts) -> svgMarkupString
 *     kind: 'course'|'hackathon'|'meetup'|'talk'|'workshop'|anything-else
 *     opts: { primary?: boolean }   // primary => the one warm "act now" accent
 *
 * Contract notes:
 *  - Same (seed, kind, opts) -> BYTE-IDENTICAL string, forever. No global
 *    counters, no Date/Math.random: ids derive from the seed hash.
 *  - ALL colors are CSS custom properties (var(--…)) so the html[data-theme]
 *    toggle restyles every card live with zero JS and zero re-render.
 *  - One lit accent element per composition: mint normally, warm iff opts.primary.
 *  - Turbulence grain filter is kept as the material signature. SVG < ~4KB.
 *
 * ponytail: PRNG + hash copied from js/app.js coverArt() (2 tiny fns) so this
 * module is standalone — no load-order dependency on app.js.
 */
(function () {
  var V = (window.OnRampVisuals = window.OnRampVisuals || {});

  // FNV-1a string hash (identical to js/app.js hashStr).
  function hashStr(s) {
    var h = 2166136261 >>> 0; s = String(s == null ? '' : s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Seeded PRNG (identical to js/app.js rngFrom): pure fn of the seed.
  function rngFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function n0(x) { return Math.round(x); }
  function f1(x) { return x.toFixed(1); }
  function f2(x) { return x.toFixed(2); }

  // kind -> motif (by MEANING). Unknown kinds fall through to a seeded pick.
  var KIND2MOTIF = {
    course: 'strata',        // layered learning planes
    hackathon: 'streak',     // momentum
    meetup: 'constellation', // community point clusters
    'study-group': 'constellation',
    community: 'constellation',
    talk: 'lattice',         // sparse lit-node intelligence mesh
    workshop: 'ascent'       // rising contours / the ramp
  };
  var MOTIFS = ['strata', 'streak', 'constellation', 'lattice', 'ascent'];

  // ---- motif generators: each is a pure fn of the seeded rng r() ----------
  // Neutral marks use var(--line)/var(--muted); exactly ONE element uses the
  // accent (class "a" filled or "al" stroked). Depth = layering + opacity.
  var GEN = {
    // STRATA — translucent stacked planes, one lit top edge. (learning)
    strata: function (r) {
      var s = '', n = 5, lit = 1 + Math.floor(r() * 3), litD = '';
      for (var i = 0; i < n; i++) {
        var y = 150 - i * 24 - r() * 6, skew = r() * 26 - 13, h = 30;
        var yl = y, yr = y - skew;
        s += '<path class="p" fill-opacity="' + f2(0.10 + i * 0.07) +
          '" d="M-20 ' + n0(yl) + ' L420 ' + n0(yr) + ' L420 ' + n0(yr + h) + ' L-20 ' + n0(yl + h) + ' Z"/>';
        if (i === lit) litD = 'M-20 ' + n0(yl) + ' L420 ' + n0(yr);
      }
      return s + '<path class="al" stroke-width="2" stroke-opacity=".9" d="' + litD + '"/>';
    },
    // STREAK — tapered velocity lines rising right, one lit. (momentum)
    streak: function (r) {
      var s = '', n = 7, lit = Math.floor(r() * n);
      for (var i = 0; i < n; i++) {
        var y = 28 + i * 22 + r() * 6;
        var x0 = n0(-20 + r() * 80), x1 = n0(x0 + 160 + r() * 240);
        var y2 = n0(y - (6 + r() * 26)), w = 1 + r() * 3.4, rop = r();
        var isL = i === lit;
        s += '<polygon class="' + (isL ? 'a' : 'p') + '" fill-opacity="' + (isL ? '.95' : f2(0.14 + rop * 0.3)) +
          '" points="' + x0 + ' ' + f1(y - 0.4) + ' ' + x1 + ' ' + f1(y2 - w / 2) +
          ' ' + x1 + ' ' + f1(y2 + w / 2) + ' ' + x0 + ' ' + f1(y + 0.4) + '"/>';
      }
      return s;
    },
    // CONSTELLATION — 2–3 point clusters + faint connective arcs. (community)
    constellation: function (r) {
      var s = '', clusters = 2 + Math.floor(r() * 2), pts = [];
      for (var c = 0; c < clusters; c++) {
        var cx = 40 + r() * 320, cy = 30 + r() * 140, cnt = 3 + Math.floor(r() * 4);
        for (var i = 0; i < cnt; i++) pts.push([n0(cx + (r() * 60 - 30)), n0(cy + (r() * 50 - 25))]);
      }
      for (var j = 1; j < pts.length; j++) {
        var draw = r() < 0.5, a = pts[j - 1], b = pts[j];
        if (!draw) continue;
        var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 18 - r() * 20;
        s += '<path class="e" stroke-opacity=".28" d="M' + a[0] + ' ' + a[1] + ' Q' + n0(mx) + ' ' + n0(my) + ' ' + b[0] + ' ' + b[1] + '"/>';
      }
      var lit = Math.floor(r() * pts.length);
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        s += k === lit
          ? '<circle class="a" cx="' + p[0] + '" cy="' + p[1] + '" r="4.5"/>'
          : '<circle class="n" cx="' + p[0] + '" cy="' + p[1] + '" r="' + f1(1.6 + r() * 2) + '" fill-opacity="' + f2(0.4 + r() * 0.4) + '"/>';
      }
      return s;
    },
    // LATTICE — sparse jittered node-and-edge mesh, few lit nodes. (intelligence)
    lattice: function (r) {
      var s = '', cols = 6, rows = 3, pts = [];
      for (var gy = 0; gy < rows; gy++) for (var gx = 0; gx < cols; gx++)
        pts.push([n0(30 + gx * 68 + (r() * 24 - 12)), n0(40 + gy * 55 + (r() * 20 - 10)), gx, gy]);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (p[2] < cols - 1 && r() < 0.5) { var q = pts[i + 1]; s += '<path class="e" stroke-opacity=".22" d="M' + p[0] + ' ' + p[1] + ' L' + q[0] + ' ' + q[1] + '"/>'; }
        if (p[3] < rows - 1 && r() < 0.4) { var q2 = pts[i + cols]; s += '<path class="e" stroke-opacity=".22" d="M' + p[0] + ' ' + p[1] + ' L' + q2[0] + ' ' + q2[1] + '"/>'; }
      }
      var lit = Math.floor(r() * pts.length);
      for (var k = 0; k < pts.length; k++) {
        var pk = pts[k];
        s += k === lit
          ? '<circle class="a" cx="' + pk[0] + '" cy="' + pk[1] + '" r="4"/>'
          : '<circle class="n" cx="' + pk[0] + '" cy="' + pk[1] + '" r="2" fill-opacity="' + f2(0.3 + r() * 0.4) + '"/>';
      }
      return s;
    },
    // ASCENT — rising contour lines left→right, one lit ramp. (progress)
    ascent: function (r) {
      var s = '', n = 4, lit = Math.floor(r() * n);
      for (var i = 0; i < n; i++) {
        var base = 170 - i * 30, amp = 8 + r() * 10, ph = r() * 6, climb = 70 + r() * 30;
        var d = 'M-20 ' + n0(base);
        for (var x = 0; x <= 420; x += 30) d += ' L' + x + ' ' + n0(base - (x / 420) * climb + Math.sin(x / 60 + ph) * amp);
        var isL = i === lit;
        s += '<path class="' + (isL ? 'al' : 'e') + '" stroke-width="' + (isL ? 2.4 : 1.5) +
          '" stroke-opacity="' + (isL ? '.9' : f2(0.25 + i * 0.12)) + '" d="' + d + '"/>';
      }
      return s;
    }
  };

  V.coverArt = function (seedString, kind, opts) {
    opts = opts || {};
    var h = hashStr(seedString + '|' + kind);
    var r = rngFrom(h);
    var motif = KIND2MOTIF[kind] || MOTIFS[h % MOTIFS.length];
    var id = 'cv' + h.toString(36);
    // Accent has two channels so it stays legible in BOTH themes (spec rule):
    //  - fills stay var(--mint) (identity accent, fixed across themes)
    //  - stroked "outline" accents use var(--accent-ink), which light-mode
    //    remaps to a contrast-safe teal-ink (in dark it IS mint).
    // Warm (primary "act now") is already theme-adjusted by the --warm token.
    var accFill = opts.primary ? 'var(--warm)' : 'var(--mint)';
    var accStroke = opts.primary ? 'var(--warm)' : 'var(--accent-ink)';
    // ambient glow position from the hash (does NOT consume r — keeps motif
    // rng sequence stable regardless of glow).
    var gx = (h % 66) + 12, gy = ((h >>> 8) % 46) + 14;

    // Scoped <style> (prefixed by the svg id) so class rules never leak to the
    // document. --accent is the single switch for mint vs warm.
    var css = '#' + id + '{--accf:' + accFill + ';--accs:' + accStroke + '}' +
      '#' + id + ' .p{fill:var(--line)}' +
      '#' + id + ' .n{fill:var(--muted)}' +
      '#' + id + ' .e{stroke:var(--line);fill:none;stroke-width:1.5}' +
      '#' + id + ' .a{fill:var(--accf)}' +
      '#' + id + ' .al{stroke:var(--accs);fill:none}';

    return '<svg id="' + id + '" class="cover-art cover-' + motif +
      '" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<style>' + css + '</style>' +
        '<linearGradient id="' + id + 'bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--surface)"/><stop offset="1" style="stop-color:var(--bg)"/></linearGradient>' +
        '<radialGradient id="' + id + 'gl" cx="' + gx + '%" cy="' + gy + '%" r="72%"><stop offset="0" style="stop-color:var(--surface-2)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--surface-2)" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="' + id + 'fd" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" style="stop-color:var(--surface)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--surface)" stop-opacity=".85"/></linearGradient>' +
        '<filter id="' + id + 'n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 0"/></filter>' +
      '</defs>' +
      '<rect width="400" height="200" fill="url(#' + id + 'bg)"/>' +
      '<rect width="400" height="200" fill="url(#' + id + 'gl)"/>' +
      '<g>' + GEN[motif](r) + '</g>' +
      '<rect width="400" height="200" filter="url(#' + id + 'n)" opacity=".05"/>' +
      '<rect width="400" height="200" fill="url(#' + id + 'fd)"/>' +
    '</svg>';
  };
})();
