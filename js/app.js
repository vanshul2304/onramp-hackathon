/* OnRamp — app.js
 * State machine (no router) for 3 screens: landing → intake → plan.
 * Loads window.COURSES / window.EVENTS from data/*.js. Rendering + micro-interactions live here.
 */
(function () {
  'use strict';

  /* =====================================================================
   * REAL EMAIL SETUP (optional). Leave blank → the "Email me my plan" box
   * stays an offline capture (saves locally, no send). Fill all three from
   * your EmailJS account to send the plan to the address the visitor types.
   * Steps in README → "Turn on real email". No SDK/CDN — plain fetch.
   * ===================================================================== */
  var EMAIL_CONFIG = {
    serviceId: '',   // EmailJS service_id  (e.g. "service_ab12cd")
    templateId: '',  // EmailJS template_id (e.g. "template_xy34z")
    publicKey: ''    // EmailJS Public Key  (Account → General)
  };
  function emailEnabled() {
    return EMAIL_CONFIG.serviceId && EMAIL_CONFIG.templateId && EMAIL_CONFIG.publicKey;
  }

  function getCourses() { return (window.COURSES && window.COURSES.length) ? window.COURSES : []; }
  function getEvents() { return (window.EVENTS && window.EVENTS.length) ? window.EVENTS : []; }

  /* =====================================================================
   * ICONS — vivid inline SVG (no icon font, no CDN). Unique gradient ids.
   * ===================================================================== */
  var _gid = 0;
  function gid() { return 'g' + (++_gid); }
  function icon(name, cls) {
    var g = gid();
    var wrap = function (inner) {
      return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + inner + '</svg>';
    };
    switch (name) {
      case 'compass':
        return wrap(
          '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<circle cx="12" cy="12" r="9" stroke="url(#' + g + ')" stroke-width="1.6"/>' +
          '<path d="M15.5 8.5 10.8 10.8 8.5 15.5 13.2 13.2Z" fill="url(#' + g + ')"/>' +
          '<circle cx="12" cy="12" r="1.1" fill="#051117"/>');
      case 'seed': // level: new
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1B8C77"/><stop offset="1" stop-color="#7AE2CF"/></linearGradient></defs>' +
          '<path d="M12 21c0-4 0-6 2.5-8.5S20 9 20 9s0 3-2.5 5.5S12 17 12 21Z" fill="url(#' + g + ')" opacity=".9"/>' +
          '<path d="M12 21c0-3 0-5-2-7S6 11 6 11s0 2 2 4 4 3 4 6Z" fill="url(#' + g + ')" opacity=".55"/>' +
          '<path d="M12 21v-6" stroke="#7AE2CF" stroke-width="1.4" stroke-linecap="round"/>');
      case 'steps': // level: dabbled
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1B8C77"/><stop offset="1" stop-color="#7AE2CF"/></linearGradient></defs>' +
          '<rect x="4" y="15" width="5" height="5" rx="1" fill="url(#' + g + ')" opacity=".6"/>' +
          '<rect x="9.5" y="11" width="5" height="9" rx="1" fill="url(#' + g + ')" opacity=".8"/>' +
          '<rect x="15" y="6" width="5" height="14" rx="1" fill="url(#' + g + ')"/>');
      case 'code': // level: coder
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<path d="M8.5 8 4.5 12l4 4M15.5 8l4 4-4 4" stroke="url(#' + g + ')" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M13.5 6.5 10.5 17.5" stroke="#7AE2CF" stroke-width="1.4" stroke-linecap="round"/>');
      case 'spark':
        return wrap('<defs><radialGradient id="' + g + '" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#FFD37A"/><stop offset="1" stop-color="#FF8A5E"/></radialGradient></defs>' +
          '<path d="M12 3c.6 4 1.9 5.3 5.9 6-4 .7-5.3 2-5.9 6-.6-4-1.9-5.3-5.9-6 4-.7 5.3-2 5.9-6Z" fill="url(#' + g + ')"/>' +
          '<circle cx="18.5" cy="6" r="1.3" fill="#FFD37A"/>');
      case 'shield':
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<path d="M12 3 5 5.6v5.2c0 4.4 3 7.5 7 9.2 4-1.7 7-4.8 7-9.2V5.6L12 3Z" fill="url(#' + g + ')" opacity=".22" stroke="url(#' + g + ')" stroke-width="1.5"/>' +
          '<path d="M9 12.2 11.2 14.4 15.2 9.6" stroke="#7AE2CF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'calendar':
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<rect x="4" y="5.5" width="16" height="14" rx="2.4" stroke="url(#' + g + ')" stroke-width="1.6"/>' +
          '<path d="M4 9.5h16" stroke="url(#' + g + ')" stroke-width="1.6"/>' +
          '<path d="M8 3.5v3M16 3.5v3" stroke="#7AE2CF" stroke-width="1.6" stroke-linecap="round"/>' +
          '<circle cx="9" cy="13.5" r="1.2" fill="#FF8A5E"/><circle cx="13" cy="13.5" r="1.2" fill="#7AE2CF"/>');
      case 'mail':
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<rect x="3.5" y="5.5" width="17" height="13" rx="2.4" stroke="url(#' + g + ')" stroke-width="1.6"/>' +
          '<path d="M4.5 7 12 12.5 19.5 7" stroke="#7AE2CF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'clock': // hours
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<circle cx="12" cy="12" r="8.5" stroke="url(#' + g + ')" stroke-width="1.6"/>' +
          '<path d="M12 7.5v5l3 2" stroke="#7AE2CF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'target': // goal: job / compete
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD37A"/><stop offset="1" stop-color="#FF8A5E"/></linearGradient></defs>' +
          '<circle cx="12" cy="12" r="8.2" stroke="#7AE2CF" stroke-width="1.5"/>' +
          '<circle cx="12" cy="12" r="4.6" stroke="#7AE2CF" stroke-width="1.5" opacity=".7"/>' +
          '<circle cx="12" cy="12" r="1.6" fill="url(#' + g + ')"/>');
      case 'switch': // goal: switch / escape
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#FF8A5E"/></linearGradient></defs>' +
          '<path d="M4 8h13l-3-3M20 16H7l3 3" stroke="url(#' + g + ')" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'hammer': // goal: build
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<path d="M13.5 6.5 17 10l-2 2-3.5-3.5-4.8 4.8a1.6 1.6 0 0 1-2.3-2.3l4.8-4.8Z" fill="url(#' + g + ')" opacity=".85"/>' +
          '<path d="m14 11 4.5 4.8a1.5 1.5 0 0 1-2.2 2.1L11.8 13" stroke="#7AE2CF" stroke-width="1.6" stroke-linecap="round"/>');
      case 'book': // goal: understand / curious
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<path d="M12 6c-2-1.3-4-1.6-7-1.3v12c3-.3 5 0 7 1.3 2-1.3 4-1.6 7-1.3v-12c-3-.3-5 0-7 1.3Z" stroke="url(#' + g + ')" stroke-width="1.6" stroke-linejoin="round"/>' +
          '<path d="M12 6v12" stroke="#7AE2CF" stroke-width="1.4"/>');
      case 'door': // motivation: escape
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD37A"/><stop offset="1" stop-color="#FF8A5E"/></linearGradient></defs>' +
          '<rect x="6" y="4" width="9" height="16" rx="1.4" stroke="#7AE2CF" stroke-width="1.6"/>' +
          '<path d="M15 12h6m0 0-2.5-2.5M21 12l-2.5 2.5" stroke="url(#' + g + ')" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="11.5" cy="12" r="1" fill="#7AE2CF"/>');
      case 'bolt': // motivation: compete
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD37A"/><stop offset="1" stop-color="#FF8A5E"/></linearGradient></defs>' +
          '<path d="M13 3 5 13h5l-1 8 8-11h-5l1-7Z" fill="url(#' + g + ')"/>');
      case 'people': // motivation: belong
        return wrap('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient></defs>' +
          '<circle cx="9" cy="9" r="3" fill="url(#' + g + ')" opacity=".9"/>' +
          '<circle cx="16.5" cy="10" r="2.4" fill="url(#' + g + ')" opacity=".6"/>' +
          '<path d="M4 19c0-3 2.2-5 5-5s5 2 5 5" stroke="#7AE2CF" stroke-width="1.6" stroke-linecap="round"/>' +
          '<path d="M14.5 19c0-2.3 1.4-4 3.5-4s3.5 1.7 3.5 4" stroke="#7AE2CF" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>');
      case 'globe': // online
        return wrap('<circle cx="12" cy="12" r="8.5" stroke="#7AE2CF" stroke-width="1.5"/>' +
          '<path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" stroke="#7AE2CF" stroke-width="1.3" opacity=".8"/>');
      case 'pin':
        return wrap('<path d="M12 21s6-5.3 6-9.5A6 6 0 1 0 6 11.5C6 15.7 12 21 12 21Z" stroke="#7AE2CF" stroke-width="1.6" stroke-linejoin="round"/>' +
          '<circle cx="12" cy="11" r="2.2" fill="#7AE2CF"/>');
      case 'search':
        return wrap('<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>');
      case 'grid':
        return wrap('<rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.6"/>');
      case 'arrow':
        return wrap('<path d="M5 12h13m0 0-5-5m5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'back':
        return wrap('<path d="M19 12H6m0 0 5-5m-5 5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'share':
        return wrap('<circle cx="6" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="6" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="18" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="m8 11 7-4M8 13l7 4" stroke="currentColor" stroke-width="1.6"/>');
      case 'bookmark':
        return wrap('<path d="M7 4h10v16l-5-3.5L7 20V4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/>');
      case 'download':
        return wrap('<path d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M5 16.5v1.5A1.5 1.5 0 0 0 6.5 19.5h11a1.5 1.5 0 0 0 1.5-1.5v-1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>');
      default:
        return wrap('<circle cx="12" cy="12" r="8" stroke="#7AE2CF" stroke-width="1.6"/>');
    }
  }

  /* =====================================================================
   * GENERATIVE COVER ART — delegated to OnRampVisuals.coverArt (cover-art-v2).
   * The card-cover wrapper is kept; its CSS frames the banner.
   * ===================================================================== */
  function coverHead(seed, kind, opts) {
    return '<div class="card-cover">' + window.OnRampVisuals.coverArt(seed, kind, opts) + '</div>';
  }

  /* =====================================================================
   * ADD TO CALENDAR — client-side .ics (Blob download) + Google Calendar
   * quick-add link. All-day VEVENT from dateISO (we only carry dates).
   * ===================================================================== */
  function icsEsc(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
  function ymd(iso) { return String(iso || '').replace(/-/g, ''); }
  function nextYmd(iso) { // all-day DTEND is exclusive → day after
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d)) return ymd(iso);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }
  function dtStamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); }
  function eventLocation(e) { return e.mode === 'online' ? 'Online' : (e.city || 'In-person'); }
  function eventDetails(e) {
    return 'Added from OnRamp. ' + (e.beginnerSafe ? 'Beginner-safe. ' : '') + (e.url || '');
  }
  function buildICS(e) {
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OnRamp//Events//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + ((e.id || ('evt' + Date.now())) + '@onramp'),
      'DTSTAMP:' + dtStamp(),
      'DTSTART;VALUE=DATE:' + ymd(e.dateISO),
      'DTEND;VALUE=DATE:' + nextYmd(e.dateISO),
      'SUMMARY:' + icsEsc(e.title),
      'DESCRIPTION:' + icsEsc(eventDetails(e)),
      'LOCATION:' + icsEsc(eventLocation(e)),
      'URL:' + icsEsc(e.url || ''),
      'END:VEVENT', 'END:VCALENDAR'
    ];
    return lines.join('\r\n') + '\r\n';
  }
  function gcalLink(e) {
    var q = 'action=TEMPLATE' +
      '&text=' + encodeURIComponent(e.title || 'AI event') +
      '&dates=' + ymd(e.dateISO) + '/' + nextYmd(e.dateISO) +
      '&details=' + encodeURIComponent(eventDetails(e)) +
      '&location=' + encodeURIComponent(eventLocation(e));
    return 'https://calendar.google.com/calendar/render?' + q;
  }
  function downloadICS(e) {
    try {
      var blob = new Blob([buildICS(e)], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = (e.id || 'event') + '.ics';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast('Calendar file downloaded — open it to add “' + (e.title || 'this event') + '”.');
    } catch (err) {
      toast('Couldn’t build the calendar file — try the Google option.');
    }
  }
  // expose for a tiny node self-check of the .ics builder
  window.__onrampICS = { buildICS: buildICS, gcalLink: gcalLink };

  /* =====================================================================
   * INTAKE CONFIG
   * ===================================================================== */
  var STEPS = [
    {
      key: 'level', title: 'Where are you starting?',
      sub: 'No wrong answer — this just tunes the plan.',
      options: [
        { value: 'new', label: 'Brand new', desc: 'Never touched code or AI', icon: 'seed' },
        { value: 'dabbled', label: 'I’ve dabbled', desc: 'Tutorials, prompts, some poking around', icon: 'steps' },
        { value: 'coder', label: 'I can code', desc: 'Comfortable coding, new to AI', icon: 'code' }
      ]
    },
    {
      key: 'goal', title: 'What are you here to do?',
      sub: 'Pick the one that fits best.',
      options: [
        { value: 'job', label: 'Get hired', desc: 'Land an AI-adjacent role', icon: 'target' },
        { value: 'switch', label: 'Change careers', desc: 'Bridge out of my current field', icon: 'switch' },
        { value: 'build', label: 'Ship things', desc: 'Actually build with AI', icon: 'hammer' },
        { value: 'understand', label: 'Get literate', desc: 'Understand what’s going on', icon: 'book' }
      ]
    },
    {
      key: 'hours', title: 'How much time each week?',
      sub: 'Be honest — the plan respects it.',
      options: [
        { value: 'lt3', label: 'Under 3 hours', desc: 'Nights and margins', icon: 'clock' },
        { value: '3to6', label: '3–6 hours', desc: 'A real, steady habit', icon: 'clock' },
        { value: '7plus', label: '7+ hours', desc: 'I’m going all in', icon: 'clock' }
      ]
    },
    {
      key: 'motivation', title: 'What’s <em>really</em> driving this?',
      sub: 'The honest answer gets you a better plan.',
      options: [
        { value: 'escape', label: 'I want out', desc: 'Out of my current job', icon: 'door' },
        { value: 'compete', label: 'I need an edge', desc: 'To get hired', icon: 'bolt' },
        { value: 'curious', label: 'I want to understand it', desc: 'The pull is real', icon: 'book' },
        { value: 'belong', label: 'I’m tired of learning alone', desc: 'I want a room, not a playlist', icon: 'people' }
      ]
    },
    { key: 'location', title: 'Where should we look for rooms?', sub: 'Online events work anywhere. Add a city to catch in-person ones too.', type: 'location' }
  ];

  /* =====================================================================
   * STATE + STORAGE
   * ===================================================================== */
  var LS_KEY = 'onramp';
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveStore(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var state = {
    screen: 'landing',
    step: 0,
    focus: 'all',          // what the visitor is looking for (segmented filter)
    browseQuery: '',       // current search text on the browse screen
    answers: { level: null, goal: null, hours: null, motivation: null, location: { city: null, onlineOnly: false } },
    plan: null,
    saved: (loadStore().saved || [])
  };

  var app;
  var heroHandle = null; // OnRampVisuals.heroField() handle; destroyed on any re-render
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* =====================================================================
   * SCREEN TRANSITIONS
   * ===================================================================== */
  function render(html, opts) {
    opts = opts || {};
    // tear down the hero field (if any) before it's wiped from the DOM
    if (heroHandle) { heroHandle.destroy(); heroHandle = null; }
    app.innerHTML = html;
    app.classList.remove('screen-enter');
    // force reflow to restart animation
    void app.offsetWidth;
    app.classList.add('screen-enter');
    if (opts.focus) {
      var f = app.querySelector(opts.focus);
      if (f) f.focus();
    }
    window.scrollTo(0, 0);
  }

  /* =====================================================================
   * LANDING
   * ===================================================================== */
  /* Segmented filter — "what are you looking for". Maps to real event kinds + courses. */
  var FOCUS = [
    { key: 'all', label: 'All' },
    { key: 'course', label: 'Courses' },
    { key: 'meetup', label: 'Meetups' },
    { key: 'workshop', label: 'Workshops' },
    { key: 'hackathon', label: 'Hackathons' },
    { key: 'talk', label: 'Talks' },
    { key: 'study-group', label: 'Study groups' }
  ];
  function focusLabel(key) {
    for (var i = 0; i < FOCUS.length; i++) if (FOCUS[i].key === key) return FOCUS[i].label;
    return 'All';
  }
  var KIND_LABEL = { meetup: 'Meetup', workshop: 'Workshop', hackathon: 'Hackathon', talk: 'Talk', 'study-group': 'Study group' };
  function kindLabel(k) { return KIND_LABEL[k] || (k || 'Event'); }

  function focusChips() {
    return FOCUS.map(function (f) {
      var sel = state.focus === f.key;
      return '<button class="focus-chip' + (sel ? ' selected' : '') + '" type="button" data-focus="' + esc(f.key) + '" aria-pressed="' + (sel ? 'true' : 'false') + '">' + esc(f.label) + '</button>';
    }).join('');
  }
  function focusCount(f) {
    if (f === 'course') return getCourses().length;
    var evs = getEvents();
    if (f === 'all') return getCourses().length + evs.length;
    return evs.filter(function (e) { return e.kind === f; }).length;
  }

  // "Real rooms in …" trust line — pulls actual in-person cities from the live
  // events feed so the headline's "real rooms" promise is concrete, not decorative.
  // Returns '' during an all-online window rather than inventing a city.
  function heroTrustCities() {
    var cities = [];
    var hasOnline = false;
    getEvents().forEach(function (e) {
      if (e.mode === 'online') { hasOnline = true; return; }
      if (e.city) {
        var c = e.city.split(',')[0].trim();
        if (c && cities.indexOf(c) === -1) cities.push(c);
      }
    });
    if (!cities.length) {
      return hasOnline ? '<p class="trust-cities">' + icon('globe') + 'Real rooms online, every week</p>' : '';
    }
    var label = cities.slice(0, 3).join(' · ');
    var tail = hasOnline ? ' · and online' : (cities.length > 3 ? ' + more' : '');
    return '<p class="trust-cities">' + icon('pin') + 'Real rooms in ' + esc(label + tail) + '</p>';
  }

  function renderLanding() {
    state.screen = 'landing';
    render(
      '<section class="landing">' +
        heroDecor() +
        '<div class="landing-inner">' +
        '<div class="hero">' +
          '<div class="brand"><span class="brand-mark">' + icon('compass', 'brand-ic') + '</span><span class="brand-name">OnRamp</span></div>' +
          '<h1 class="hero-title"><span class="grad-text">Stop doomscrolling AI.</span><br><span class="grad-text grad-text--mint">Start building with it.</span></h1>' +
          '<p class="hero-sub">One course to start tonight. Real rooms this month. Your next step today.</p>' +
          '<form class="search-bar" id="landing-search" role="search">' +
            '<span class="search-ic" aria-hidden="true">' + icon('search') + '</span>' +
            '<input id="landing-q" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search courses, meetups, hackathons…" aria-label="Search courses and events" />' +
            '<button class="search-go" type="submit" aria-label="Search the catalog">' + icon('arrow') + '</button>' +
          '</form>' +
          '<div class="focus-row" role="group" aria-label="Filter by what you’re looking for">' + focusChips() + '</div>' +
          '<div class="hero-cta">' +
            '<button class="btn btn-primary btn-lg" id="cta-start" type="button">Get my plan <span class="ar">' + icon('arrow') + '</span></button>' +
            '<button class="btn btn-secondary btn-lg" id="cta-browse" type="button">' + icon('grid') + '<span id="browse-count-btn">Browse all ' + focusCount('all') + '</span></button>' +
          '</div>' +
          '<p class="footnote"><strong>Free</strong> · No account · 2 minutes</p>' +
          heroTrustCities() +
          '<p class="anti-line"><span class="anti-ic" aria-hidden="true">' + icon('spark') + '</span>ChatGPT hands you a plan and forgets you. OnRamp hands you one next step and a real room to walk into.</p>' +
        '</div>' +
        '<div class="how">' +
          '<div class="how-title">How it works</div>' +
          '<ol class="how-steps">' +
            '<li class="how-step rim-card"><span class="how-n">1</span><span class="how-ic">' + icon('compass') + '</span><div><strong>Answer 5 taps</strong><span>Level, goal, time, and the real why.</span></div></li>' +
            '<li class="how-step rim-card"><span class="how-n">2</span><span class="how-ic">' + icon('spark') + '</span><div><strong>Get 1 course + real rooms</strong><span>One next step, not a catalog.</span></div></li>' +
            '<li class="how-step rim-card"><span class="how-n">3</span><span class="how-ic">' + icon('people') + '</span><div><strong>Show up</strong><span>Momentum beats motivation.</span></div></li>' +
          '</ol>' +
        '</div>' +
        '<div class="how landing-faq-block">' +
          '<div class="how-title">Questions</div>' +
          '<div class="landing-faq"></div>' +
        '</div>' +
        '</div>' +
      '</section>'
    );
    document.getElementById('cta-start').addEventListener('click', startIntake);
    document.getElementById('cta-browse').addEventListener('click', function () { state.browseQuery = ''; renderBrowse(); });
    document.getElementById('landing-search').addEventListener('submit', function (e) {
      e.preventDefault();
      state.browseQuery = document.getElementById('landing-q').value.trim();
      renderBrowse();
    });
    wireFocusChips(app.querySelector('.focus-row'), updateLandingBrowseBtn);
    var hf = app.querySelector('.hero-field');
    if (hf) heroHandle = window.OnRampVisuals.heroField(hf, { lattice: 'left' });
    // Single lit focal element: the masked-video orb, upper-right of the field.
    var orbHost = app.querySelector('.hero-orb-host');
    if (orbHost && window.OnRampVisuals.orb) orbHost.appendChild(window.OnRampVisuals.orb());
    // Landing FAQ (ported accordion), first item open.
    var faqHost = app.querySelector('.landing-faq');
    if (faqHost && window.OnRampVisuals.faq) faqHost.appendChild(window.OnRampVisuals.faq(LANDING_FAQ));
  }

  // Landing FAQ copy — product voice (PRODUCT.md): one next step, anti-catalog.
  var LANDING_FAQ = [
    { q: 'Is OnRamp free?',
      a: 'Yes — free, no account, about two minutes. You answer five taps and walk away with a plan.' },
    { q: 'Do I need to know how to code?',
      a: 'No. OnRamp is built for people just breaking into AI: every plan starts with a beginner-safe course and rooms tagged for newcomers.' },
    { q: 'How is this different from asking ChatGPT?',
      a: 'ChatGPT hands you a plan and forgets you. OnRamp hands you one course to start tonight and a real room to walk into this month.' },
    { q: 'What happens after I get my plan?',
      a: 'You take the first step — start the course, sign up for one room. Email the plan to yourself so it’s waiting when you come back.' }
  ];

  function updateLandingBrowseBtn() {
    var el = document.getElementById('browse-count-btn');
    if (!el) return;
    var f = state.focus, n = focusCount(f);
    el.textContent = f === 'all' ? ('Browse all ' + n) : ('Browse ' + n + ' ' + focusLabel(f).toLowerCase());
  }

  /* Shared: wire a segmented focus-chip row. onChange fires after state.focus updates. */
  function wireFocusChips(container, onChange) {
    if (!container) return;
    var chips = container.querySelectorAll('.focus-chip');
    Array.prototype.forEach.call(chips, function (btn) {
      btn.addEventListener('click', function () {
        state.focus = btn.getAttribute('data-focus');
        Array.prototype.forEach.call(chips, function (b) {
          var on = b === btn;
          b.classList.toggle('selected', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (onChange) onChange();
      });
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  /* =====================================================================
   * BROWSE / EXPLORE — searchable, filterable catalog. No intake required.
   * ===================================================================== */
  function browseResults() {
    var f = state.focus;
    var q = (state.browseQuery || '').trim().toLowerCase();
    var rows = [];
    if (f === 'all' || f === 'course') {
      getCourses().forEach(function (c) { rows.push({ type: 'course', item: c }); });
    }
    if (f !== 'course') {
      getEvents().forEach(function (e) {
        if (f === 'all' || e.kind === f) rows.push({ type: 'event', item: e });
      });
    }
    if (q) rows = rows.filter(function (r) { return rowText(r).indexOf(q) !== -1; });
    return rows;
  }
  function rowText(r) {
    var it = r.item;
    var parts = r.type === 'course'
      ? [it.title, it.provider, 'course', (it.topics || []).join(' ')]
      : [it.title, it.org, kindLabel(it.kind), it.kind, it.city, it.prepTopic];
    return parts.join(' ').toLowerCase();
  }

  function courseRow(c, i) {
    return '<li class="row-card" style="--d:' + Math.min(i * 40, 320) + 'ms">' +
      '<div class="row-main">' +
        '<div class="row-head"><span class="row-kind kind-course">Course</span>' + costBadge(c.cost) + '</div>' +
        '<h3 class="row-title">' + esc(c.title) + '</h3>' +
        '<div class="provider">' + esc(c.provider) + '</div>' +
        '<div class="chips"><span class="chip">' + icon('clock') + esc(c.durationLabel) + '</span><span class="chip">' + esc(c.format) + '</span></div>' +
      '</div>' +
      '<a class="btn btn-secondary row-go" href="' + esc(c.url) + '" target="_blank" rel="noopener">View <span class="ar">' + icon('arrow') + '</span></a>' +
    '</li>';
  }
  function eventRow(e, i) {
    var modeChip = e.mode === 'online'
      ? '<span class="chip">' + icon('globe') + 'Online</span>'
      : '<span class="chip">' + icon('pin') + esc((e.mode === 'hybrid' ? 'Hybrid · ' : '') + (e.city || 'In-person')) + '</span>';
    return '<li class="row-card" style="--d:' + Math.min(i * 40, 320) + 'ms">' +
      '<div class="row-main">' +
        '<div class="row-head"><span class="row-kind kind-' + esc(e.kind) + '">' + esc(kindLabel(e.kind)) + '</span>' +
          (e.dateLabel ? '<span class="date-pill">' + icon('calendar') + esc(e.dateLabel) + '</span>' : '') +
          (e.free ? '<span class="badge badge-free">Free</span>' : '') +
        '</div>' +
        '<h3 class="row-title">' + esc(e.title) + '</h3>' +
        '<div class="provider">' + esc(e.org) + '</div>' +
        '<div class="chips">' + modeChip +
          (e.beginnerSafe ? '<span class="chip chip-safe">' + icon('shield') + 'Beginner-safe</span>' : '') +
        '</div>' +
      '</div>' +
      '<a class="btn btn-secondary row-go" href="' + esc(e.url) + '" target="_blank" rel="noopener">View <span class="ar">' + icon('arrow') + '</span></a>' +
    '</li>';
  }

  function renderBrowse() {
    state.screen = 'browse';
    render(
      '<section class="browse">' +
        '<div class="browse-top">' +
          '<button class="btn-ghost btn-hairline back" id="browse-back" type="button" aria-label="Back to start">' + icon('back') + '<span>Home</span></button>' +
          '<button class="btn btn-primary browse-plan" id="browse-plan" type="button">' + icon('spark') + 'Get my plan</button>' +
        '</div>' +
        '<h2 class="browse-title">Browse everything</h2>' +
        '<p class="browse-sub">Every course and real room in one place. Search, filter, then let us build your plan.</p>' +
        '<form class="search-bar" id="browse-search" role="search">' +
          '<span class="search-ic" aria-hidden="true">' + icon('search') + '</span>' +
          '<input id="browse-q" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search by title, topic, or city…" aria-label="Search courses and events" value="' + esc(state.browseQuery || '') + '" />' +
        '</form>' +
        '<div class="focus-row browse-focus" role="group" aria-label="Filter by type">' + focusChips() + '</div>' +
        '<p class="browse-count" id="browse-count-line" role="status" aria-live="polite"></p>' +
        '<ul class="browse-list" id="browse-list"></ul>' +
      '</section>',
      { focus: '#browse-q' }
    );
    document.getElementById('browse-back').addEventListener('click', renderLanding);
    document.getElementById('browse-plan').addEventListener('click', startIntake);
    var q = document.getElementById('browse-q');
    var onQuery = debounce(function () { state.browseQuery = q.value.trim(); renderBrowseList(); }, 180);
    q.addEventListener('input', onQuery);
    document.getElementById('browse-search').addEventListener('submit', function (e) { e.preventDefault(); state.browseQuery = q.value.trim(); renderBrowseList(); });
    wireFocusChips(app.querySelector('.browse-focus'), renderBrowseList);
    renderBrowseList();
  }

  function renderBrowseList() {
    var list = document.getElementById('browse-list');
    var countLine = document.getElementById('browse-count-line');
    if (!list) return;
    var rows = browseResults();
    if (countLine) countLine.textContent = rows.length + (rows.length === 1 ? ' result' : ' results');
    if (!rows.length) {
      list.innerHTML = '<li class="browse-empty"><span class="onramp-constellation">' + window.OnRampVisuals.emptyState() + '</span>' +
        '<p>Nothing matches yet. Try another word, or clear the filter.</p>' +
        '<button class="btn btn-secondary" id="browse-reset" type="button">Reset filters</button></li>';
      var r = document.getElementById('browse-reset');
      if (r) r.addEventListener('click', function () { state.focus = 'all'; state.browseQuery = ''; renderBrowse(); });
      return;
    }
    list.innerHTML = rows.map(function (r, i) {
      return r.type === 'course' ? courseRow(r.item, i) : eventRow(r.item, i);
    }).join('');
  }

  // Hero background mount point: an empty positioned child of .landing that
  // OnRampVisuals.heroField() paints the generative "Signal field" into. The
  // field manages its own pointer parallax, ambient drift, and teardown.
  function heroDecor() {
    // hero-field = Signal decor; hero-orb host = the single lit "Orb" focal
    // element in the upper-right. Both sit at the decor layer (placement +
    // <768px hide live in css/orb.css's "orb placement" block).
    return '<div class="hero-field" aria-hidden="true"></div>' +
      '<div class="hero-orb-host" aria-hidden="true"></div>';
  }

  /* =====================================================================
   * INTAKE
   * ===================================================================== */
  function startIntake() {
    state.screen = 'intake';
    state.step = 0;
    renderStep();
  }

  function renderStep() {
    var i = state.step;
    var s = STEPS[i];
    var body;
    if (s.type === 'location') {
      body = renderLocationStep();
    } else {
      body = '<div class="options" role="radiogroup" aria-label="' + esc(s.title.replace(/<[^>]+>/g, '')) + '">' +
        s.options.map(function (o, idx) {
          var sel = state.answers[s.key] === o.value;
          return '<button class="option' + (sel ? ' selected' : '') + '" role="radio" aria-checked="' + (sel ? 'true' : 'false') + '" data-value="' + esc(o.value) + '" style="--d:' + (idx * 55) + 'ms">' +
            '<span class="option-ic">' + icon(o.icon) + '</span>' +
            '<span class="option-txt"><span class="option-label">' + esc(o.label) + '</span><span class="option-desc">' + esc(o.desc) + '</span></span>' +
            '<span class="option-check" aria-hidden="true"><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M6 12.5 10 16.5 18 8" stroke="#051117" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
          '</button>';
        }).join('') +
      '</div>';
    }

    render(
      '<section class="intake">' +
        '<div class="intake-top">' +
          '<button class="btn-ghost btn-hairline back" id="back-btn" aria-label="Back">' + icon('back') + '</button>' +
          '<div class="progress-wrap"><div class="progress-label">Question ' + (i + 1) + ' of ' + STEPS.length + '</div>' +
            '<div class="onramp-rail">' + window.OnRampVisuals.progressRail(i, STEPS.length) + '</div></div>' +
        '</div>' +
        '<h2 class="q-title">' + s.title + '</h2>' +
        '<p class="q-sub">' + esc(s.sub) + '</p>' +
        body +
      '</section>',
      { focus: s.type === 'location' ? '#city-input' : '.option' }
    );

    document.getElementById('back-btn').addEventListener('click', goBack);

    if (s.type !== 'location') {
      Array.prototype.forEach.call(app.querySelectorAll('.option'), function (btn) {
        btn.addEventListener('click', function () { chooseOption(s.key, btn.getAttribute('data-value')); });
      });
    } else {
      wireLocationStep();
    }
  }

  function renderLocationStep() {
    var loc = state.answers.location || {};
    return '<div class="loc">' +
      '<label class="loc-field">' +
        '<span class="loc-ic">' + icon('pin') + '</span>' +
        '<input id="city-input" type="text" autocomplete="off" placeholder="Your city (e.g. San Francisco)" value="' + esc(loc.city || '') + '" aria-label="Your city" />' +
      '</label>' +
      '<button class="option option-wide' + (loc.onlineOnly ? ' selected' : '') + '" id="online-only" aria-pressed="' + (loc.onlineOnly ? 'true' : 'false') + '" style="--d:80ms">' +
        '<span class="option-ic">' + icon('globe') + '</span>' +
        '<span class="option-txt"><span class="option-label">Online only works for me</span><span class="option-desc">Skip the city — I’ll join from anywhere</span></span>' +
        '<span class="option-check" aria-hidden="true"><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M6 12.5 10 16.5 18 8" stroke="#051117" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '</button>' +
      '<button class="btn btn-primary btn-lg loc-go" id="loc-go">Build my plan <span class="ar">' + icon('arrow') + '</span></button>' +
    '</div>';
  }

  function wireLocationStep() {
    var input = document.getElementById('city-input');
    var onlineBtn = document.getElementById('online-only');
    input.addEventListener('input', function () {
      if (input.value.trim()) {
        onlineBtn.classList.remove('selected');
        onlineBtn.setAttribute('aria-pressed', 'false');
        state.answers.location.onlineOnly = false;
      }
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitLocation(); } });
    onlineBtn.addEventListener('click', function () {
      var on = !onlineBtn.classList.contains('selected');
      onlineBtn.classList.toggle('selected', on);
      onlineBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      state.answers.location.onlineOnly = on;
      if (on) input.value = '';
    });
    document.getElementById('loc-go').addEventListener('click', submitLocation);
  }

  function submitLocation() {
    var input = document.getElementById('city-input');
    var city = input && input.value.trim() ? input.value.trim() : null;
    var onlineOnly = document.getElementById('online-only').classList.contains('selected') || !city;
    state.answers.location = { city: onlineOnly && !city ? null : city, onlineOnly: onlineOnly && !city };
    // if a city is typed, treat as in-person-friendly (not online-only) but still surfaces online events
    if (city) state.answers.location = { city: city, onlineOnly: false };
    buildAndShowPlan();
  }

  function chooseOption(key, value) {
    state.answers[key] = value;
    // brief selected pulse, then advance
    var btn = app.querySelector('.option[data-value="' + CSS.escape(value) + '"]');
    if (btn) { btn.classList.add('selected'); btn.setAttribute('aria-checked', 'true'); }
    var delay = prefersReduced ? 0 : 180;
    setTimeout(function () {
      if (state.step < STEPS.length - 1) { state.step++; renderStep(); }
    }, delay);
  }

  function goBack() {
    if (state.step === 0) { renderLanding(); return; }
    state.step--;
    renderStep();
  }

  /* =====================================================================
   * PLAN
   * ===================================================================== */
  // Honor the landing filter: bias the plan's rooms toward the chosen kind,
  // but never starve it (buildPlan needs >=2) — fall back to the full set.
  function focusedEventsForPlan() {
    var all = getEvents();
    var f = state.focus;
    if (f === 'all' || f === 'course') return all;
    var sub = all.filter(function (e) { return e.kind === f; });
    return sub.length >= 2 ? sub : all;
  }

  function buildAndShowPlan() {
    state.plan = window.buildPlan(state.answers, getCourses(), focusedEventsForPlan());
    writeHash(state.answers);
    renderPlan();
  }

  function freshLabel(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return 'today';
    var mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function summaryLine(a) {
    var lvl = { new: 'starting from zero', dabbled: 'past the tutorials', coder: 'a coder new to AI' }[a.level] || '';
    var goal = { job: 'aiming to get hired', switch: 'switching careers', build: 'here to build', understand: 'here to get literate' }[a.goal] || '';
    var hrs = { lt3: 'under 3 hrs/week', '3to6': '3–6 hrs/week', '7plus': '7+ hrs/week' }[a.hours] || '';
    var loc = (a.location && a.location.city) ? ('near ' + a.location.city) : 'online';
    return cap(lvl) + ', ' + goal + ', ' + hrs + ', ' + loc + '.';
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function costBadge(cost) {
    var map = { free: ['Free', 'badge-free'], freemium: ['Freemium', 'badge-freemium'], paid: ['Paid', 'badge-paid'] };
    var m = map[cost] || [cost || '—', 'badge-free'];
    return '<span class="badge ' + m[1] + '">' + esc(m[0]) + '</span>';
  }

  function renderPlan() {
    state.screen = 'plan';
    var p = state.plan;
    var a = state.answers;
    var c = p.course;
    var store = loadStore();

    var courseCard = c ? (
      '<article class="card course-card has-cover" id="course-anchor" style="animation:none">' +
        coverHead(c.id, 'course', { primary: true }) +
        '<div class="step-badge"><span class="step-num">1</span> Start this course</div>' +
        '<div class="card-head">' +
          '<div><h3 class="card-title">' + esc(c.title) + '</h3><div class="provider">' + esc(c.provider) + '</div></div>' +
          costBadge(c.cost) +
        '</div>' +
        '<div class="chips"><span class="chip">' + icon('clock') + esc(c.durationLabel) + '</span><span class="chip">' + esc(c.format) + '</span></div>' +
        '<p class="why"><span class="why-tag">Why this fits you</span>' + esc(p.why.course) + '</p>' +
        '<div class="firststep"><span class="firststep-ic">' + icon('spark') + '</span><div><span class="firststep-label">Do this first</span><span class="firststep-txt">' + esc(c.firstStep) + '</span></div></div>' +
        '<a class="btn btn-primary" href="' + esc(c.url) + '" target="_blank" rel="noopener">Start now <span class="ar">' + icon('arrow') + '</span></a>' +
      '</article>'
    ) : '<article class="card"><p>No course found.</p></article>';

    var eventCards = p.events.map(function (e, idx) {
      var isSaved = state.saved.indexOf(e.id) !== -1;
      var joins = c && Array.isArray(c.topics) && e.prepTopic && c.topics.indexOf(e.prepTopic) !== -1;
      var modeChip = e.mode === 'online'
        ? '<span class="chip">' + icon('globe') + 'Online</span>'
        : '<span class="chip">' + icon('pin') + esc((e.mode === 'hybrid' ? 'Hybrid · ' : '') + (e.city || 'In-person')) + '</span>';
      return '<article class="card event-card has-cover" style="animation:none">' +
        coverHead(e.id, e.kind) +
        '<div class="event-top"><span class="date-pill">' + icon('calendar') + esc(e.dateLabel) + '</span>' + modeChip + '</div>' +
        '<h4 class="card-title sm">' + esc(e.title) + '</h4><div class="provider">' + esc(e.org) + '</div>' +
        (e.beginnerSafe ? '<div class="safe-tag">' + icon('shield') + '<span>Beginner-safe</span></div>' +
          (e.beginnerNote ? '<p class="safe-note">' + esc(e.beginnerNote) + '</p>' : '') : '') +
        '<p class="why"><span class="why-tag">Why this room</span>' + esc(p.why.events[e.id] || '') + '</p>' +
        (c ? '<button class="learn-first" data-scroll="course-anchor">' + icon('book') + (joins
          ? 'Learn this first — your Step 1 course covers ' + esc(e.prepTopic)
          : 'Learn this first — warm up with your Step 1 course') + '</button>' : '') +
        '<div class="event-actions">' +
          '<button class="btn btn-secondary save-btn' + (isSaved ? ' saved' : '') + '" data-save="' + esc(e.id) + '" aria-pressed="' + (isSaved ? 'true' : 'false') + '">' + icon('bookmark') + '<span class="save-txt">' + (isSaved ? 'Saved' : 'Save') + '</span></button>' +
          '<details class="cal">' +
            '<summary class="btn btn-secondary cal-btn" aria-label="Add to calendar">' + icon('calendar') + '<span>Calendar</span></summary>' +
            '<div class="cal-menu" role="menu">' +
              '<a class="cal-item" role="menuitem" href="' + esc(gcalLink(e)) + '" target="_blank" rel="noopener">' + icon('globe') + 'Google Calendar</a>' +
              '<button class="cal-item" role="menuitem" type="button" data-ics="' + esc(e.id) + '">' + icon('download') + 'Download .ics</button>' +
            '</div>' +
          '</details>' +
          '<a class="btn btn-primary signup" href="' + esc(e.url) + '" target="_blank" rel="noopener">Sign up <span class="ar">' + icon('arrow') + '</span></a>' +
        '</div>' +
      '</article>';
    }).join('');

    render(
      '<section class="plan">' +
        '<div class="plan-head">' +
          '<button class="btn-ghost btn-hairline back" id="restart" aria-label="Restart">' + icon('back') + '<span>Restart</span></button>' +
          '<button class="btn-ghost btn-hairline share" id="share-btn">' + icon('share') + '<span>Share</span></button>' +
        '</div>' +
        '<h2 class="plan-title" data-reveal>Your next step, <span class="grad">not a catalog</span></h2>' +
        '<p class="plan-summary" data-reveal>' + esc(summaryLine(a)) + '</p>' +
        '<div class="spine">' +
          courseCard +
          '<div class="spine-events"><div class="step-badge ghost"><span class="step-num">2</span> Show up to these rooms</div>' +
            (window.EVENTS_UPDATED ? '<p class="fresh-stamp">' + icon('spark') + 'Live events — refreshed ' + esc(freshLabel(window.EVENTS_UPDATED)) + '</p>' : '') +
            eventCards + '</div>' +
          '<article class="card teaser rim-card" style="animation:none"><div class="step-badge ghost"><span class="step-num">3</span> What’s next</div>' +
            '<p class="teaser-txt">Finish Step 1, show up to one room, and the next rung gets obvious: a project, a deeper course, a community. Save the plan to your inbox for when you’re ready.</p></article>' +
        '</div>' +
        '<div class="email-door card rim-card" style="overflow:hidden">' +
          '<div class="email-door-content" style="position:relative;z-index:var(--z-content)">' +
          '<div class="email-head">' + icon('mail') + '<div><strong>Email me my plan</strong><span>' + (emailEnabled() ? 'The full plan in your inbox, links and all.' : 'Saved on this device so it’s here when you come back.') + '</span></div></div>' +
          '<form class="email-form" id="email-form">' +
            '<input id="email-input" type="email" required placeholder="you@email.com" aria-label="Your email" />' +
            '<button class="btn btn-primary" id="email-send-btn" type="submit">Send it</button>' +
          '</form>' +
          '</div>' +
        '</div>' +
      '</section>'
    );

    // one-shot entrance choreography — owns the plan cards' transform/opacity
    requestAnimationFrame(function () { window.OnRampVisuals.planReveal(app.querySelector('.plan')); });

    // "Orb" wave: horizon band decor behind the email-door CTA (first child of
    // the relative/overflow-hidden card; content already lifted to --z-content).
    var emailDoor = app.querySelector('.email-door');
    if (emailDoor && window.OnRampVisuals.horizonBand) {
      emailDoor.insertBefore(window.OnRampVisuals.horizonBand(), emailDoor.firstChild);
    }

    // wire
    document.getElementById('restart').addEventListener('click', restart);
    document.getElementById('share-btn').addEventListener('click', sharePlan);
    Array.prototype.forEach.call(app.querySelectorAll('.save-btn'), function (b) {
      b.addEventListener('click', function () { toggleSave(b.getAttribute('data-save'), b); });
    });
    var eventsById = {};
    p.events.forEach(function (e) { eventsById[e.id] = e; });
    Array.prototype.forEach.call(app.querySelectorAll('[data-ics]'), function (b) {
      b.addEventListener('click', function () {
        var e = eventsById[b.getAttribute('data-ics')];
        if (e) downloadICS(e);
        var d = b.closest('details'); if (d) d.open = false;
      });
    });
    // close any open calendar menu when clicking outside it
    document.addEventListener('click', function (ev) {
      Array.prototype.forEach.call(document.querySelectorAll('details.cal[open]'), function (d) {
        if (!d.contains(ev.target)) d.open = false;
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('.learn-first'), function (b) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.getAttribute('data-scroll'));
        if (t) { t.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' }); t.classList.add('flash'); setTimeout(function () { t.classList.remove('flash'); }, 1200); }
      });
    });
    document.getElementById('email-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('email-input');
      var btn = document.getElementById('email-send-btn');
      var email = input.value.trim();
      if (!email) return;
      var s = loadStore();
      s.email = email; s.answers = state.answers; s.plan = summarizePlanForStore(p); s.ts = Date.now();
      saveStore(s);

      if (!emailEnabled()) {
        // No email service configured — honest offline capture, no false "sent".
        toast('Saved on this device. To receive it by email, add a key (see README).');
        input.value = '';
        return;
      }

      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending…';
      sendPlanEmail(email, p).then(function () {
        toast('Plan sent to ' + email + '. Check your inbox.');
        input.value = '';
      }).catch(function (err) {
        toast('Couldn’t send just now, but your plan is saved. (' + (err && err.message ? err.message : 'try again') + ')');
      }).then(function () {
        btn.disabled = false; btn.textContent = label;
      });
    });
  }

  function planToText(p, email) {
    var lines = [];
    if (p.course) {
      lines.push('STEP 1 — START THIS COURSE');
      lines.push(p.course.title + '  (' + p.course.provider + ')');
      if (p.why && p.why.course) lines.push('Why: ' + p.why.course);
      if (p.course.firstStep) lines.push('First step: ' + p.course.firstStep);
      lines.push(p.course.url);
      lines.push('');
    }
    lines.push('STEP 2 — SHOW UP TO THESE ROOMS');
    lines.push('(Tip: on each room, tap “Calendar” to add it to Google or download a .ics.)');
    p.events.forEach(function (e) {
      lines.push('• ' + e.title + '  —  ' + (e.dateLabel || '') + (e.mode === 'online' ? ' · Online' : (e.city ? ' · ' + e.city : '')));
      if (e.beginnerSafe) lines.push('  Beginner-safe. ' + (e.beginnerNote || ''));
      lines.push('  ' + e.url);
    });
    lines.push('');
    lines.push('Made with OnRamp — https://vanshul2304.github.io/onramp-hackathon/');
    return lines.join('\n');
  }

  function sendPlanEmail(email, p) {
    var payload = {
      service_id: EMAIL_CONFIG.serviceId,
      template_id: EMAIL_CONFIG.templateId,
      user_id: EMAIL_CONFIG.publicKey,
      template_params: {
        to_email: email,
        course_title: p.course ? p.course.title : 'Your AI starting point',
        plan_text: planToText(p, email)
      }
    };
    return fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) { return res.text().then(function (t) { throw new Error(t || ('HTTP ' + res.status)); }); }
    });
  }

  function summarizePlanForStore(p) {
    return {
      course: p.course ? p.course.id : null,
      events: p.events.map(function (e) { return e.id; }),
      why: p.why
    };
  }

  function toggleSave(id, btn) {
    var i = state.saved.indexOf(id);
    if (i === -1) state.saved.push(id); else state.saved.splice(i, 1);
    var s = loadStore(); s.saved = state.saved; saveStore(s);
    var saved = state.saved.indexOf(id) !== -1;
    btn.classList.toggle('saved', saved);
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    btn.querySelector('.save-txt').textContent = saved ? 'Saved' : 'Save';
  }

  function restart() {
    state.answers = { level: null, goal: null, hours: null, motivation: null, location: { city: null, onlineOnly: false } };
    state.plan = null;
    clearHash();
    renderLanding();
  }

  /* =====================================================================
   * SHARE + HASH
   * ===================================================================== */
  function writeHash(a) {
    try {
      var payload = encodeURIComponent(JSON.stringify(a));
      history.replaceState(null, '', '#plan=' + payload);
    } catch (e) {}
  }
  function clearHash() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  function readHash() {
    var m = /#plan=([^&]+)/.exec(location.hash);
    if (!m) return null;
    try {
      var a = JSON.parse(decodeURIComponent(m[1]));
      if (a && a.level && a.goal && a.hours && a.motivation) {
        if (!a.location) a.location = { city: null, onlineOnly: true };
        return a;
      }
    } catch (e) {}
    return null;
  }

  function sharePlan() {
    var url = location.href;
    var done = function () { toast('Share link copied to clipboard.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
    } else { fallbackCopy(url); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* =====================================================================
   * TOAST
   * ===================================================================== */
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = '<span class="toast-ic">' + icon('shield') + '</span>' + esc(msg);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  /* =====================================================================
   * 3D TILT — restrained pointer-follow perspective on cards/options.
   * One delegated listener on #app (persists across renders). Desktop pointer
   * only; disabled for reduced-motion. Writes --rx/--ry the CSS transform reads.
   * ===================================================================== */
  var TILT_SEL = '.option, .course-card, .event-card';
  var TILT_MAX = 4; // degrees — restrained
  var tiltEl = null, tiltRaf = 0, tiltCX = 0, tiltCY = 0;
  function clearTilt(el) { if (el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } }
  function applyTilt() {
    tiltRaf = 0;
    var el = tiltEl; if (!el) return;
    var r = el.getBoundingClientRect();
    var dx = (tiltCX - r.left) / r.width - 0.5;
    var dy = (tiltCY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', (dx * TILT_MAX).toFixed(2) + 'deg');
    el.style.setProperty('--rx', (-dy * TILT_MAX).toFixed(2) + 'deg');
  }
  function wireTilt() {
    if (prefersReduced) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    app.addEventListener('pointermove', function (e) {
      var el = e.target.closest ? e.target.closest(TILT_SEL) : null;
      if (el !== tiltEl) { clearTilt(tiltEl); tiltEl = el; }
      if (!el) return;
      tiltCX = e.clientX; tiltCY = e.clientY;
      if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
    });
    app.addEventListener('pointerleave', function () { clearTilt(tiltEl); tiltEl = null; });
  }

  /* =====================================================================
   * THEME — light/dark toggle. Head script sets data-theme pre-paint;
   * here we sync aria-label + meta theme-color and wire the toggle button.
   * ===================================================================== */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('onramp-theme', t); } catch (e) {}
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#EAF3F0' : '#051117');
  }
  /* Circular reveal via the View Transitions API — the new theme wipes out from
   * the toggle. Falls back to an instant swap (Firefox, reduced-motion). */
  function flipTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) { applyTheme(next); return; }
    var btn = document.getElementById('theme-toggle');
    var r = btn.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var vt = document.startViewTransition(function () { applyTheme(next); });
    vt.ready.then(function () {
      document.documentElement.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 550, easing: 'cubic-bezier(.22, 1, .36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
  }
  function wireTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', flipTheme);
  }

  /* =====================================================================
   * BOOT
   * ===================================================================== */
  function boot() {
    app = document.getElementById('app');
    if (!app) return; // loaded outside the app (e.g. test page) — expose samples only
    wireTheme();
    wireTilt();
    var shared = readHash();
    if (shared) {
      state.answers = shared;
      state.plan = window.buildPlan(state.answers, getCourses(), getEvents());
      renderPlan();
    } else {
      renderLanding();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
