/* OnRamp — app.js
 * State machine (no router) for 3 screens: landing → intake → plan.
 * Loads window.COURSES / window.EVENTS from data/*.js; falls back to the INLINE
 * samples below so the app runs standalone. Rendering + micro-interactions live here.
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

  /* =====================================================================
   * INLINE FALLBACK DATA (used only when data/courses.js & data/events.js
   * are missing or empty). Schemas match SPEC.md exactly. The data-courses
   * and data-events agents own the full curated sets.
   * ===================================================================== */
  var SAMPLE_COURSES = [
    {
      id: 'ai-for-everyone', title: 'AI For Everyone',
      provider: 'DeepLearning.AI (Coursera)',
      url: 'https://www.coursera.org/learn/ai-for-everyone',
      levels: ['new', 'dabbled'], goals: ['understand', 'switch'],
      motivations: ['curious', 'escape'], hoursFit: ['lt3', '3to6'],
      durationLabel: '~6 hrs total', cost: 'free', format: 'video course',
      tagline: 'The classic non-technical AI primer', topics: ['fundamentals'],
      firstStep: 'Watch Week 1 (50 min) tonight'
    },
    {
      id: 'elements-of-ai', title: 'Elements of AI',
      provider: 'University of Helsinki',
      url: 'https://www.elementsofai.com/',
      levels: ['new', 'dabbled'], goals: ['understand', 'switch', 'job'],
      motivations: ['curious', 'belong'], hoursFit: ['lt3', '3to6', '7plus'],
      durationLabel: '~30 hrs, self-paced', cost: 'free', format: 'online course',
      tagline: 'Free, friendly, and genuinely foundational', topics: ['fundamentals', 'ml'],
      firstStep: 'Finish Chapter 1 “What is AI?” this week'
    },
    {
      id: 'prompt-eng-devs', title: 'ChatGPT Prompt Engineering for Developers',
      provider: 'DeepLearning.AI',
      url: 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/',
      levels: ['dabbled', 'coder'], goals: ['build', 'job'],
      motivations: ['compete', 'curious', 'escape'], hoursFit: ['lt3', '3to6'],
      durationLabel: '~1.5 hrs total', cost: 'free', format: 'short course',
      tagline: 'From prompt-guessing to prompt-engineering', topics: ['prompting', 'llm-apps'],
      firstStep: 'Do the first two lessons in the browser sandbox now'
    },
    {
      id: 'fastai-practical', title: 'Practical Deep Learning for Coders',
      provider: 'fast.ai',
      url: 'https://course.fast.ai/',
      levels: ['coder'], goals: ['build', 'job', 'switch'],
      motivations: ['compete', 'escape', 'curious'], hoursFit: ['3to6', '7plus'],
      durationLabel: '~40 hrs, project-based', cost: 'free', format: 'code-along course',
      tagline: 'Ship a working model in lesson one', topics: ['python', 'ml', 'llm-apps'],
      firstStep: 'Set up the notebook and run Lesson 1 end-to-end'
    }
  ];

  var SAMPLE_EVENTS = [
    {
      id: 'ai-tinkerers-jul', title: 'AI Tinkerers Meetup', org: 'AI Tinkerers',
      url: 'https://aitinkerers.org/', source: 'luma', dateISO: '2026-07-18',
      dateLabel: 'Sat · Jul 18', mode: 'online', city: null, kind: 'meetup',
      beginnerSafe: true, beginnerNote: 'First-timers welcome — intros round, no demos required',
      prepTopic: 'prompting', goals: ['build', 'job'], motivations: ['belong', 'curious'], free: true
    },
    {
      id: 'eoai-study-group-jul', title: 'Elements of AI Study Group', org: 'Community',
      url: 'https://www.elementsofai.com/', source: 'meetup', dateISO: '2026-07-22',
      dateLabel: 'Wed · Jul 22', mode: 'online', city: null, kind: 'study-group',
      beginnerSafe: true, beginnerNote: 'Absolute beginners encouraged — we go one chapter at a time',
      prepTopic: 'fundamentals', goals: ['understand', 'switch'], motivations: ['belong', 'curious'], free: true
    },
    {
      id: 'build-weekend-aug', title: 'AI Build Weekend', org: 'Devpost',
      url: 'https://devpost.com/hackathons', source: 'devpost', dateISO: '2026-08-09',
      dateLabel: 'Sat · Aug 9', mode: 'online', city: null, kind: 'hackathon',
      beginnerSafe: false, beginnerNote: '', prepTopic: 'llm-apps',
      goals: ['build', 'job'], motivations: ['compete', 'escape'], free: true
    },
    {
      id: 'genai-workshop-sf-aug', title: 'Generative AI Workshop', org: 'SF AI Meetup',
      url: 'https://www.meetup.com/', source: 'meetup', dateISO: '2026-08-15',
      dateLabel: 'Sat · Aug 15', mode: 'in-person', city: 'San Francisco', kind: 'workshop',
      beginnerSafe: true, beginnerNote: 'No experience needed — laptops provided, pair-friendly',
      prepTopic: 'prompting', goals: ['build', 'understand'], motivations: ['curious', 'belong'], free: false
    }
  ];

  // expose samples so test/matcher-test.html can reuse the exact same fallback
  window.SAMPLE_COURSES = SAMPLE_COURSES;
  window.SAMPLE_EVENTS = SAMPLE_EVENTS;

  function getCourses() { return (window.COURSES && window.COURSES.length) ? window.COURSES : SAMPLE_COURSES; }
  function getEvents() { return (window.EVENTS && window.EVENTS.length) ? window.EVENTS : SAMPLE_EVENTS; }

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
      case 'arrow':
        return wrap('<path d="M5 12h13m0 0-5-5m5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'back':
        return wrap('<path d="M19 12H6m0 0 5-5m-5 5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
      case 'share':
        return wrap('<circle cx="6" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="6" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="18" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="m8 11 7-4M8 13l7 4" stroke="currentColor" stroke-width="1.6"/>');
      case 'bookmark':
        return wrap('<path d="M7 4h10v16l-5-3.5L7 20V4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/>');
      default:
        return wrap('<circle cx="12" cy="12" r="8" stroke="#7AE2CF" stroke-width="1.6"/>');
    }
  }

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
    answers: { level: null, goal: null, hours: null, motivation: null, location: { city: null, onlineOnly: false } },
    plan: null,
    saved: (loadStore().saved || [])
  };

  var app;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* =====================================================================
   * SCREEN TRANSITIONS
   * ===================================================================== */
  function render(html, opts) {
    opts = opts || {};
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
  function renderLanding() {
    state.screen = 'landing';
    render(
      '<section class="landing">' +
        '<div class="hero-glow" aria-hidden="true"></div>' +
        heroDecor() +
        '<div class="hero">' +
          '<div class="brand"><span class="brand-mark">' + icon('compass', 'brand-ic') + '</span><span class="brand-name">OnRamp</span></div>' +
          '<h1 class="hero-title">Stop doomscrolling AI.<br><span class="grad">One course, real rooms, one plan.</span></h1>' +
          '<p class="hero-sub">A course to start tonight, real rooms this month, sized to the week you actually have.</p>' +
          '<div class="anti-gpt"><span class="anti-ic">' + icon('spark') + '</span><p>ChatGPT hands you a plan and forgets you. OnRamp hands you one next step and a real room to walk into.</p></div>' +
          '<button class="btn btn-primary btn-lg" id="cta-start">Get my plan <span class="ar">' + icon('arrow') + '</span></button>' +
          '<p class="footnote">Free · No account · 2 minutes</p>' +
        '</div>' +
        '<div class="how">' +
          '<div class="how-title">How it works</div>' +
          '<ol class="how-steps">' +
            '<li class="how-step"><span class="how-n">1</span><span class="how-ic">' + icon('compass') + '</span><div><strong>Answer 5 taps</strong><span>Level, goal, time, and the real why.</span></div></li>' +
            '<li class="how-step"><span class="how-n">2</span><span class="how-ic">' + icon('spark') + '</span><div><strong>Get 1 course + real rooms</strong><span>One next step, not a catalog.</span></div></li>' +
            '<li class="how-step"><span class="how-n">3</span><span class="how-ic">' + icon('people') + '</span><div><strong>Show up</strong><span>Momentum beats motivation.</span></div></li>' +
          '</ol>' +
        '</div>' +
      '</section>'
    );
    document.getElementById('cta-start').addEventListener('click', startIntake);
  }

  function heroDecor() {
    return '<svg class="hero-decor" viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid slice">' +
      '<defs>' +
        '<radialGradient id="hd1" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7AE2CF" stop-opacity=".55"/><stop offset="1" stop-color="#7AE2CF" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="hd2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AE2CF"/><stop offset="1" stop-color="#1B8C77"/></linearGradient>' +
      '</defs>' +
      '<circle class="orb orb-a" cx="320" cy="70" r="70" fill="url(#hd1)"/>' +
      '<circle class="orb orb-b" cx="70" cy="230" r="90" fill="url(#hd1)"/>' +
      '<g class="constellation" stroke="url(#hd2)" stroke-width="1" opacity=".5" fill="none">' +
        '<path d="M40 60 L120 40 L200 90 L300 50"/>' +
        '<path d="M120 40 L140 120 L200 90"/>' +
        '<circle cx="40" cy="60" r="3" fill="#7AE2CF"/><circle cx="120" cy="40" r="3" fill="#7AE2CF"/><circle cx="200" cy="90" r="3" fill="#7AE2CF"/><circle cx="300" cy="50" r="3" fill="#7AE2CF"/><circle cx="140" cy="120" r="3" fill="#7AE2CF"/>' +
      '</g>' +
    '</svg>';
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
    var pct = Math.round(((i) / STEPS.length) * 100);
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
          '<button class="btn-ghost back" id="back-btn" aria-label="Back">' + icon('back') + '</button>' +
          '<div class="progress-wrap"><div class="progress-label">Question ' + (i + 1) + ' of ' + STEPS.length + '</div>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>' +
        '</div>' +
        '<h2 class="q-title">' + s.title + '</h2>' +
        '<p class="q-sub">' + esc(s.sub) + '</p>' +
        body +
      '</section>',
      { focus: s.type === 'location' ? '#city-input' : '.option' }
    );

    // animate progress fill to include current step once mounted
    var fill = app.querySelector('.progress-fill');
    if (fill) requestAnimationFrame(function () { fill.style.width = Math.round(((i + 1) / STEPS.length) * 100) + '%'; });

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
  function buildAndShowPlan() {
    state.plan = window.buildPlan(state.answers, getCourses(), getEvents());
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
      '<article class="card course-card" id="course-anchor" style="--d:120ms">' +
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
      return '<article class="card event-card" style="--d:' + (200 + idx * 90) + 'ms">' +
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
          '<a class="btn btn-primary" href="' + esc(e.url) + '" target="_blank" rel="noopener">Sign up <span class="ar">' + icon('arrow') + '</span></a>' +
        '</div>' +
      '</article>';
    }).join('');

    render(
      '<section class="plan">' +
        '<div class="plan-head">' +
          '<button class="btn-ghost back" id="remix" aria-label="Remix answers">' + icon('back') + '<span>Remix</span></button>' +
          '<button class="btn-ghost share" id="share-btn">' + icon('share') + '<span>Share</span></button>' +
        '</div>' +
        '<h2 class="plan-title">Your next step, <span class="grad">not a catalog</span></h2>' +
        '<p class="plan-summary">' + esc(summaryLine(a)) + '</p>' +
        '<div class="spine">' +
          courseCard +
          '<div class="spine-events"><div class="step-badge ghost"><span class="step-num">2</span> Show up to these rooms</div>' +
            (window.EVENTS_UPDATED ? '<p class="fresh-stamp">' + icon('spark') + 'Live events — refreshed ' + esc(freshLabel(window.EVENTS_UPDATED)) + '</p>' : '') +
            eventCards + '</div>' +
          '<article class="card teaser" style="--d:' + (200 + p.events.length * 90 + 90) + 'ms"><div class="step-badge ghost"><span class="step-num">3</span> What’s next</div>' +
            '<p class="teaser-txt">Finish Step 1, show up to one room, and the next rung gets obvious: a project, a deeper course, a community. Save the plan to your inbox for when you’re ready.</p></article>' +
        '</div>' +
        '<div class="email-door card">' +
          '<div class="email-head">' + icon('mail') + '<div><strong>Email me my plan</strong><span>' + (emailEnabled() ? 'The full plan in your inbox, links and all.' : 'Saved on this device so it’s here when you come back.') + '</span></div></div>' +
          '<form class="email-form" id="email-form">' +
            '<input id="email-input" type="email" required placeholder="you@email.com" aria-label="Your email" />' +
            '<button class="btn btn-primary" id="email-send-btn" type="submit">Send it</button>' +
          '</form>' +
        '</div>' +
      '</section>'
    );

    // wire
    document.getElementById('remix').addEventListener('click', remix);
    document.getElementById('share-btn').addEventListener('click', sharePlan);
    Array.prototype.forEach.call(app.querySelectorAll('.save-btn'), function (b) {
      b.addEventListener('click', function () { toggleSave(b.getAttribute('data-save'), b); });
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

  function remix() {
    state.answers = { level: null, goal: null, hours: null, motivation: null, location: { city: null, onlineOnly: false } };
    state.plan = null;
    clearHash();
    startIntake();
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
   * BOOT
   * ===================================================================== */
  function boot() {
    app = document.getElementById('app');
    if (!app) return; // loaded outside the app (e.g. test page) — expose samples only
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
