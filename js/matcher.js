/* Curio — matcher.js
 * Pure, no-DOM. Attaches window.buildPlan(answers, courses, events).
 * buildPlan → { course, events:[2-3], why:{ course:"…", events:{ [id]:"…" } } }
 *
 * Scoring (SPEC): course level ×3 (HARD — never violated), goal ×2, motivation ×2, hours ×1.
 * Events: beginnerSafe strongly boosted for level=new; online-first unless city matches;
 * sooner dates win ties; max 1 hackathon unless goal is job/build.
 * Guarantee: never a null course, never <2 events, while any data exists.
 */
(function (global) {
  'use strict';

  // ---------- helpers ----------
  var has = function (arr, v) { return Array.isArray(arr) && arr.indexOf(v) !== -1; };
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // ---------- course pick (hard level filter + relaxation ladder) ----------
  function courseScore(c, a) {
    // level is guaranteed to match in the pool, but scored for completeness
    return (has(c.levels, a.level) ? 3 : 0) +
           (has(c.goals, a.goal) ? 2 : 0) +
           (has(c.motivations, a.motivation) ? 2 : 0) +
           (has(c.hoursFit, a.hours) ? 1 : 0);
  }

  function pickCourse(a, courses) {
    if (!courses || !courses.length) return null;
    var byLevel = courses.filter(function (c) { return has(c.levels, a.level); });
    // level is NEVER dropped. Data-integrity fallback only if the dataset has no
    // level-correct course at all (spec M6 guarantees it does) — keeps course non-null.
    var pool = byLevel.length ? byLevel : courses.slice();

    // Soft requirements, dropped in order: motivation → hours → goal (goal kept longest).
    var reqs = {
      goal:       function (c) { return has(c.goals, a.goal); },
      hours:      function (c) { return has(c.hoursFit, a.hours); },
      motivation: function (c) { return has(c.motivations, a.motivation); }
    };
    var ladders = [
      ['goal', 'hours', 'motivation'], // all three
      ['goal', 'hours'],               // drop motivation
      ['goal'],                        // drop hours
      []                               // drop goal (level still applied via pool)
    ];
    var candidates = pool;
    for (var i = 0; i < ladders.length; i++) {
      var keep = ladders[i];
      var filtered = pool.filter(function (c) {
        return keep.every(function (k) { return reqs[k](c); });
      });
      if (filtered.length) { candidates = filtered; break; }
    }

    // best weighted score; tie-break: free/cheaper first, then original order (stable)
    var costRank = { free: 0, freemium: 1, paid: 2 };
    return candidates.slice().sort(function (x, y) {
      var d = courseScore(y, a) - courseScore(x, a);
      if (d) return d;
      return (costRank[x.cost] == null ? 3 : costRank[x.cost]) -
             (costRank[y.cost] == null ? 3 : costRank[y.cost]);
    })[0];
  }

  // ---------- event pick (soft scoring + guaranteed top-N fill) ----------
  function eventScore(e, a) {
    var s = 0;
    if (has(e.goals, a.goal)) s += 2;
    if (has(e.motivations, a.motivation)) s += 2;

    // beginner-safety: strongly boosted for absolute beginners
    if (e.beginnerSafe) s += (a.level === 'new') ? 5 : 1;

    // location: online is the universally-attendable backbone; a real local match can beat it
    var loc = a.location || {};
    var onlineOnly = !!loc.onlineOnly;
    var city = loc.city ? String(loc.city).toLowerCase() : '';
    var eCity = e.city ? String(e.city).toLowerCase() : '';
    var cityMatch = city && eCity && (eCity.indexOf(city) !== -1 || city.indexOf(eCity) !== -1);

    if (e.mode === 'online') s += 3;
    else if (e.mode === 'hybrid') s += 2 + (cityMatch ? 3 : 0);
    else { // in-person
      if (onlineOnly) s -= 50;      // can't attend — effectively excluded unless nothing else
      else if (cityMatch) s += 5;   // local & attendable → best case
      else s -= 8;                  // in-person elsewhere: possible but low value
    }
    return s;
  }

  function pickEvents(a, events) {
    if (!events || !events.length) return [];
    var t = todayISO();
    var upcoming = events.filter(function (e) { return !e.dateISO || e.dateISO >= t; });
    var pool = (upcoming.length >= 2) ? upcoming : events.slice(); // fallback: accept any if starved

    var scored = pool.slice().sort(function (x, y) {
      var d = eventScore(y, a) - eventScore(x, a);
      if (d) return d;
      // sooner dates win ties
      var dx = x.dateISO || '9999', dy = y.dateISO || '9999';
      if (dx !== dy) return dx < dy ? -1 : 1;
      return String(x.id).localeCompare(String(y.id));
    });

    var allowManyHack = (a.goal === 'job' || a.goal === 'build');
    var chosen = [], hacks = 0, k;
    for (k = 0; k < scored.length && chosen.length < 3; k++) {
      var e = scored[k];
      if (e.kind === 'hackathon' && !allowManyHack && hacks >= 1) continue;
      chosen.push(e);
      if (e.kind === 'hackathon') hacks++;
    }
    // guarantee >=2 even if the hackathon cap starved us
    for (k = 0; k < scored.length && chosen.length < 2; k++) {
      if (chosen.indexOf(scored[k]) === -1) chosen.push(scored[k]);
    }
    return chosen.slice(0, 3);
  }

  // ---------- why-lines (templated from answers) ----------
  var MOT_LEAD = {
    escape:  'You said you want out.',
    compete: 'You said you need an edge to get hired.',
    curious: 'You said you just want to understand it.',
    belong:  "You said you're tired of learning alone."
  };
  var GOAL_PAYOFF = {
    job:        'This is the shortest credible path from zero to employable — start tonight, not someday.',
    switch:     'This is a real bridge out of your current field, one evening at a time.',
    build:      "This is enough to actually ship your first thing — not just nod along in meetings.",
    understand: "This is genuine literacy, so AI stops feeling like magic you're locked out of."
  };

  function courseWhy(a) {
    var lead = MOT_LEAD[a.motivation] || 'Here’s your starting line.';
    var payoff = GOAL_PAYOFF[a.goal] || 'A credible first step that actually fits your week.';
    return lead + ' ' + payoff;
  }

  function eventWhy(e, a) {
    var fit;
    if (a.level === 'new' && e.beginnerSafe) {
      fit = 'beginner-safe — first-timers are explicitly welcome, so walking in won’t be scary.';
    } else if (a.motivation === 'belong') {
      fit = 'a real room of people learning this too — the antidote to doing it alone.';
    } else if (e.kind === 'hackathon') {
      fit = 'build something real in a weekend and walk out with proof you did.';
    } else if (e.kind === 'workshop') {
      fit = 'hands-on — you’ll leave having made something, not just watched.';
    } else if (e.kind === 'study-group') {
      fit = 'a steady group to keep you honest week to week.';
    } else {
      fit = 'a low-stakes way to meet people already doing this.';
    }
    return (e.dateLabel ? e.dateLabel + ' · ' : '') + fit;
  }

  // ---------- entry ----------
  function buildPlan(answers, courses, events) {
    var a = answers || {};
    var course = pickCourse(a, courses || []);
    var evs = pickEvents(a, events || []);
    var why = { course: courseWhy(a), events: {} };
    evs.forEach(function (e) { why.events[e.id] = eventWhy(e, a); });
    return { course: course, events: evs, why: why };
  }

  global.buildPlan = buildPlan;
  // also expose pieces for tests/debugging
  global.OnRampMatcher = { buildPlan: buildPlan, eventScore: eventScore, courseScore: courseScore };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.OnRampMatcher;
})(typeof window !== 'undefined' ? window : globalThis);
