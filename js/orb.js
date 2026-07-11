/* Curio — orb.js
 * The masked-video sphere ("Orb" wave). Ported from the Next.js reference
 * (templates/HomePage/Hero/index.tsx:35-51) to vanilla, both themes.
 *
 * Public API:  OnRampVisuals.orb(opts) -> HTMLElement
 *   opts.size      css length for the circle (default '26rem')
 *   opts.className extra class(es) on the root element
 *   opts.selftest  run structural assertions (dev only)
 *
 * The returned element is self-contained decor: aria-hidden, pointer-events
 * off (via css). Lifecycle handled internally:
 *   - IntersectionObserver pauses/plays the video off/on screen
 *   - prefers-reduced-motion never plays (static first frame + glows still show)
 *   - video load failure -> .onramp-orb--fallback (rim + glows + radial tint)
 *
 * No dependencies, no network beyond the local mp4. Styling in css/orb.css.
 */
(function () {
  'use strict';
  window.OnRampVisuals = window.OnRampVisuals || {};

  var SRC = 'assets/videos/orb.mp4';

  OnRampVisuals.orb = function (opts) {
    opts = opts || {};
    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var el = document.createElement('div');
    el.className = 'onramp-orb' + (opts.className ? ' ' + opts.className : '');
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--orb-size', opts.size || '26rem');
    el.innerHTML =
      '<div class="onramp-orb__glow onramp-orb__glow--a"></div>' +
      '<div class="onramp-orb__glow onramp-orb__glow--b"></div>' +
      '<div class="onramp-orb__sphere">' +
        '<div class="onramp-orb__video"><video></video></div>' +
        '<div class="onramp-orb__rim"></div>' +
      '</div>';

    var video = el.querySelector('video');
    // Attributes required for inline autoplay on mobile Safari/Chrome.
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.preload = 'auto';   // load the first frame even when we won't play

    var failed = false;
    function onFail() {
      if (failed) return;
      failed = true;
      el.classList.add('onramp-orb--fallback');
      if (io) io.disconnect();
    }
    video.addEventListener('error', onFail);
    video.addEventListener('stalled', onFail);

    function play() {
      if (reduced || failed) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () {}); // ignore autoplay-policy rejects
    }
    function pause() { try { video.pause(); } catch (e) {} }

    if (!reduced) {
      video.autoplay = true;
      video.setAttribute('autoplay', '');
    }
    video.src = SRC;

    // Pause off-screen, play on-screen (skip entirely under reduced motion).
    var io = null;
    if (!reduced && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (ents) {
        if (ents[0].isIntersecting) play(); else pause();
      }, { threshold: 0.01 });
      io.observe(el); // fires once the caller inserts el into the DOM
    }

    if (opts.selftest) selfTest(el);
    return el;
  };

  // Structural sanity: the pieces the css contract depends on exist.
  function selfTest(el) {
    var ok =
      el.getAttribute('aria-hidden') === 'true' &&
      el.querySelectorAll('.onramp-orb__glow').length === 2 &&
      !!el.querySelector('.onramp-orb__sphere') &&
      !!el.querySelector('.onramp-orb__video video') &&
      !!el.querySelector('.onramp-orb__rim') &&
      !!el.style.getPropertyValue('--orb-size');
    console.assert(ok, 'orb selftest FAILED');
    if (ok) console.log('orb selftest OK');
  }
})();
