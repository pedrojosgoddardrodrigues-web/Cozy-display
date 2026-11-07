/* ===== Cozy Display — núcleo das extras =====
   Armazenamento, eventos, ícones, componentes, menu, páginas e "chips" da tela inicial.
   ES5 puro (compatível com Safari do iOS 12). Não mexe no script.js do Spotify. */
(function (w, d) {
  'use strict';

  var Cozy = w.Cozy = {};
  var root = d.documentElement;

  /* ---------- Armazenamento ---------- */
  var PREFIX = 'cozy.';
  Cozy.store = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem(PREFIX + k);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem(PREFIX + k); } catch (e) { /* ignora */ } }
  };

  /* ---------- Eventos ---------- */
  var handlers = {};
  Cozy.on = function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); };
  Cozy.emit = function (name, arg) {
    var list = handlers[name] || [];
    for (var i = 0; i < list.length; i++) {
      try { list[i](arg); } catch (e) { if (w.console && console.error) { console.error(e); } }
    }
  };

  /* ---------- Formatação ---------- */
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  Cozy.fmt = {
    pad: pad,
    DIAS: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
    DIAS3: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    MESES: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    cap: function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },
    // ms -> "mm:ss" ou "h:mm:ss"
    clock: function (ms) {
      var s = Math.max(0, Math.ceil(ms / 1000));
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return h > 0 ? h + ':' + pad(m) + ':' + pad(sec) : pad(m) + ':' + pad(sec);
    },
    key: function (dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); },
    // "2026-12-25" -> {y, m, d} (m de 1 a 12)
    parseKey: function (s) {
      var p = String(s || '').split('-');
      var y = parseInt(p[0], 10), m = parseInt(p[1], 10), dd = parseInt(p[2], 10);
      if (!y || !m || !dd) { return null; }
      return { y: y, m: m, d: dd };
    },
    daysBetween: function (a, b) { // a e b: Date locais, diferença em dias de calendário
      return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
                         Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
    }
  };

  /* ---------- Criação de elementos ---------- */
  function h(tag, attrs, kids) {
    var e = d.createElement(tag), k, v, i;
    if (attrs) {
      for (k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) { continue; }
        v = attrs[k];
        if (v === null || v === undefined || v === false) { continue; }
        if (k === 'class') { e.className = v; }
        else if (k === 'text') { e.textContent = v; }
        else if (k.indexOf('on') === 0) { e.addEventListener(k.slice(2), v); }
        else { e.setAttribute(k, v === true ? '' : v); }
      }
    }
    if (kids) {
      if (!Array.isArray(kids)) { kids = [kids]; }
      for (i = 0; i < kids.length; i++) {
        if (kids[i] === null || kids[i] === undefined) { continue; }
        e.appendChild(typeof kids[i] === 'string' ? d.createTextNode(kids[i]) : kids[i]);
      }
    }
    return e;
  }
  Cozy.h = h;

  /* ---------- Ícones (SVG de traço) ---------- */
  var ICONS = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    weather: '<circle cx="8.5" cy="8.5" r="2.8"/><path d="M8.5 2.8v1.3M2.8 8.5h1.3M4.4 4.4l.9.9M12.6 4.4l-.9.9"/><path d="M9 20h8.4a3.7 3.7 0 0 0 .5-7.36A5.2 5.2 0 0 0 8.3 13.7 3.2 3.2 0 0 0 9 20z"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.6 1.6M9.5 3h5"/>',
    tasks: '<path d="M4 6.5l1.6 1.6L8.3 5M4 12.5l1.6 1.6 2.7-3.1M4 18.5l1.6 1.6 2.7-3.1M11.5 6.5H20M11.5 12.5H20M11.5 18.5H20"/>',
    note: '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8.5h6M9 12.5h6M9 16.5h3"/>',
    sound: '<path d="M4 14v-4h3.2L12 6v12l-4.8-4z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8"/>',
    moon: '<path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    back: '<path d="M14.5 5.5l-6.5 6.5 6.5 6.5"/>',
    next: '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4M4.5 4v4.8h4.8"/>',
    flag: '<path d="M6 21V4M6 5h11l-2.5 3.5L17 12H6"/>',
    photo: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
    leaf: '<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8"/>',
    wave: '<path d="M3 12h2.5l2-6 3 12 3-9 2 5 1.5-2H21"/>',
    low: '<path d="M3 15c3-5 5-5 9 0s6 5 9 0"/>',
    drop: '<path d="M12 3.5c3.5 4.2 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2-5.800 5.500-10z"/>',
    wind: '<path d="M3 9h10a2.5 2.5 0 1 0-2.5-2.5M3 14h14a2.5 2.5 0 1 1-2.500 2.500M3 19h6"/>',
    /* clima */
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    cloud: '<path d="M7 19h10.2a4.3 4.3 0 0 0 .6-8.56A6 6 0 0 0 6.3 11.2 4 4 0 0 0 7 19z"/>',
    partlyDay: '<circle cx="8" cy="8" r="2.8"/><path d="M8 2.4v1.4M2.4 8h1.4M4 4l1 1M12 4l-1 1"/><path d="M9 20h8.6a3.7 3.7 0 0 0 .5-7.36A5.2 5.2 0 0 0 8.2 13.7 3.2 3.2 0 0 0 9 20z"/>',
    partlyNight: '<path d="M10.5 3.5a4.3 4.3 0 1 0 5.300 5.300 3.400 3.400 0 0 1-5.300-5.300z"/><path d="M9 20h8.6a3.7 3.7 0 0 0 .5-7.36A5.2 5.2 0 0 0 8.2 13.7 3.2 3.2 0 0 0 9 20z"/>',
    rain: '<path d="M7 15h10.2a4 4 0 0 0 .5-7.96A5.6 5.6 0 0 0 6.5 8.1 3.7 3.700 0 0 0 7 15z"/><path d="M8.5 18.2l-1 2.300M12.500 18.200l-1 2.300M16.500 18.200l-1 2.300"/>',
    storm: '<path d="M7 14.5h10.2a4 4 0 0 0 .5-7.96A5.6 5.6 0 0 0 6.5 7.6 3.7 3.700 0 0 0 7 14.500z"/><path d="M12.800 15.500l-2.600 3.600h3l-1.800 3"/>',
    fog: '<path d="M4 8h16M6 12h12M4 16h16M7 20h10"/>',
    snow: '<path d="M7 14.500h10.200a4 4 0 0 0 .5-7.960A5.600 5.600 0 0 0 6.500 7.600 3.700 3.700 0 0 0 7 14.500z"/><path d="M8.500 18.500h.01M12 20.500h.01M15.500 18.500h.01" stroke-width="3"/>'
  };
  var FILLED = { play: '<path d="M8 5.200v13.600L19 12z"/>', pause: '<rect x="6.500" y="5" width="3.800" height="14" rx="1.200"/><rect x="13.700" y="5" width="3.800" height="14" rx="1.200"/>', skip: '<path d="M5.500 5.500L16 12 5.500 18.500zM17.500 5.500h2.200v13h-2.200z"/>' };

  Cozy.icon = function (name, cls) {
    var span = d.createElement('span');
    var inner = FILLED[name];
    var svg;
    if (inner) {
      svg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + inner + '</svg>';
    } else {
      svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
    }
    span.innerHTML = svg;
    var el = span.firstChild;
    if (cls) { el.setAttribute('class', cls); }
    return el;
  };

  /* ---------- Componentes ---------- */
  var ui = Cozy.ui = {};

  ui.seg = function (opts, cur, cb) {
    var el = h('div', { class: 'cz-seg' }), btns = [], i;
    function set(v) { for (var j = 0; j < btns.length; j++) { btns[j].b.className = btns[j].v === v ? 'on' : ''; } }
    function make(o) {
      var b = h('button', { type: 'button', text: o.label, onclick: function () { set(o.v); cb(o.v); } });
      btns.push({ v: o.v, b: b });
      el.appendChild(b);
    }
    for (i = 0; i < opts.length; i++) { make(opts[i]); }
    set(cur);
    return { el: el, set: set };
  };

  ui.sw = function (on, cb) {
    var el = h('button', { type: 'button', class: 'cz-sw', role: 'switch' });
    var val = !!on;
    function set(v) { val = !!v; el.className = 'cz-sw' + (val ? ' on' : ''); el.setAttribute('aria-checked', val ? 'true' : 'false'); }
    el.addEventListener('click', function (e) { e.stopPropagation(); set(!val); if (cb) { cb(val); } });
    set(val);
    return { el: el, set: set, get: function () { return val; } };
  };

  ui.range = function (min, max, step, val, cb) {
    var el = h('input', { type: 'range', class: 'cz-range', min: min, max: max, step: step, value: val });
    el.addEventListener('input', function () { cb(parseFloat(el.value)); });
    return { el: el, set: function (v) { el.value = v; } };
  };

  ui.stepper = function (val, min, max, step, cb, fmt) {
    var out = h('span', { class: 'cz-step-v' });
    var cur = val;
    function paint() { out.textContent = fmt ? fmt(cur) : String(cur); }
    function bump(dir) {
      var n = cur + dir * step;
      if (n < min) { n = min; }
      if (n > max) { n = max; }
      if (n !== cur) { cur = n; paint(); cb(cur); }
    }
    var el = h('div', { class: 'cz-step' }, [
      h('button', { type: 'button', 'aria-label': 'Diminuir', onclick: function () { bump(-1); } }, [Cozy.icon('minus')]),
      out,
      h('button', { type: 'button', 'aria-label': 'Aumentar', onclick: function () { bump(1); } }, [Cozy.icon('plus')])
    ]);
    paint();
    return { el: el, set: function (v) { cur = v; paint(); }, get: function () { return cur; } };
  };

  ui.row = function (label, control, sub) {
    return h('div', { class: 'cz-row' }, [
      h('div', { class: 'cz-row-l' }, [h('span', { class: 'cz-row-t', text: label }), sub ? h('span', { class: 'cz-row-s', text: sub }) : null]),
      control
    ]);
  };

  /* ---------- Aviso (usa o mesmo #toast do Spotify) ---------- */
  var toastTimer = null;
  Cozy.toast = function (msg) {
    var t = d.getElementById('toast');
    if (!t) { return; }
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 3500);
  };

  /* ---------- Configurações ---------- */
  var DEFAULTS = {
    palette: 'bege',
    mode: 'auto',          // auto | light | dark
    dim: 0,                // 0 a 60 (%)
    warm: false,
    wall: 'none',          // none | linen | dots | glow | photo
    wallFade: 85,          // 40 a 95 (%): quanto a foto fica esmaecida
    anim: 'dust',          // none | dust | rain
    restAuto: false,
    restFrom: 23,
    restTo: 6,
    widgets: { calendar: true, weather: true, focus: true, tasks: true, notes: true, sound: true }
  };

  function merge(def, saved) {
    var o = {}, k, j, wd;
    for (k in def) { if (Object.prototype.hasOwnProperty.call(def, k)) { o[k] = def[k]; } }
    if (saved) {
      for (k in saved) {
        if (!Object.prototype.hasOwnProperty.call(saved, k)) { continue; }
        if (k === 'widgets' && saved.widgets) {
          wd = {};
          for (j in def.widgets) { wd[j] = def.widgets[j]; }
          for (j in saved.widgets) { wd[j] = saved.widgets[j]; }
          o.widgets = wd;
        } else { o[k] = saved[k]; }
      }
    }
    return o;
  }

  var S = Cozy.settings = merge(DEFAULTS, Cozy.store.get('settings', {}));
  function saveSettings() { Cozy.store.set('settings', S); }

  Cozy.set = function (k, v) { S[k] = v; saveSettings(); Cozy.emit('settings', k); };
  Cozy.setWidget = function (id, on) {
    S.widgets[id] = !!on;
    saveSettings();
    Cozy.emit('settings', 'widgets');
    Cozy.refreshGlance();
  };
  Cozy.widgetOn = function (id) { return !id || S.widgets[id] !== false; };
  Cozy.resetSettings = function () {
    var fresh = merge(DEFAULTS, null), k;
    for (k in S) { if (Object.prototype.hasOwnProperty.call(S, k)) { delete S[k]; } }
    for (k in fresh) { S[k] = fresh[k]; }
    saveSettings();
    Cozy.emit('settings', 'all');
    Cozy.refreshGlance();
  };

  /* ---------- Páginas, menu e chips ---------- */
  var TILE_ORDER = ['calendar', 'weather', 'focus', 'tasks', 'notes', 'sound', 'rest', 'settings'];
  var pages = {}, pageEls = {}, chips = [];
  var layer, launcher, launcherGrid, glance, openId = null, launcherOpen = false;

  Cozy.registerPage = function (p) { pages[p.id] = p; };
  Cozy.registerChip = function (c) { chips.push(c); chips.sort(function (a, b) { return a.order - b.order; }); };

  function updateOverlayClass() {
    var on = launcherOpen || openId !== null;
    if (on) { d.body.classList.add('cz-overlay-open'); } else { d.body.classList.remove('cz-overlay-open'); }
    Cozy.emit('overlay', on);
  }

  function renderLauncher() {
    launcherGrid.innerHTML = '';
    var i, p, st, count = 0;
    function make(pg) {
      var status = pg.status ? pg.status() : '';
      var tile = h('button', { type: 'button', class: 'cz-tile', onclick: function () { Cozy.openPage(pg.id); } }, [
        h('span', { class: 'cz-tile-ic' }, [Cozy.icon(pg.icon)]),
        h('span', { class: 'cz-tile-t', text: pg.title }),
        h('span', { class: 'cz-tile-s', text: status || '' })
      ]);
      launcherGrid.appendChild(tile);
    }
    for (i = 0; i < TILE_ORDER.length; i++) {
      p = pages[TILE_ORDER[i]];
      if (!p || !Cozy.widgetOn(p.widget)) { continue; }
      make(p);
      count++;
    }
    return count;
  }

  Cozy.openLauncher = function () {
    Cozy.closePage(true);
    renderLauncher();
    launcher.className = 'cz-launcher open';
    launcherOpen = true;
    setTimeout(function () { if (launcherOpen) { launcher.className = 'cz-launcher open show'; } }, 16);
    updateOverlayClass();
  };

  function hideLauncher() {
    launcher.className = 'cz-launcher';
    launcherOpen = false;
  }

  function buildPageEl(p) {
    var actions = h('div', { class: 'cz-head-actions' });
    var bodyEl = h('div', { class: 'cz-body' });
    var el = h('section', { class: 'cz-page', id: 'cz-page-' + p.id }, [
      h('header', { class: 'cz-head' }, [
        h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Voltar ao menu', onclick: function () { Cozy.openLauncher(); } }, [Cozy.icon('back')]),
        h('h2', { class: 'cz-title', text: p.title }),
        actions,
        h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Fechar', onclick: function () { Cozy.closeAll(); } }, [Cozy.icon('close')])
      ]),
      bodyEl
    ]);
    layer.appendChild(el);
    pageEls[p.id] = el;
    if (p.build) { p.build(bodyEl, actions); }
    return el;
  }

  Cozy.openPage = function (id) {
    var p = pages[id];
    if (!p) { return; }
    if (p.action) { Cozy.closeAll(); p.action(); return; }
    Cozy.closePage(true);
    hideLauncher();
    var el = pageEls[id] || buildPageEl(p);
    el.className = 'cz-page open';
    openId = id;
    if (p.onOpen) { p.onOpen(); }
    updateOverlayClass();
  };

  Cozy.closePage = function (silent) {
    if (openId === null) { return; }
    var p = pages[openId], el = pageEls[openId];
    if (el) { el.className = 'cz-page'; }
    openId = null;
    if (p && p.onClose) { p.onClose(); }
    if (!silent) { updateOverlayClass(); }
  };

  Cozy.closeAll = function () {
    Cozy.closePage(true);
    hideLauncher();
    updateOverlayClass();
    Cozy.refreshGlance();
  };

  Cozy.refreshGlance = function () {
    if (!glance) { return; }
    glance.innerHTML = '';
    var i, c, r;
    function make(chip, res) {
      var b = h('button', {
        type: 'button',
        class: 'cz-chip' + (res.cls ? ' ' + res.cls : ''),
        onclick: function () { Cozy.openPage(chip.page); }
      }, [Cozy.icon(res.icon), h('span', { text: res.text })]);
      glance.appendChild(b);
    }
    for (i = 0; i < chips.length; i++) {
      c = chips[i];
      if (!Cozy.widgetOn(c.widget)) { continue; }
      r = c.render();
      if (r) { make(c, r); }
    }
    fitGlance();
  };

  // Com música tocando só cabe UMA linha sob a capa: esconde os chips de menor prioridade que não couberem.
  function fitGlance() {
    if (!glance) { return; }
    var kids = glance.childNodes, i;
    for (i = 0; i < kids.length; i++) { kids[i].style.display = ''; }
    if (!d.body.classList.contains('has-track')) { return; }
    for (i = kids.length - 1; i > 0 && glance.scrollWidth > glance.clientWidth + 1; i--) { kids[i].style.display = 'none'; }
  }

  var glanceQueued = false;
  Cozy.glanceSoon = function () {
    if (glanceQueued) { return; }
    glanceQueued = true;
    setTimeout(function () { glanceQueued = false; Cozy.refreshGlance(); }, 30);
  };

  /* ---------- Ajustes de ambiente (iOS 12 e telas variadas) ---------- */
  function setVh() { root.style.setProperty('--vh', (w.innerHeight * 0.01) + 'px'); }

  // iOS 12 não suporta "gap" em flexbox (só a partir do Safari 14.1); detectamos de verdade.
  function detectFlexGap() {
    var box = d.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden;top:0;left:0';
    box.appendChild(d.createElement('div'));
    box.appendChild(d.createElement('div'));
    d.body.appendChild(box);
    var ok = box.scrollHeight === 1;
    d.body.removeChild(box);
    return ok;
  }

  Cozy.boot = function () {
    setVh();
    w.addEventListener('resize', setVh);
    w.addEventListener('orientationchange', function () { setTimeout(setVh, 300); });
    if (!detectFlexGap()) { root.className += ' no-flex-gap'; }

    // faz o :active funcionar ao toque no Safari do iPhone
    d.addEventListener('touchstart', function () { /* ativa :active */ }, true);

    // botão de tela cheia: o iPhone não oferece essa função
    var full = d.getElementById('btnFull');
    if (full && !(d.fullscreenEnabled || d.webkitFullscreenEnabled)) { full.style.display = 'none'; }

    // botão de menu entra na coluna de ferramentas do canto
    var tools = d.querySelector('.tools');
    if (tools) {
      tools.insertBefore(h('button', { id: 'btnMenu', type: 'button', 'aria-label': 'Menu', onclick: Cozy.openLauncher }, [Cozy.icon('grid')]), tools.firstChild);
    }

    layer = h('div', { id: 'cz-layer' });
    launcherGrid = h('div', { class: 'cz-grid' });
    launcher = h('div', { class: 'cz-launcher' }, [
      h('header', { class: 'cz-head' }, [
        h('h2', { class: 'cz-title', text: 'Cozy Display' }),
        h('div', { class: 'cz-head-actions' }),
        h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Fechar menu', onclick: function () { Cozy.closeAll(); } }, [Cozy.icon('close')])
      ]),
      launcherGrid
    ]);
    glance = h('div', { id: 'cz-glance' });
    d.body.appendChild(glance);
    layer.appendChild(launcher);
    d.body.appendChild(layer);

    d.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
      if (e.key === 'Escape') { Cozy.closeAll(); }
      else if (e.key === 'm' || e.key === 'M') { if (launcherOpen) { Cozy.closeAll(); } else { Cozy.openLauncher(); } }
    });

    // relógio interno das extras: um evento por segundo e outro por minuto
    var lastMin = -1;
    setInterval(function () {
      var now = new Date();
      Cozy.emit('tick', now);
      if (now.getMinutes() !== lastMin) { lastMin = now.getMinutes(); Cozy.emit('minute', now); }
    }, 1000);

    // o script.js do Spotify liga/desliga a classe "has-track" no <body>: refaz o encaixe quando isso muda
    if (w.MutationObserver) { new MutationObserver(fitGlance).observe(d.body, { attributes: true, attributeFilter: ['class'] }); }

    Cozy.emit('boot');
    Cozy.refreshGlance();
  };
})(window, document);
