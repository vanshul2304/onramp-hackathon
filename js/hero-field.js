/* Curio — hero-field.js
 * The "Signal field": a generative, ambient hero background. Ascent (rising
 * contour strata receding to a horizon — the on-ramp) plus a sparse Lattice
 * (a few dim nodes near the path with one mint-lit focal node — intelligence
 * waiting along the way). Slow ambient drift, subtle pointer parallax, SVG
 * turbulence grain (in css/hero-field.css) kept as the material signature.
 *
 * Public API:  OnRampVisuals.heroField(containerEl, opts?) -> { destroy() }
 *   - opts.lattice: 'full' (default) | 'left' | 'none'
 *       'full' — current behavior: node cluster in the top-right, one mint focal
 *       'left' — cluster re-seated to the left half, focal DIMMED to a plain
 *                node (the orb becomes the single lit element; one focal point)
 *       'none' — no lattice at all (just the Ascent strata)
 *   - reads colors from CSS custom properties at runtime
 *   - restyles live when html[data-theme] changes (MutationObserver)
 *   - pauses via IntersectionObserver + document.visibilitychange
 *   - prefers-reduced-motion => one static frame, zero drift, no listeners
 *   - inert until called; safe to load in any order
 *
 * Canvas 2D, no dependencies, no network. Matches the vanilla style of app.js.
 */
