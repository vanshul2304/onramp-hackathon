/* Curio — micro-visuals.js
 * Supporting visual moments: the intake progress rail (Ascent), the browse
 * empty-state art (Constellation), and the plan-reveal choreography (Signal).
 * Zero deps, zero network. Colors are CSS custom properties inside the SVG so
 * the light/dark toggle restyles everything live. Inert until called.
 */
(function () {
  'use strict';
  var NS = (window.OnRampVisuals = window.OnRampVisuals || {});

  /* ---- 1. Progress rail — Ascent motif -------------------------------------
   * A rising path left→right. Completed waypoints are lit (accent-ink), the
   * current one glows mint, future ones are faint rings. Reads as "climbing
   * the on-ramp", not a generic bar. Structural + deterministic (no PRNG).
   * currentStep: 0-based index of the ACTIVE step (0..totalSteps-1). Clamped.
   */
  NS.progressRail = function (currentStep, totalSteps) {
    var n = Math.max(1, totalSteps | 0);
    var cur = Math.max(0, Math.min(n - 1, currentStep | 0));
    var W = 300, H = 60, padX = 16, padY = 13;
    function X(i) { return n === 1 ? W / 2 : padX + (i / (n - 1)) * (W - 2 * padX); }
    function Y(i) { return n === 1 ? H / 2 : (H - padY) - (i / (n - 1)) * (H - 2 * padY); }

    var faint = [], lit = [];
    for (var i = 0; i < n; i++) {
      var pt = X(i).toFixed(1) + ',' + Y(i).toFixed(1);
      faint.push(pt);
      if (i <= cur) lit.push(pt);
    }

    var s = '<svg class="rail-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg"'
      + ' fill="none" focusable="false" aria-hidden="true" preserveAspectRatio="none">';
    // faint full ramp
    s += '<polyline points="' + faint.join(' ') + '" stroke="var(--line)" stroke-width="2"'
      + ' stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>';
    // lit ramp up to (and including) the current step
    if (lit.length > 1) {
      s += '<polyline points="' + lit.join(' ') + '" stroke="var(--accent-ink)" stroke-width="2.4"'
        + ' stroke-linecap="round" stroke-linejoin="round"/>';
    }
    // waypoints
    for (var j = 0; j < n; j++) {
      var cx = X(j).toFixed(1), cy = Y(j).toFixed(1);
      if (j < cur) {
        // completed
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="var(--accent-ink)"/>';
      } else if (j === cur) {
        // current — mint glow (layered circles, no SVG filter)
        s += '<g class="rail-now">'
          + '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="var(--mint)" opacity="0.16"/>'
          + '<circle cx="' + cx + '" cy="' + cy + '" r="4.6" fill="var(--mint)" opacity="0.28"/>'
          + '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="var(--mint)"/>'
          + '</g>';
      } else {
        // future
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="2.6" fill="var(--bg)"'
          + ' stroke="var(--line)" stroke-width="1.4"/>';
      }
    }
    s += '</svg>';
    return s;
  };

  /* ---- 2. Empty state — Constellation motif --------------------------------
   * Points not yet connected: quiet, hopeful, small. One mint point (you),
   * the rest muted, a couple of faint unresolved arcs. Fixed layout (no seed
   * input on this contract), so deterministic by construction.
   */
  NS.emptyState = function () {
    var W = 220, H = 120;
    // hand-placed so it reads composed, not random
    var pts = [
      [34, 82], [70, 44], [104, 92], [138, 58], [176, 34], [190, 88], [58, 100]
    ];
    var you = 3; // the one lit point
    var s = '<svg class="const-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg"'
      + ' fill="none" focusable="false" aria-hidden="true">';
    // two faint, unresolved arcs — connection implied, not yet made
    s += '<path d="M70 44 Q104 30 138 58" stroke="var(--line)" stroke-width="1"'
      + ' stroke-dasharray="2 5" stroke-linecap="round" opacity="0.65"/>';
    s += '<path d="M104 92 Q150 88 176 34" stroke="var(--line)" stroke-width="1"'
      + ' stroke-dasharray="2 5" stroke-linecap="round" opacity="0.5"/>';
    for (var i = 0; i < pts.length; i++) {
      var cx = pts[i][0], cy = pts[i][1];
      if (i === you) {
        s += '<g class="const-you">'
          + '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="var(--mint)" opacity="0.16"/>'
          + '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="var(--mint)"/>'
          + '</g>';
      } else {
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="2.2" fill="var(--muted)" opacity="0.55"/>';
      }
    }
    s += '</svg>';
    return s;
  };

  /* ---- 3. Plan reveal — Signal choreography --------------------------------
   * One-shot entrance for the results screen: card elements resolve from a
   * brief scattered/faint state into their crisp final positions. ≤600ms
   * total, staggered. CSS-class driven — JS only applies classes + timing.
   * Full prefers-reduced-motion fallback: instant final state.
   */
  NS.planReveal = function (container) {
    if (!container) return;
    var items = container.querySelectorAll('.card, [data-reveal]');
    if (!items.length) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // markup already renders in its final state; do nothing

    var n = items.length;
    var DUR = 360;
    // cap the stagger so the last item still finishes within 600ms
    var stagger = Math.min(60, Math.floor((600 - DUR) / Math.max(1, n - 1)));

    for (var i = 0; i < n; i++) {
      var el = items[i];
      el.classList.add('pr-item', 'pr-cloaked');
      el.style.setProperty('--pr-d', (i * stagger) + 'ms');
      // deterministic sub-pixel scatter so cards drift in from noise, not a grid
      var dir = (i % 2 === 0) ? 1 : -1;
      el.style.setProperty('--pr-x', (dir * (4 + (i % 3) * 2)) + 'px');
    }
    void container.offsetWidth; // flush the cloaked state before revealing
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var k = 0; k < items.length; k++) items[k].classList.remove('pr-cloaked');
      });
    });
    // strip the transition + will-change once done — leaving will-change on
    // large cards keeps them promoted to GPU layers and can black out paints
    setTimeout(function () {
      for (var m = 0; m < items.length; m++) {
        items[m].classList.remove('pr-item');
        items[m].style.removeProperty('--pr-d');
        items[m].style.removeProperty('--pr-x');
      }
    }, DUR + stagger * (n - 1) + 120);
  };
})();

/* ponytail: self-check — run in a browser console or jsdom.
 * OnRampVisuals.progressRail(0,5) must lit-start, progressRail(4,5) full-lit.
 * assert(OnRampVisuals.progressRail(0,5).indexOf('rail-now') !== -1);
 * assert(OnRampVisuals.progressRail(9,5).indexOf('polyline') !== -1); // clamps, no throw
 * assert(OnRampVisuals.emptyState().indexOf('const-you') !== -1);
 */
