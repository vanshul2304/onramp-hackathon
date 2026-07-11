/* Curio — faq-band.js  ("Orb" wave)
 * Two ported visuals, vanilla + zero deps, inert until called:
 *   OnRampVisuals.horizonBand() -> HTMLElement   (Start's rotated video floor)
 *   OnRampVisuals.faq(items)    -> HTMLElement   (Faq/Item accordion)
 * Colors/theming live in css/faq-band.css via :root tokens; JS never hardcodes
 * hex. Both respect prefers-reduced-motion and pause off-screen.
 */
(function () {
  'use strict';
  var NS = (window.OnRampVisuals = window.OnRampVisuals || {});
  var doc = window.document;

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // reused inline chevron (ported from components/Faq/Item/index.tsx)
  var CHEVRON =
    '<svg class="faq-chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path d="M5.646 7.646a.5.5 0 0 1 .707 0L10 11.293l3.646-3.647a.5.5 0 0 1 .638-.058l.069.058a.5.5 0 0 1 0 .707l-4 4a.5.5 0 0 1-.707 0l-4-4a.5.5 0 0 1 0-.707z"/></svg>';

  /* ---- 1. Horizon band — ported Start video floor --------------------------
   * A decor layer meant to be prepended inside a position:relative CTA section.
   * A wide video is rotated ~12deg and clipped by a radial mask (css) so it
   * reads as a glowing horizon receding under the content, plus two mint glows.
   * Lifecycle: IntersectionObserver pause/play; prefers-reduced-motion never
   * plays (static frame); video error -> css fallback = radial mint floor.
   */
  NS.horizonBand = function () {
    var reduce = prefersReduced();

    var band = doc.createElement('div');
    band.className = 'horizon-band';
    band.setAttribute('aria-hidden', 'true');

    var stage = doc.createElement('div');
    stage.className = 'horizon-band__stage';

    var video = doc.createElement('video');
    video.className = 'horizon-band__video';
    video.src = 'assets/videos/horizon.mp4';
    video.loop = true;
    video.muted = true;                       // property + attribute: autoplay policy
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'auto');
    if (!reduce) { video.autoplay = true; video.setAttribute('autoplay', ''); }
    // video missing / decode failure -> fall back to the css radial floor
    video.addEventListener('error', function () { band.classList.add('horizon-band--fallback'); });
    stage.appendChild(video);
    band.appendChild(stage);

    var gL = doc.createElement('span'); gL.className = 'horizon-band__glow horizon-band__glow--l';
    var gR = doc.createElement('span'); gR.className = 'horizon-band__glow horizon-band__glow--r';
    band.appendChild(gL);
    band.appendChild(gR);

    if (reduce) {
      try { video.pause(); } catch (e) {}       // static frame, never drifts
    } else if (typeof window.IntersectionObserver === 'function') {
      var io = new window.IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {}); // autoplay-block is fine
          } else {
            video.pause();
          }
        }
      }, { threshold: 0.01 });
      io.observe(band);
    }
    return band;
  };

  /* ---- 2. FAQ accordion — ported Faq/Item ----------------------------------
   * Hairline-bordered rows, rotating chevron, one item open at a time, first
   * open by default. Height animates via the measured-scrollHeight technique
   * (no libs). Full keyboard: real buttons (Enter/Space), aria-expanded /
   * aria-controls, arrow/Home/End roving. prefers-reduced-motion -> instant.
   * items: [{q, a}] -> HTMLElement
   */
  NS.faq = function (items) {
    items = items || [];
    var reduce = prefersReduced();
    var uid = 'faq-' + Math.random().toString(36).slice(2, 8);

    var section = doc.createElement('section');
    section.className = 'faq-accordion';
    var list = doc.createElement('div');
    list.className = 'faq-list';
    section.appendChild(list);

    var records = []; // { item, btn, panel, inner }

    function setOpen(rec, open) {
      rec.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) rec.item.classList.add('is-open'); else rec.item.classList.remove('is-open');
      var panel = rec.panel;
      if (reduce) { panel.style.height = open ? 'auto' : '0px'; return; }
      if (open) {
        panel.style.height = rec.inner.offsetHeight + 'px';
        // settle to auto once expanded so content/resize stays correct
        var onEnd = function () {
          if (rec.item.classList.contains('is-open')) panel.style.height = 'auto';
          panel.removeEventListener('transitionend', onEnd);
        };
        panel.addEventListener('transitionend', onEnd);
      } else {
        panel.style.height = rec.inner.offsetHeight + 'px'; // auto -> fixed px
        void panel.offsetHeight;                            // reflow, then to 0
        window.requestAnimationFrame(function () { panel.style.height = '0px'; });
      }
    }

    function toggle(rec) {
      var willOpen = rec.btn.getAttribute('aria-expanded') !== 'true';
      for (var i = 0; i < records.length; i++) {
        if (records[i] !== rec && records[i].btn.getAttribute('aria-expanded') === 'true') {
          setOpen(records[i], false);
        }
      }
      setOpen(rec, willOpen);
    }

    function onKey(e, i) {
      var n = records.length, t;
      if (e.key === 'ArrowDown') t = (i + 1) % n;
      else if (e.key === 'ArrowUp') t = (i - 1 + n) % n;
      else if (e.key === 'Home') t = 0;
      else if (e.key === 'End') t = n - 1;
      else return;
      e.preventDefault();
      records[t].btn.focus();
    }

    items.forEach(function (it, i) {
      var qid = uid + '-q' + i, aid = uid + '-a' + i;

      var itemEl = doc.createElement('div');
      itemEl.className = 'faq-item';

      var btn = doc.createElement('button');
      btn.className = 'faq-q';
      btn.type = 'button';
      btn.id = qid;
      btn.setAttribute('aria-controls', aid);
      var qtext = doc.createElement('span');
      qtext.className = 'faq-q__text';
      qtext.textContent = it.q || '';
      var chev = doc.createElement('span');
      chev.className = 'faq-q__chevron';
      chev.innerHTML = CHEVRON;
      btn.appendChild(qtext);
      btn.appendChild(chev);

      var panel = doc.createElement('div');
      panel.className = 'faq-a';
      panel.id = aid;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', qid);
      var inner = doc.createElement('div');
      inner.className = 'faq-a__inner';
      inner.textContent = it.a || '';
      panel.appendChild(inner);

      var rec = { item: itemEl, btn: btn, panel: panel, inner: inner };
      records.push(rec);

      var open0 = (i === 0); // first open by default (no pre-insertion measure)
      btn.setAttribute('aria-expanded', open0 ? 'true' : 'false');
      if (open0) itemEl.classList.add('is-open');
      panel.style.height = open0 ? 'auto' : '0px';

      btn.addEventListener('click', function () { toggle(rec); });
      btn.addEventListener('keydown', function (e) { onKey(e, i); });

      itemEl.appendChild(btn);
      itemEl.appendChild(panel);
      list.appendChild(itemEl);
    });

    return section;
  };
})();