(function () {
  'use strict';
  window.OnRampVisuals = window.OnRampVisuals || {};

  // --- tuning ---------------------------------------------------------------
  var LINES = 16;         // contour strata (horizon -> viewer)
  var SEG = 48;           // samples per contour
  var HORIZON = 0.40;     // horizon as fraction of height
  var DRIFT_MS = 24000;   // one full ambient cycle (>= 20s per spec)
  var PARALLAX = 0.06;    // lerp toward pointer target per frame

  // Sparse, hand-placed lattice near the path — intentional, not scattered.
  // Coords are fractions of (width, height). Focal node is index 1 (mint-lit).
  var NODES = [
    { x: 0.34, y: 0.34 },
    { x: 0.47, y: 0.22, focal: true },
    { x: 0.58, y: 0.37 },
    { x: 0.66, y: 0.26 },
    { x: 0.52, y: 0.44 }
  ];
  var EDGES = [[1, 0], [1, 2], [1, 3], [2, 4]]; // radiate from the focal node

  OnRampVisuals.heroField = function (container, opts) {
    if (!container) return { destroy: function () {} };
    opts = opts || {};
    var lattice = opts.lattice || 'full';   // 'full' | 'left' | 'none'

    // Working lattice for this instance (module NODES/EDGES stay canonical).
    // 'left' compresses xs (0.34..0.66) into the left half (~0.20..0.34) and
    // strips the focal flag so the focal node renders as a plain, dim node.
    var nodes, edges;
    if (lattice === 'none') {
      nodes = []; edges = [];
    } else if (lattice === 'left') {
      nodes = NODES.map(function (d) { return { x: 0.06 + d.x * 0.42, y: d.y }; });
      edges = EDGES;
    } else {
      nodes = NODES.map(function (d) { return { x: d.x, y: d.y, focal: d.focal }; });
      edges = EDGES;
    }

    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var root = document.documentElement;

    container.classList.add('signal-field');
    var canvas = document.createElement('canvas');
    canvas.className = 'signal-canvas';
    var grain = document.createElement('div');
    grain.className = 'signal-grain';
    container.appendChild(canvas);
    container.appendChild(grain);
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0, dpr = 1;
    var pal = {};
    var tx = 0, ty = 0, cx = 0, cy = 0;   // pointer target + eased current
    var t0 = 0, raf = 0, running = false;
    var onScreen = true;

    function css(name) {
      return getComputedStyle(root).getPropertyValue(name).trim() || '#888';
    }
    function readPalette() {
      pal.line = css('--line');
      pal.muted = css('--muted');
      pal.mint = css('--mint');
      pal.ink = css('--accent-ink'); // mint in dark, teal-ink in light
    }

    function resize() {
      var r = container.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(performance.now());
    }

    // Perspective y for stratum f in [0,1]: horizon (dense) -> viewer (sparse).
    function stratumY(f) {
      var horizon = H * HORIZON;
      return horizon + (H - horizon) * Math.pow(f, 1.7);
    }

    function draw(ts) {
      if (!t0) t0 = ts;
      var t = reduced ? 0 : (ts - t0);
      var drift = (t / DRIFT_MS) * Math.PI * 2;
      cx += (tx - cx) * PARALLAX;
      cy += (ty - cy) * PARALLAX;

      var horizon = H * HORIZON;
      var rise = (H - horizon) * 0.16;   // ascent: right edge lifts left->right
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;

      // --- Ascent: contour strata ---
      for (var i = 0; i < LINES; i++) {
        var f = i / (LINES - 1);
        var yb = stratumY(f);
        var amp = 2 + f * f * 16;                 // nearer strata undulate more
        var shift = cx * (6 + f * 34);            // nearer strata parallax more
        var vshift = cy * (3 + f * 16);
        ctx.beginPath();
        for (var s = 0; s <= SEG; s++) {
          var xx = s / SEG;
          var wave = Math.sin(xx * Math.PI * 4 + drift + f * 2.2) * amp +
                     Math.sin(xx * Math.PI * 2 - drift * 0.6 + i) * amp * 0.4;
          var x = xx * W + shift;
          var y = yb - rise * xx + wave + vshift;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        // nearer strata brighter; the two nearest hint the accent ink
        ctx.globalAlpha = 0.10 + f * 0.34;
        ctx.strokeStyle = (i >= LINES - 2) ? pal.ink : pal.line;
        ctx.stroke();
      }

      // --- Lattice: sparse edges then nodes, one mint-lit focal ---
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = pal.line;
      for (var e = 0; e < edges.length; e++) {
        var a = np(edges[e][0]), b = np(edges[e][1]);
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      }
      for (var n = 0; n < nodes.length; n++) {
        var p = np(n);
        if (nodes[n].focal) {
          var pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(drift);
          var gr = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, 26 * pulse);
          gr.addColorStop(0, pal.mint);
          gr.addColorStop(1, 'transparent');
          ctx.globalAlpha = 0.28 * pulse;
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(p.px, p.py, 26 * pulse, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = pal.mint;
          ctx.beginPath(); ctx.arc(p.px, p.py, 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.9; ctx.lineWidth = 1;
          ctx.strokeStyle = pal.ink;
          ctx.beginPath(); ctx.arc(p.px, p.py, 6, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = pal.muted;
          ctx.beginPath(); ctx.arc(p.px, p.py, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (running) raf = requestAnimationFrame(draw);
    }

    // Node pixel position, with a slow per-node bob and depth-scaled parallax.
    function np(i) {
      var d = nodes[i];
      var bob = reduced ? 0 : Math.sin((performance.now() / DRIFT_MS) * Math.PI * 2 + i * 1.7) * 3;
      var depth = 0.4 + d.y;   // higher (nearer horizon) => less parallax
      return {
        px: d.x * W + cx * 12 * depth,
        py: d.y * H + bob + cy * 8 * depth
      };
    }

    function start() {
      if (running || reduced || !onScreen || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(draw);
    }
    function stop() {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    // --- listeners ---
    var ro = new ResizeObserver(resize);
    ro.observe(container);

    var io = new IntersectionObserver(function (ents) {
      onScreen = ents[0].isIntersecting;
      if (onScreen) start(); else stop();
    }, { threshold: 0 });
    io.observe(container);

    function onVis() { if (document.hidden) stop(); else start(); }
    document.addEventListener('visibilitychange', onVis);

    var mo = new MutationObserver(function () {
      readPalette();
      if (!running) draw(performance.now());  // repaint static/reduced frame
    });
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    function onPointer(ev) {
      tx = ev.clientX / window.innerWidth - 0.5;
      ty = ev.clientY / window.innerHeight - 0.5;
    }
    if (!reduced && finePointer) window.addEventListener('pointermove', onPointer);

    // --- boot ---
    readPalette();
    resize();          // paints one frame
    start();           // IO also triggers, but start() is idempotent

    // Optional self-check: add data-selftest to the container to run assertions.
    if (container.hasAttribute('data-selftest')) selfTest();

    return {
      destroy: function () {
        stop();
        ro.disconnect(); io.disconnect(); mo.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        if (!reduced && finePointer) window.removeEventListener('pointermove', onPointer);
        if (canvas.parentNode) container.removeChild(canvas);
        if (grain.parentNode) container.removeChild(grain);
        container.classList.remove('signal-field');
      }
    };

    // Math sanity: strata monotonic + bounded to the field; nodes in [0,1].
    function selfTest() {
      var ok = true, prev = -Infinity;
      for (var i = 0; i < LINES; i++) {
        var y = stratumY(i / (LINES - 1));
        if (y < prev - 0.001 || y < H * HORIZON - 0.001 || y > H + 0.001) ok = false;
        prev = y;
      }
      for (var n = 0; n < nodes.length; n++) {
        var d = nodes[n];
        if (d.x < 0 || d.x > 1 || d.y < 0 || d.y > 1) ok = false;
      }
      // edges must reference in-range nodes
      for (var e = 0; e < edges.length; e++) {
        if (edges[e][0] >= nodes.length || edges[e][1] >= nodes.length) ok = false;
      }
      // one focal for 'full'; zero for 'left' (dimmed) and 'none' (empty)
      var focals = nodes.filter(function (d) { return d.focal; }).length;
      var wantFocal = lattice === 'full' ? 1 : 0;
      if (focals !== wantFocal) ok = false;
      if (lattice === 'none' && (nodes.length || edges.length)) ok = false;
      console.assert(ok, 'heroField selftest FAILED', { W: W, H: H, lattice: lattice });
      if (ok) console.log('heroField selftest OK');
    }
  };
})();
