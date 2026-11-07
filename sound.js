/* ===== Cozy Display — sons ambientes =====
   Tudo é gerado na hora pelo Web Audio (ruído filtrado): não há arquivos de áudio,
   não gasta internet e funciona offline. Chuva, natureza, ruído branco e ruído marrom. */
(function (w, d) {
  'use strict';
  var Cozy = w.Cozy, h = Cozy.h;

  var AC = w.AudioContext || w.webkitAudioContext;
  var ctx = null, master = null, white = null, brown = null, silent = null;
  var cfg = Cozy.store.get('sound', { kind: 'rain', vol: 55, sleep: 0 });
  var cur = null;          // som tocando agora: { kind, out, stop }
  var sleepEnd = 0;        // horário (ms) em que o som se apaga sozinho; 0 = sem temporizador
  var pageOpen = false, ui = {};

  var KINDS = [
    { id: 'rain',  name: 'Chuva',         icon: 'drop' },
    { id: 'nature', name: 'Natureza',     icon: 'leaf' },
    { id: 'white', name: 'Ruído branco',  icon: 'wave' },
    { id: 'brown', name: 'Ruído marrom',  icon: 'low' }
  ];
  function nameOf(id) { for (var i = 0; i < KINDS.length; i++) { if (KINDS[i].id === id) { return KINDS[i].name; } } return ''; }

  function save() { Cozy.store.set('sound', cfg); }
  function gainOf(v) { var x = v / 100; return x * x * 0.9; }

  /* ---------- Contexto de áudio ---------- */
  function context() {
    if (!AC) { return null; }
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = gainOf(cfg.vol);
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e2) { /* ignora */ } }
    return ctx;
  }
  Cozy.audio = { context: context };

  // iOS só libera o som depois de um toque; destrava no primeiro toque em qualquer lugar.
  function unlock() {
    var c = context();
    if (!c) { return; }
    try {
      var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) { /* ignora */ }
    if (c.state === 'running') {
      d.removeEventListener('touchend', unlock, true);
      d.removeEventListener('click', unlock, true);
    }
  }
  d.addEventListener('touchend', unlock, true);
  d.addEventListener('click', unlock, true);

  // No iPhone, a chave lateral de silêncio muta o Web Audio. Tocar um áudio HTML inaudível
  // em segundo plano faz o iOS tratar a página como "reprodução de mídia".
  function silentUrl() {
    var n = 2205, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), i;
    function str(o, t) { for (i = 0; i < t.length; i++) { v.setUint8(o + i, t.charCodeAt(i)); } }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 22050, true); v.setUint32(28, 44100, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    return w.URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function silentOn() {
    try {
      if (!silent) { silent = new Audio(silentUrl()); silent.loop = true; silent.setAttribute('playsinline', ''); }
      var p = silent.play();
      if (p && p['catch']) { p['catch'](function () { /* ignora */ }); }
    } catch (e) { /* ignora */ }
  }
  function silentOff() { try { if (silent) { silent.pause(); } } catch (e) { /* ignora */ } }

  /* ---------- Geradores de ruído ---------- */
  function makeNoise(type) {
    var rate = ctx.sampleRate, len = rate * 4, b = ctx.createBuffer(1, len, rate), data = b.getChannelData(0);
    var i, x, last = 0, fade = Math.floor(rate * 0.02);
    for (i = 0; i < len; i++) {
      x = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * x) / 1.02; data[i] = last * 3.5; } else { data[i] = x * 0.5; }
    }
    for (i = 0; i < fade; i++) { data[i] *= i / fade; data[len - 1 - i] *= i / fade; } // sem estalo na emenda
    return b;
  }

  function buffers() {
    if (!white) { white = makeNoise('white'); brown = makeNoise('brown'); }
  }

  function loop(buf) {
    var s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.start(0, Math.random() * 3);
    return s;
  }

  function filter(type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q) { f.Q.value = q; }
    return f;
  }

  function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }

  function buildRain() {
    var out = gain(1), s1 = loop(white), s2 = loop(brown), a = gain(0.5), b = gain(0.7);
    // chiado: ruído branco sem graves e com agudos suavizados; fundo: ruído marrom grave (trovão distante)
    var hp = filter('highpass', 900), lp = filter('lowpass', 7000), rumble = filter('lowpass', 450);
    s1.connect(hp); hp.connect(lp); lp.connect(a); a.connect(out);
    s2.connect(rumble); rumble.connect(b); b.connect(out);
    var timer = setInterval(function () {
      if (!ctx || ctx.state !== 'running') { return; }
      var n = 1 + Math.floor(Math.random() * 2), i;
      for (i = 0; i < n; i++) {
        try {
          var src = ctx.createBufferSource(), bp = filter('bandpass', 1800 + Math.random() * 3800, 3), g = gain(0), t = ctx.currentTime + Math.random() * 0.1;
          src.buffer = white;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.55, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          src.connect(bp); bp.connect(g); g.connect(out);
          src.start(t, Math.random() * 3, 0.06);
        } catch (e) { /* ignora */ }
      }
    }, 120);
    return { out: out, stop: function () { clearInterval(timer); try { s1.stop(); s2.stop(); } catch (e) { /* ignora */ } } };
  }

  function buildNature() {
    var out = gain(1), s = loop(brown), bp = filter('bandpass', 380, 0.6), wg = gain(0.75);
    s.connect(bp); bp.connect(wg); wg.connect(out);
    // vento: o volume sobe e desce devagar
    var lfo = ctx.createOscillator(), lg = gain(0.4);
    lfo.type = 'sine'; lfo.frequency.value = 0.07;
    lfo.connect(lg); lg.connect(wg.gain); lfo.start(0);
    var stopped = false, tm = 0;
    function chirp() {
      if (stopped) { return; }
      if (ctx && ctx.state === 'running') {
        var notes = 2 + Math.floor(Math.random() * 3), base = 2200 + Math.random() * 2000, t = ctx.currentTime + 0.05, i, o, g;
        for (i = 0; i < notes; i++) {
          o = ctx.createOscillator(); g = gain(0);
          o.type = 'sine';
          o.frequency.setValueAtTime(base, t);
          o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.5), t + 0.09);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
          o.connect(g); g.connect(out);
          o.start(t); o.stop(t + 0.13);
          t += 0.13 + Math.random() * 0.05;
        }
      }
      tm = setTimeout(chirp, 2500 + Math.random() * 6500);
    }
    tm = setTimeout(chirp, 1500);
    return { out: out, stop: function () { stopped = true; clearTimeout(tm); try { s.stop(); lfo.stop(); } catch (e) { /* ignora */ } } };
  }

  function buildWhite() {
    var out = gain(0.55), s = loop(white), lp = filter('lowpass', 11000);
    s.connect(lp); lp.connect(out);
    return { out: out, stop: function () { try { s.stop(); } catch (e) { /* ignora */ } } };
  }

  function buildBrown() {
    var out = gain(1.1), s = loop(brown);
    s.connect(out);
    return { out: out, stop: function () { try { s.stop(); } catch (e) { /* ignora */ } } };
  }

  var BUILDERS = { rain: buildRain, nature: buildNature, white: buildWhite, brown: buildBrown };

  /* ---------- Tocar e parar ---------- */
  function fadeOutAndStop(snd, secs) {
    var t = ctx.currentTime;
    try {
      snd.out.gain.cancelScheduledValues(t);
      snd.out.gain.setValueAtTime(snd.out.gain.value, t);
      snd.out.gain.linearRampToValueAtTime(0, t + secs);
    } catch (e) { /* ignora */ }
    setTimeout(function () { snd.stop(); try { snd.out.disconnect(); } catch (e2) { /* ignora */ } }, secs * 1000 + 80);
  }

  function stop(secs) {
    if (!cur) { return; }
    var snd = cur;
    cur = null; sleepEnd = 0;
    if (ctx) { fadeOutAndStop(snd, secs === undefined ? 0.6 : secs); }
    silentOff();
    refresh();
  }

  function play(kind) {
    var c = context();
    if (!c) { Cozy.toast('Este navegador não toca sons ambientes.'); return; }
    buffers();
    if (cur) { var old = cur; cur = null; fadeOutAndStop(old, 0.6); }
    var snd = BUILDERS[kind]();
    var t = c.currentTime, g = snd.out.gain, target = g.value;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(target, t + 1.5);
    snd.out.connect(master);
    snd.kind = kind;
    cur = snd;
    cfg.kind = kind; save();
    silentOn();
    armSleep();
    refresh();
  }

  function armSleep() { sleepEnd = (cur && cfg.sleep) ? Date.now() + cfg.sleep * 60000 : 0; }

  function toggle(kind) { if (cur && cur.kind === kind) { stop(); } else { play(kind); } }

  /* ---------- Tela ---------- */
  function minutesLeft() { return sleepEnd ? Math.max(1, Math.ceil((sleepEnd - Date.now()) / 60000)) : 0; }

  function refresh() {
    var i, el;
    if (pageOpen && ui.btns) {
      for (i = 0; i < KINDS.length; i++) {
        el = ui.btns[KINDS[i].id];
        if (el) { el.className = 'sn-btn' + (cur && cur.kind === KINDS[i].id ? ' on' : ''); }
      }
      if (ui.state) {
        ui.state.textContent = cur ? 'Tocando: ' + nameOf(cur.kind) + (sleepEnd ? ' · apaga em ' + minutesLeft() + ' min' : '') : 'Nada tocando';
      }
    }
    Cozy.glanceSoon();
  }

  Cozy.on('boot', function () {
    Cozy.registerPage({
      id: 'sound', title: 'Sons', icon: 'sound', widget: 'sound',
      status: function () { return cur ? nameOf(cur.kind) : 'Chuva, natureza, ruído'; },
      build: function (body) {
        ui.btns = {};
        var grid = h('div', { class: 'sn-grid' }), i;
        function make(k) {
          var b = h('button', { type: 'button', class: 'sn-btn', onclick: function () { toggle(k.id); } }, [Cozy.icon(k.icon), h('span', { text: k.name })]);
          ui.btns[k.id] = b;
          grid.appendChild(b);
        }
        for (i = 0; i < KINDS.length; i++) { make(KINDS[i]); }
        ui.state = h('div', { class: 'sn-state' });
        var vol = Cozy.ui.range(5, 100, 1, cfg.vol, function (v) {
          cfg.vol = v; save();
          if (master) { master.gain.value = gainOf(v); }
        });
        var sleep = Cozy.ui.seg([{ v: 0, label: 'Sem limite' }, { v: 15, label: '15 min' }, { v: 30, label: '30 min' }, { v: 60, label: '1 h' }], cfg.sleep, function (v) {
          cfg.sleep = v; save(); armSleep(); refresh();
        });
        body.appendChild(h('div', { class: 'sn-wrap' }, [
          grid,
          h('div', { class: 'sn-ctl' }, [
            ui.state,
            Cozy.ui.row('Volume', vol.el),
            h('div', { class: 'cz-row-t sn-lab', text: 'Apagar sozinho' }),
            sleep.el,
            h('p', { class: 'cz-note', text: 'Se não ouvir nada no iPhone, confira a chave lateral de silêncio e o volume do aparelho. O som precisa de um toque para começar.' })
          ])
        ]));
        refresh();
      },
      onOpen: function () { pageOpen = true; refresh(); },
      onClose: function () { pageOpen = false; }
    });

    Cozy.registerChip({
      id: 'sound', order: 50, widget: 'sound', page: 'sound',
      render: function () {
        if (!cur) { return null; }
        return { icon: 'sound', text: nameOf(cur.kind) + (sleepEnd ? ' · ' + minutesLeft() + 'min' : ''), cls: 'accent' };
      }
    });

    Cozy.on('tick', function () {
      if (cur && sleepEnd && Date.now() >= sleepEnd) { stop(4); return; }
      if (cur && sleepEnd && Date.now() % 60000 < 1000) { refresh(); }
    });
    Cozy.on('settings', function (k) { if ((k === 'widgets' || k === 'all') && cur && !Cozy.widgetOn('sound')) { stop(0.3); } });
  });
})(window, document);
