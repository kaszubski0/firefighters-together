/* Firefighters Together — vanilla JS, no dependencies.
   All data is rendered with createElement / textContent. No innerHTML. */
(function () {
  'use strict';

  var SITE_NAME = 'Firefighters Together';
  var SITE_UPDATED = '2026-10-07';
  var DISCLAIMER = 'This is a prototype. Firefighters Together is an unofficial, independent directory compiled from publicly available information. It is not affiliated with or endorsed by any organization listed, and it does not provide legal, financial, or medical advice. Please confirm all information directly with each organization.';
  var BENEFITS_NOTICE = 'Benefits and eligibility rules vary by state and by individual situation. Please confirm all details directly with each office.';
  var LOG = '[Firefighters Together]';

  var STATIONS = [
    { key: 'community', num: 1, name: 'Community', icon: 'firehouse',
      blurb: 'Retiree groups, associations, and museums near you.',
      purpose: 'Retired from the job? There are people near you who know what it was like.' },
    { key: 'volunteer', num: 2, name: 'Volunteer', icon: 'ladder',
      blurb: 'Ways your experience can keep serving your community.',
      purpose: 'Your experience still counts. Find ways to keep serving close to home.' },
    { key: 'family', num: 3, name: 'Family', icon: 'hydrant',
      blurb: 'Support and community for fire families.',
      purpose: 'The job is a family matter. Find support and people who understand.' },
    { key: 'benefits', num: 4, name: 'Benefits', icon: 'helmet',
      blurb: 'Links to your state’s official benefits offices.',
      purpose: 'Go straight to the official offices. Nothing here explains the rules.' }
  ];

  var AUDIENCE_LABELS = { retirees: 'Retirees', active: 'Active', both: 'Active and retired', family: 'Families' };
  var VERIFIED_LABELS = { verified: 'Verified', official_directory: 'From official directory' };
  var SHOWN = ['verified', 'official_directory']; // needs_check entries are never shown

  // Approximate geographic tile layout: [abbr, column, row]
  var TILES = [
    ['AK', 0, 0], ['ME', 10, 0],
    ['WI', 5, 1], ['VT', 9, 1], ['NH', 10, 1],
    ['WA', 0, 2], ['ID', 1, 2], ['MT', 2, 2], ['ND', 3, 2], ['MN', 4, 2], ['IL', 5, 2], ['MI', 6, 2], ['NY', 8, 2], ['MA', 9, 2],
    ['OR', 0, 3], ['NV', 1, 3], ['WY', 2, 3], ['SD', 3, 3], ['IA', 4, 3], ['IN', 5, 3], ['OH', 6, 3], ['PA', 7, 3], ['NJ', 8, 3], ['CT', 9, 3], ['RI', 10, 3],
    ['CA', 0, 4], ['UT', 1, 4], ['CO', 2, 4], ['NE', 3, 4], ['MO', 4, 4], ['KY', 5, 4], ['WV', 6, 4], ['VA', 7, 4], ['MD', 8, 4], ['DE', 9, 4],
    ['AZ', 1, 5], ['NM', 2, 5], ['KS', 3, 5], ['AR', 4, 5], ['TN', 5, 5], ['NC', 6, 5], ['SC', 7, 5],
    ['OK', 3, 6], ['LA', 4, 6], ['MS', 5, 6], ['AL', 6, 6], ['GA', 7, 6],
    ['HI', 0, 7], ['TX', 3, 7], ['FL', 8, 7]
  ];

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

  var ICONS = {
    helmet: ['M5 13a7 7 0 0 1 14 0', 'M2.5 13h19l-1.5 4.5H4z', 'M12 6v7'],
    ladder: ['M8 3v18', 'M16 3v18', 'M8 7h8', 'M8 11h8', 'M8 15h8', 'M8 19h8'],
    hydrant: ['M7 20h10', 'M9 20V10a3 3 0 0 1 6 0v10', 'M12 4v3', 'M10.5 7h3', 'M9 13H6v3h3', 'M15 13h3v3h-3'],
    firehouse: ['M3 21V9l9-5 9 5v12', 'M3 21h18', 'M9 21v-7h6v7', 'M9 17.5h6', 'M12 8.5v.01'],
    info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8v.01'],
    external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
    pin: ['M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z', 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
    close: ['M6 6l12 12', 'M18 6L6 18']
  };

  var page = document.body.getAttribute('data-page');
  var main = document.getElementById('main');
  var states = [];
  var pendingTabFocus = false;
  var routeToken = 0;
  var dialog = null;

  /* ---------- helpers ---------- */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    var key;
    if (attrs) {
      for (key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
        var val = attrs[key];
        if (val === null || val === undefined || val === false) continue;
        if (key === 'class') el.className = val;
        else if (key.slice(0, 2) === 'on') el.addEventListener(key.slice(2), val);
        else el.setAttribute(key, val === true ? '' : String(val));
      }
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }

  function icon(name, size) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    var attrs = { viewBox: '0 0 24 24', width: size || 24, height: size || 24, fill: 'none',
      stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round',
      'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', 'class': 'icon' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    return MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1];
  }

  function isHttps(u) {
    if (typeof u !== 'string' || u.indexOf('https://') !== 0) return false;
    try { return new URL(u).protocol === 'https:'; } catch (e) { return false; }
  }

  function extLink(url, label, cls) {
    return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', 'class': cls || null },
      label, h('span', { class: 'sr-only' }, ' (opens in new tab)'), icon('external', 16));
  }

  function callout(text, extraClass) {
    return h('div', { class: 'callout' + (extraClass ? ' ' + extraClass : ''), role: 'note' },
      icon('info', 22), h('div', null, h('p', null, text)));
  }

  function setTitle(parts) {
    document.title = parts.concat([SITE_NAME]).join(' – ');
  }

  function stateBySlug(slug) {
    return states.filter(function (s) { return s.slug === slug; })[0];
  }

  /* ---------- data ---------- */

  var cache = {};
  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(path, { credentials: 'omit' }).then(function (r) {
        if (!r.ok) throw new Error(path + ' returned ' + r.status);
        return r.json();
      }).catch(function (err) { delete cache[path]; throw err; });
    }
    return cache[path];
  }

  var REQUIRED = ['id', 'station', 'category', 'name', 'url', 'verification'];
  var STATION_KEYS = STATIONS.map(function (s) { return s.key; });

  // Accepts { entries: [...] } or a bare array. Returns only entries that are valid and may be shown.
  function visibleEntries(doc, source) {
    var list = Array.isArray(doc) ? doc : (doc && Array.isArray(doc.entries) ? doc.entries : []);
    var out = [];
    var hidden = 0;
    list.forEach(function (e) {
      var problem = null;
      if (!e || typeof e !== 'object') problem = 'not an object';
      else {
        for (var i = 0; i < REQUIRED.length && !problem; i++) {
          if (typeof e[REQUIRED[i]] !== 'string' || !e[REQUIRED[i]]) problem = 'missing ' + REQUIRED[i];
        }
        if (!problem && STATION_KEYS.indexOf(e.station) === -1) problem = 'unknown station "' + e.station + '"';
        if (!problem && !isHttps(e.url)) problem = 'url must start with https://';
        if (!problem && e.events_url && !isHttps(e.events_url)) problem = 'events_url must start with https://';
        if (!problem && e.last_verified && !formatDate(e.last_verified)) problem = 'last_verified must be YYYY-MM-DD';
      }
      if (problem) { console.warn(LOG + ' Skipped entry "' + (e && e.id) + '" in ' + source + ': ' + problem); return; }
      if (SHOWN.indexOf(e.verification) === -1) { hidden++; return; }
      out.push(e);
    });
    if (hidden) console.info(LOG + ' ' + hidden + ' unverified entries in ' + source + ' are not shown.');
    return out;
  }

  /* ---------- shared header / footer ---------- */

  function buildChrome() {
    var header = document.getElementById('site-header');
    header.appendChild(h('div', { class: 'header-inner' },
      h('a', { class: 'brand', href: 'index.html#/' }, icon('helmet', 28), SITE_NAME),
      h('nav', { 'aria-label': 'Site' },
        h('a', { class: 'nav-link', href: 'about.html', 'aria-current': page === 'about' ? 'page' : null }, 'About'))));
    function onScroll() { header.classList.toggle('scrolled', window.scrollY > 4); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    document.getElementById('site-footer').appendChild(h('div', { class: 'footer-inner' },
      h('p', null, DISCLAIMER),
      h('div', { class: 'footer-meta' },
        h('a', { href: 'about.html' }, 'About this site'),
        h('span', null, 'Last site update: ' + formatDate(SITE_UPDATED)),
        h('span', null, 'Built as a free community resource.'))));
  }

  /* ---------- state picker (ARIA combobox) ---------- */

  function highlight(text, q) {
    var i = q ? text.toLowerCase().indexOf(q) : -1;
    if (i === -1) return text;
    return [text.slice(0, i), h('mark', null, text.slice(i, i + q.length)), text.slice(i + q.length)];
  }

  function buildPicker(idBase, opts) {
    opts = opts || {};
    var input = h('input', { type: 'text', id: idBase + '-input', 'class': 'picker-input', role: 'combobox',
      'aria-expanded': 'false', 'aria-controls': idBase + '-list', 'aria-autocomplete': 'list',
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Where do you live? Type your state' });
    var list = h('ul', { 'class': 'picker-list', id: idBase + '-list', role: 'listbox', 'aria-label': 'States', hidden: true });
    var status = h('p', { 'class': 'sr-only', 'aria-live': 'polite' });
    var error = h('p', { 'class': 'picker-error', role: 'alert', hidden: true });
    var matches = [];
    var active = -1;
    var query = '';

    function compute(raw) {
      query = raw.trim().toLowerCase();
      if (!query) {
        matches = states.slice().sort(function (a, b) {
          if (a.coverage !== b.coverage) return a.coverage === 'detailed' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return;
      }
      var scored = [];
      states.forEach(function (s) {
        var name = s.name.toLowerCase();
        var abbr = s.abbr.toLowerCase();
        var score = -1;
        if (abbr === query) score = 0;
        else if (name.indexOf(query) === 0) score = 1;
        else if (name.indexOf(' ' + query) !== -1) score = 2;
        else if (name.indexOf(query) !== -1) score = 3;
        if (score >= 0) scored.push({ s: s, score: score });
      });
      scored.sort(function (a, b) { return a.score - b.score || a.s.name.localeCompare(b.s.name); });
      matches = scored.map(function (x) { return x.s; });
    }

    function renderList() {
      list.textContent = '';
      matches.forEach(function (s, i) {
        var detailed = s.coverage === 'detailed';
        var li = h('li', { role: 'option', id: idBase + '-opt-' + s.slug, 'class': 'picker-opt' + (i === active ? ' active' : ''),
          'aria-selected': String(i === active) },
          h('span', { 'class': 'opt-name' }, highlight(s.name, query)),
          h('span', { 'class': 'opt-abbr' }, s.abbr),
          h('span', { 'class': 'pill ' + (detailed ? 'pill-detailed' : 'pill-basic') }, detailed ? 'Detailed listings' : 'Basic info'));
        li.addEventListener('mousedown', function (ev) { ev.preventDefault(); choose(s); });
        list.appendChild(li);
      });
      if (!matches.length) list.appendChild(h('li', { 'class': 'picker-none', role: 'presentation' }, 'No state matches “' + input.value.trim() + '”.'));
      if (active >= 0 && matches[active]) input.setAttribute('aria-activedescendant', idBase + '-opt-' + matches[active].slug);
      else input.removeAttribute('aria-activedescendant');
      status.textContent = matches.length + (matches.length === 1 ? ' state available' : ' states available');
    }

    function open() {
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    function refresh(autoSelect) {
      compute(input.value);
      active = autoSelect && matches.length ? 0 : -1;
      error.hidden = true;
      renderList();
      open();
    }
    function move(delta) {
      if (list.hidden) refresh(false);
      if (!matches.length) return;
      active = active === -1 ? (delta > 0 ? 0 : matches.length - 1) : (active + delta + matches.length) % matches.length;
      renderList();
      var el = list.children[active];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    function choose(s) {
      close();
      input.value = '';
      if (opts.onChoose) opts.onChoose();
      location.hash = '#/' + s.slug + (opts.stationKey ? '/' + opts.stationKey : '');
    }
    function submit() {
      compute(input.value);
      var pick = active >= 0 && matches[active] ? matches[active] : (query && matches.length ? matches[0] : null);
      if (pick) { choose(pick); return; }
      error.textContent = 'Choose a state from the list.';
      error.hidden = false;
      input.focus();
    }

    input.addEventListener('focus', function () { refresh(Boolean(input.value.trim())); });
    input.addEventListener('click', function () { if (list.hidden) refresh(Boolean(input.value.trim())); });
    input.addEventListener('input', function () { refresh(true); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
      else if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
      else if (ev.key === 'Escape' && !list.hidden) { ev.preventDefault(); ev.stopPropagation(); close(); }
    });

    var wrap = h('div', { 'class': 'picker' },
      h('label', { 'class': 'sr-only', 'for': idBase + '-input' }, 'Choose your state'),
      h('div', { 'class': 'picker-row' },
        h('div', { 'class': 'picker-field' }, icon('pin', 22), input),
        h('button', { type: 'button', 'class': 'button', onclick: submit }, 'Find resources')),
      error, list, status);
    wrap.addEventListener('focusout', function (ev) {
      if (!ev.relatedTarget || !wrap.contains(ev.relatedTarget)) close();
    });
    return { el: wrap, input: input };
  }

  function openChangeState(stationKey) {
    if (!dialog) {
      dialog = h('dialog', { 'class': 'modal', 'aria-labelledby': 'modal-title' });
      document.body.appendChild(dialog);
    }
    dialog.textContent = '';
    var picker = buildPicker('modal-picker', { stationKey: stationKey, onChoose: function () { dialog.close(); } });
    dialog.appendChild(h('div', { 'class': 'modal-head' },
      h('h2', { id: 'modal-title' }, 'Change state'),
      h('button', { type: 'button', 'class': 'icon-btn', 'aria-label': 'Close', onclick: function () { dialog.close(); } }, icon('close', 22))));
    dialog.appendChild(picker.el);
    dialog.showModal();
    picker.input.focus();
  }

  /* ---------- tile map ---------- */

  function buildMap() {
    var tiles = TILES.map(function (t) {
      var s = states.filter(function (x) { return x.abbr === t[0]; })[0];
      if (!s) return null;
      var detailed = s.coverage === 'detailed';
      return h('a', { 'class': 'tile ' + (detailed ? 'tile-detailed' : 'tile-basic') + ' col-' + t[1] + ' row-' + t[2],
        href: '#/' + s.slug, 'data-name': s.name,
        'aria-label': s.name + (detailed ? ', detailed listings' : ', basic info') }, s.abbr);
    }).filter(Boolean);
    var sorted = states.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    return h('div', null,
      h('div', { 'class': 'tile-map' }, tiles),
      h('ul', { 'class': 'state-list' }, sorted.map(function (s) {
        return h('li', null, h('a', { href: '#/' + s.slug, 'class': s.coverage === 'detailed' ? 'is-detailed' : null }, s.name));
      })),
      h('ul', { 'class': 'legend', 'aria-label': 'Legend' },
        h('li', null, h('span', { 'class': 'swatch swatch-detailed' }), 'Detailed listings'),
        h('li', null, h('span', { 'class': 'swatch swatch-basic' }), 'Basic info')));
  }

  /* ---------- views ---------- */

  function renderHome() {
    var picker = buildPicker('hero-picker');
    return h('div', null,
      h('section', { 'class': 'hero-section' }, h('div', { 'class': 'wrap' }, h('div', { 'class': 'hero-panel' },
        h('h1', { 'class': 'hero', tabindex: '-1' }, 'Find your people. Close to home.'),
        h('p', { 'class': 'sub' }, 'A free directory for active and retired firefighters and their families — community groups, volunteer roles, family support, and official benefits offices, state by state.'),
        picker.el))),
      h('section', { 'class': 'section alt' }, h('div', { 'class': 'wrap' },
        h('h2', null, 'Four Stations'),
        h('ul', { 'class': 'station-tiles' }, STATIONS.map(function (s) {
          return h('li', null, h('span', { 'class': 'tile-icon' }, icon(s.icon, 28)),
            h('h3', null, 'Station ' + s.num + ': ' + s.name), h('p', null, s.blurb));
        })))),
      h('section', { 'class': 'section' }, h('div', { 'class': 'wrap' },
        h('h2', null, 'Browse by state'),
        buildMap())),
      h('section', { 'class': 'section alt' }, h('div', { 'class': 'wrap' },
        h('h2', null, 'How it works'),
        h('ol', { 'class': 'steps' },
          [['Choose your state', 'Type it above or tap it on the map.'],
           ['Pick a Station', 'Community, Volunteer, Family or Benefits.'],
           ['Visit the organization', 'Follow the link to their own official website.']].map(function (s, i) {
            return h('li', null, h('span', { 'class': 'step-num', 'aria-hidden': 'true' }, i + 1),
              h('div', null, h('strong', null, s[0]), h('span', null, s[1])));
          })))),
      h('section', { 'class': 'section' }, h('div', { 'class': 'wrap narrow' }, callout(DISCLAIMER, 'quiet'))));
  }

  function renderNotFound() {
    return h('div', { 'class': 'wrap narrow section' },
      h('h1', { tabindex: '-1' }, 'We couldn’t find that page'),
      h('p', null, 'The link may be old, or it may have a typo. Head back to the home page and choose your state from there.'),
      h('p', null, h('a', { 'class': 'button', href: '#/' }, 'Back to Home')));
  }

  function breadcrumb(crumbs) {
    return h('nav', { 'class': 'breadcrumb', 'aria-label': 'Breadcrumb' },
      h('ol', null, crumbs.map(function (c, i) {
        var last = i === crumbs.length - 1;
        return h('li', null, h('a', { href: c.href, 'aria-current': last ? 'page' : null }, c.label));
      })));
  }

  /* ---------- state page ---------- */

  function renderState(state, stationKey, query, all) {
    var station = STATIONS.filter(function (s) { return s.key === stationKey; })[0];
    var stationAll = all.filter(function (e) { return e.station === stationKey; });
    var byName = function (a, b) { return a.name.localeCompare(b.name); };
    var stateList = stationAll.filter(function (e) { return e.scope !== 'national'; }).sort(byName);
    var nationalList = stationAll.filter(function (e) { return e.scope === 'national'; }).sort(byName);

    var categories = [];
    var audiences = [];
    stationAll.forEach(function (e) {
      if (categories.indexOf(e.category) === -1) categories.push(e.category);
      var a = e.audience || 'both';
      if (audiences.indexOf(a) === -1) audiences.push(a);
    });
    categories.sort();
    var showAudience = stationKey !== 'benefits';
    var audienceChips = showAudience && audiences.length > 1;

    var filters = { category: '', audience: '' };
    var cq = query.get('category');
    if (cq && categories.indexOf(cq) !== -1) filters.category = cq;
    var aq = query.get('audience');
    if (aq && audienceChips && audiences.indexOf(aq) !== -1) filters.audience = aq;
    var q = (query.get('q') || '').slice(0, 80);
    var view = query.get('view') === 'table' ? 'table' : 'cards';
    var searchInput = null;

    var count = h('p', { 'class': 'count', 'aria-live': 'polite', tabindex: '-1' });
    var results = h('div', { 'class': 'results' });
    var chipsBox = h('div', { 'class': 'chips', role: 'group', 'aria-label': 'Filters' });
    var clearLink = h('button', { type: 'button', 'class': 'link-btn', onclick: clearFilters }, 'Clear filters');
    var cardsBtn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setView('cards'); } }, 'Cards');
    var tableBtn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setView('table'); } }, 'Table');

    function syncUrl() {
      var qs = new URLSearchParams();
      if (filters.category) qs.set('category', filters.category);
      if (filters.audience) qs.set('audience', filters.audience);
      if (q) qs.set('q', q);
      if (view === 'table') qs.set('view', 'table');
      var s = qs.toString();
      history.replaceState(null, '', '#/' + state.slug + '/' + stationKey + (s ? '?' + s : ''));
    }

    function setFilter(key, value, focusCount) {
      filters[key] = value;
      syncUrl();
      renderChips();
      renderResults();
      if (focusCount) count.focus();
    }

    function clearFilters() {
      filters.category = '';
      filters.audience = '';
      q = '';
      if (searchInput) searchInput.value = '';
      syncUrl();
      renderChips();
      renderResults();
      count.focus();
    }

    function setView(v) { view = v; syncUrl(); renderResults(); }

    function chip(key, value, label) {
      var on = filters[key] === value;
      return h('button', { type: 'button', 'class': 'chip', 'aria-pressed': String(on),
        onclick: function () { setFilter(key, on ? '' : value, false); } }, label);
    }

    function renderChips() {
      chipsBox.textContent = '';
      categories.forEach(function (c) { chipsBox.appendChild(chip('category', c, c)); });
      if (audienceChips) {
        audiences.forEach(function (a) { chipsBox.appendChild(chip('audience', a, AUDIENCE_LABELS[a] || a)); });
      }
    }

    function tagBtn(key, value, label) {
      var on = filters[key] === value;
      return h('button', { type: 'button', 'class': 'tag tag-btn', 'aria-pressed': String(on),
        'aria-label': 'Filter by ' + label, onclick: function () { setFilter(key, on ? '' : value, true); } }, label);
    }

    function entryTags(e) {
      var tags = [tagBtn('category', e.category, e.category)];
      if (showAudience) {
        var a = e.audience || 'both';
        tags.push(audienceChips ? tagBtn('audience', a, AUDIENCE_LABELS[a] || a)
          : h('span', { 'class': 'tag' }, AUDIENCE_LABELS[a] || a));
      }
      tags.push(h('span', { 'class': 'tag tag-' + e.verification }, VERIFIED_LABELS[e.verification] || e.verification));
      return h('div', { 'class': 'tags' }, tags);
    }

    function entryLinks(e) {
      return h('div', { 'class': 'links' },
        extLink(e.url, 'Visit website →', 'visit'),
        e.events_url ? extLink(e.events_url, 'Events page', null) : null);
    }

    function entryMeta(e) {
      return h('div', { 'class': 'meta' },
        e.last_verified ? h('span', null, 'Last verified: ' + formatDate(e.last_verified)) : null,
        e.source ? h('span', null, 'Source: ' + e.source) : null);
    }

    function card(e) {
      return h('li', { 'class': 'card' },
        h('p', { 'class': 'card-name' }, e.name),
        entryTags(e),
        e.description ? h('p', { 'class': 'desc' }, e.description) : null,
        e.experience_note ? h('p', { 'class': 'desc' }, h('strong', null, 'How your experience helps: '), e.experience_note) : null,
        e.note ? h('p', { 'class': 'note' }, e.note) : null,
        entryLinks(e),
        entryMeta(e));
    }

    function table(list, caption) {
      var cols = ['Name', 'Category'].concat(showAudience ? ['Audience'] : []).concat(['Last verified', 'Link']);
      return h('table', { 'class': 'entries' },
        h('caption', { 'class': 'sr-only' }, caption),
        h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { scope: 'col' }, c); }))),
        h('tbody', null, list.map(function (e) {
          var a = e.audience || 'both';
          return h('tr', null,
            h('td', null, h('strong', null, e.name),
              e.description ? h('p', { 'class': 'desc' }, e.description) : null,
              e.note ? h('p', { 'class': 'note' }, e.note) : null,
              h('span', { 'class': 'tag tag-' + e.verification }, VERIFIED_LABELS[e.verification] || e.verification)),
            h('td', { 'data-label': 'Category' }, tagBtn('category', e.category, e.category)),
            showAudience ? h('td', { 'data-label': 'Audience' }, audienceChips ? tagBtn('audience', a, AUDIENCE_LABELS[a] || a) : (AUDIENCE_LABELS[a] || a)) : null,
            h('td', { 'data-label': 'Last verified' }, e.last_verified ? formatDate(e.last_verified) : '—'),
            h('td', { 'data-label': 'Link' }, extLink(e.url, 'Visit website', 'visit')));
        })));
    }

    function group(list, caption) {
      return view === 'table' ? table(list, caption) : h('ul', { 'class': 'cards' }, list.map(card));
    }

    function matches(e) {
      var needle = q.trim().toLowerCase();
      if (needle && [e.name, e.category, e.description, e.note].join(' ').toLowerCase().indexOf(needle) === -1) return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.audience && (e.audience || 'both') !== filters.audience) return false;
      return true;
    }

    function renderResults() {
      var fs = stateList.filter(matches);
      var fn = nationalList.filter(matches);
      var active = !!(filters.category || filters.audience || q.trim());
      cardsBtn.setAttribute('aria-pressed', String(view === 'cards'));
      tableBtn.setAttribute('aria-pressed', String(view === 'table'));
      clearLink.hidden = !active;
      var total = fs.length + fn.length;
      count.textContent = total === stationAll.length
        ? total + (total === 1 ? ' listing' : ' listings')
        : 'Showing ' + total + ' of ' + stationAll.length + ' listings';
      results.textContent = '';
      if (!stationAll.length) {
        results.appendChild(h('div', { 'class': 'note-box' },
          h('p', null, station.name + ' listings for ' + state.name + ' are being added.')));
        return;
      }
      if (!total) {
        results.appendChild(h('div', { 'class': 'empty' },
          h('p', null, 'No matches. Try removing a filter.'),
          h('button', { type: 'button', 'class': 'button', onclick: clearFilters }, 'Clear filters')));
        return;
      }
      if (!stateList.length) {
        results.appendChild(h('div', { 'class': 'note-box' },
          h('p', null, 'Local listings for ' + state.name + ' are being added. In the meantime, here are national resources.')));
      }
      if (fs.length) {
        if (fn.length) results.appendChild(h('h3', { 'class': 'group-title' }, state.name));
        results.appendChild(group(fs, state.name + ' listings'));
      }
      if (fn.length) {
        results.appendChild(h('h3', { 'class': 'group-title' }, 'National'));
        results.appendChild(group(fn, 'National listings'));
      }
    }

    // Search + view toggle
    searchInput = h('input', { type: 'search', id: 'f-q', 'class': 'search', autocomplete: 'off', maxlength: '80',
      placeholder: 'Search this Station', oninput: function () { q = searchInput.value; syncUrl(); renderResults(); } });
    searchInput.value = q;
    var toolbar = stationAll.length ? h('div', { 'class': 'toolbar' },
      h('div', { 'class': 'search-wrap' }, h('label', { 'class': 'sr-only', 'for': 'f-q' }, 'Search this Station'), searchInput),
      h('div', { 'class': 'view-toggle', role: 'group', 'aria-label': 'View' }, cardsBtn, tableBtn)) : null;

    var visibleTotal = all.length;
    var stationsWith = STATIONS.filter(function (s) { return all.some(function (e) { return e.station === s.key; }); }).length;

    var tabs = h('div', { 'class': 'tabs', role: 'tablist', 'aria-label': state.name + ' Stations', onkeydown: tabKeys },
      STATIONS.map(function (s) {
        var on = s.key === stationKey;
        return h('a', { 'class': 'tab', role: 'tab', id: 'tab-' + s.key, href: '#/' + state.slug + '/' + s.key,
          'aria-selected': String(on), 'aria-controls': 'station-panel', tabindex: on ? '0' : '-1',
          onclick: function () { pendingTabFocus = true; } }, icon(s.icon, 20), 'Station ' + s.num + ': ' + s.name);
      }));

    renderChips();
    renderResults();

    return h('div', { 'class': 'wrap state-wrap' },
      breadcrumb([{ label: 'Home', href: '#/' }, { label: state.name, href: '#/' + state.slug },
        { label: station.name, href: '#/' + state.slug + '/' + station.key }]),
      h('div', { 'class': 'state-head' },
        h('div', null,
          h('h1', { tabindex: '-1' }, state.name),
          h('p', { 'class': 'summary' }, visibleTotal + (visibleTotal === 1 ? ' listing' : ' listings') + ' across ' +
            stationsWith + (stationsWith === 1 ? ' Station' : ' Stations'))),
        h('button', { type: 'button', 'class': 'button quiet', onclick: function () { openChangeState(stationKey); } }, icon('pin', 18), 'Change state')),
      h('div', { 'class': 'tabs-wrap' }, tabs),
      h('div', { role: 'tabpanel', id: 'station-panel', 'aria-labelledby': 'tab-' + stationKey },
        h('h2', { 'class': 'station-title' }, 'Station ' + station.num + ': ' + station.name),
        h('p', { 'class': 'purpose' }, station.purpose),
        stationKey === 'benefits' ? callout(BENEFITS_NOTICE) : null,
        toolbar,
        stationAll.length ? h('div', { 'class': 'filter-row' }, chipsBox, clearLink) : null,
        count, results));
  }

  function tabKeys(ev) {
    var tabs = Array.prototype.slice.call(ev.currentTarget.querySelectorAll('[role="tab"]'));
    var i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    var next = null;
    if (ev.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    else if (ev.key === 'ArrowLeft') next = tabs[(i + tabs.length - 1) % tabs.length];
    else if (ev.key === 'Home') next = tabs[0];
    else if (ev.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;
    ev.preventDefault();
    pendingTabFocus = true;
    location.hash = next.getAttribute('href');
  }

  /* ---------- router ---------- */

  function mount(node, title, opts) {
    main.textContent = '';
    main.appendChild(node);
    setTitle(title);
    if (!opts.focus) return;
    var target;
    if (pendingTabFocus) target = main.querySelector('[role="tab"][aria-selected="true"]');
    else { window.scrollTo(0, 0); target = main.querySelector('h1'); }
    if (target) target.focus();
  }

  async function route(opts) {
    var raw = location.hash.slice(1);
    if (raw && raw.charAt(0) !== '/') return; // in-page anchors such as the skip link
    var my = ++routeToken;
    var split = raw.split('?');
    var parts = split[0].split('/').filter(Boolean);
    var query = new URLSearchParams(split.slice(1).join('?'));
    var focus = opts.focus;
    if (dialog && dialog.open) dialog.close();

    if (parts.length === 0) { mount(renderHome(), [], { focus: focus }); pendingTabFocus = false; return; }

    var state = stateBySlug(parts[0]);
    var stationKey = parts[1] || 'community';
    var station = STATIONS.filter(function (s) { return s.key === stationKey; })[0];
    if (!state || parts.length > 2 || !station) {
      mount(renderNotFound(), ['Page not found'], { focus: focus }); pendingTabFocus = false; return;
    }

    try {
      var loaded = await Promise.all([getJSON('data/states/' + state.slug + '.json'), getJSON('data/national.json')]);
      if (my !== routeToken) return;
      var seen = {};
      var entries = visibleEntries(loaded[0], state.slug + '.json').concat(visibleEntries(loaded[1], 'national.json'))
        .filter(function (e) { if (seen[e.id]) return false; seen[e.id] = true; return true; });
      mount(renderState(state, stationKey, query, entries), [station.name, state.name], { focus: focus });
    } catch (err) {
      if (my !== routeToken) return;
      console.error(LOG, err);
      mount(h('div', { 'class': 'wrap narrow section' }, h('h1', { tabindex: '-1' }, 'We couldn’t load this page'),
        h('p', null, 'Something went wrong while loading the information for ' + state.name + '. Please try again in a moment.'),
        h('p', null, h('a', { 'class': 'button', href: '#/' }, 'Back to Home'))), ['Error'], { focus: focus });
    }
    pendingTabFocus = false;
  }

  /* ---------- start ---------- */

  async function start() {
    buildChrome();
    var skip = document.querySelector('.skip-link');
    skip.addEventListener('click', function (ev) { ev.preventDefault(); main.focus(); });
    if (page !== 'app') return;
    window.addEventListener('hashchange', function () { route({ focus: true }); });
    try {
      var index = await getJSON('data/states/index.json');
      var list = Array.isArray(index) ? index : (index && index.states) || [];
      states = list.filter(function (s) {
        return s && /^[a-z0-9-]+$/.test(s.slug || '') && s.name && s.abbr;
      }).map(function (s) {
        return { slug: s.slug, name: s.name, abbr: s.abbr, coverage: s.coverage === 'detailed' ? 'detailed' : 'basic' };
      });
    } catch (err) {
      console.error(LOG, err);
      main.textContent = '';
      main.appendChild(h('div', { 'class': 'wrap narrow section' }, h('h1', null, 'We couldn’t load the directory'),
        h('p', null, 'If you are previewing this site from a file on your computer, serve it with a local web server instead. See the README.')));
      return;
    }
    route({ focus: false });
  }

  start();
})();
