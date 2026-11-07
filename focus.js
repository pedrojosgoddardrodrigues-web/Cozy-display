/* ===== Cozy Display — foco: temporizador, cronômetro e pomodoro =====
   O tempo é guardado como horário de término (e não como contagem), então não "atrasa"
   se o Safari pausar a página em segundo plano. Sobrevive a recarregar a página. */
(function (w, d) {
  'use strict';
  var Cozy = w.Cozy, h = Cozy.h, fmt = Cozy.fmt;

  var PRESETS = [5, 10, 15, 25, 45];
  var DEF = {
    tab: 'pomo',
    timer: { min: 10, state: 'idle', endAt: 0, left: 0, total: 0 },
    sw: { state: 'idle', startAt: 0, acc: 0, laps: [] },
    pomo: { focus: 25, short: 5, long: 15, every: 4, auto: true, phase: 'focus', round: 1, state: 'idle', endAt: 0, left: 0, total: 0, done: 0 }
  };

  function load() {
    var s = Cozy.store.get('focus', null), o = JSON.parse(JSON.stringify(DEF)), k, j;
    if (s) { for (k in o) { if (s[k] !== undefined) { if (typeof o[k] === 'object') { for (j in s[k]) { o[k][j] = s[k][j]; } } else { o[k] = s[k]; } } } }
    return o;
  }
  var F = load();
  function save() { Cozy.store.set('focus', F); }

  var pageOpen = false, view = {}, ringEl = null, alarmTimer = 0, alarmUntil = 0, banner = null;

  /* ---------- Cálculos ---------- */
  function remaining(o) { return o.state === 'run' ? Math.max(0, o.endAt - Date.now()) : (o.state === 'pause' ? o.left : o.total || 0); }
  function swElapsed() { return F.sw.state === 'run' ? F.sw.acc + (Date.now() - F.sw.startAt) : F.sw.acc; }

  function phaseMs(P, phase) { return (phase === 'focus' ? P.focus : phase === 'short' ? P.short : P.long) * 60000; }
  var PHASE_NAMES = { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' };

  function start(o, ms) { o.total = ms; o.endAt = Date.now() + ms; o.state = 'run'; }
  function pauseO(o) { o.left = Math.max(0, o.endAt - Date.now()); o.state = 'pause'; }
  function resume(o) { o.endAt = Date.now() + o.left; o.state = 'run'; }

  /* ---------- Alarme (som sintetizado) ---------- */
  function beep() {
    try {
      var A = Cozy.audio && Cozy.audio.context ? Cozy.audio.context() : null;
      if (!A) { return; }
      var t0 = A.currentTime, i, o, g;
      for (i = 0; i < 3; i++) {
        o = A.createOscillator(); g = A.createGain();
        o.type = 'sine'; o.frequency.value = i === 2 ? 880 : 660;
        g.gain.setValueAtTime(0, t0 + i * 0.28);
        g.gain.linearRampToValueAtTime(0.28, t0 + i * 0.28 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.28 + 0.26);
        o.connect(g); g.connect(A.destination);
        o.start(t0 + i * 0.28); o.stop(t0 + i * 0.28 + 0.3);
      }
    } catch (e) { /* ignora */ }
  }

  function ring(msg) {
    alarmUntil = Date.now() + 30000;
    beep();
    clearInterval(alarmTimer);
    alarmTimer = setInterval(function () {
      if (Date.now() > alarmUntil) { stopRing(); return; }
      beep();
    }, 3000);
    if (w.navigator.vibrate) { try { w.navigator.vibrate([300, 150, 300]); } catch (e) { /* ignora */ } }
    showBanner(msg);
  }

  function stopRing() {
    clearInterval(alarmTimer); alarmTimer = 0;
    if (banner && banner.parentNode) { banner.parentNode.removeChild(banner); }
    banner = null;
  }

  function showBanner(msg) {
    if (banner && banner.parentNode) { banner.parentNode.removeChild(banner); }
    banner = h('div', { class: 'fx-banner', onclick: stopRing }, [Cozy.icon('timer'), h('span', { text: msg }), h('em', { text: 'Toque para silenciar' })]);
    d.body.appendChild(banner);
  }

  /* ---------- Fim das contagens ---------- */
  function finishTimer() {
    F.timer.state = 'idle'; F.timer.left = 0;
    save(); ring('Tempo esgotado');
  }

  function nextPhase(fromSkip) {
    var P = F.pomo, finished = P.phase;
    if (finished === 'focus') {
      if (!fromSkip) { P.done++; }
      P.phase = (P.round % P.every === 0) ? 'long' : 'short';
    } else {
      if (finished === 'long') { P.round = 1; } else { P.round++; }
      P.phase = 'focus';
    }
    P.total = phaseMs(P, P.phase);
    if (P.auto) { start(P, P.total); } else { P.state = 'idle'; P.left = P.total; }
    save();
    return finished;
  }

  function finishPomo() {
    var finished = nextPhase(false);
    ring(finished === 'focus' ? 'Foco concluído. Hora da pausa.' : 'Pausa terminou. Vamos focar?');
  }

  function tick() {
    var changed = false;
    if (F.timer.state === 'run' && Date.now() >= F.timer.endAt) { finishTimer(); changed = true; }
    if (F.pomo.state === 'run' && Date.now() >= F.pomo.endAt) { finishPomo(); changed = true; }
    if (pageOpen) { paint(changed); }
    Cozy.glanceSoon();
  }

  /* ---------- Ações ---------- */
  var A = {
    timerToggle: function () {
      var T = F.timer;
      if (T.state === 'run') { pauseO(T); }
      else if (T.state === 'pause') { resume(T); }
      else { start(T, T.min * 60000); }
      save(); paint(true);
    },
    timerReset: function () { F.timer.state = 'idle'; F.timer.left = 0; F.timer.total = 0; save(); paint(true); },
    swToggle: function () {
      var S = F.sw;
      if (S.state === 'run') { S.acc += Date.now() - S.startAt; S.state = 'pause'; }
      else { S.startAt = Date.now(); S.state = 'run'; }
      save(); paint(true);
    },
    swLap: function () {
      if (F.sw.state !== 'run') { return; }
      F.sw.laps.unshift(swElapsed());
      if (F.sw.laps.length > 20) { F.sw.laps.length = 20; }
      save(); paint(true);
    },
    swReset: function () { F.sw = { state: 'idle', startAt: 0, acc: 0, laps: [] }; save(); paint(true); },
    pomoToggle: function () {
      var P = F.pomo;
      if (P.state === 'run') { pauseO(P); }
      else if (P.state === 'pause') { resume(P); }
      else { start(P, phaseMs(P, P.phase)); }
      save(); paint(true);
    },
    pomoSkip: function () { nextPhase(true); paint(true); },
    pomoReset: function () {
      var P = F.pomo;
      P.phase = 'focus'; P.round = 1; P.state = 'idle'; P.left = 0; P.total = 0; P.done = 0;
      save(); paint(true);
    }
  };

  /* ---------- Interface ---------- */
  function ringSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var s = d.createElementNS(ns, 'svg'), bg = d.createElementNS(ns, 'circle'), fg = d.createElementNS(ns, 'circle');
    s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('class', 'fx-ring');
    bg.setAttribute('cx', '50'); bg.setAttribute('cy', '50'); bg.setAttribute('r', '45'); bg.setAttribute('class', 'fx-ring-bg');
    fg.setAttribute('cx', '50'); fg.setAttribute('cy', '50'); fg.setAttribute('r', '45'); fg.setAttribute('class', 'fx-ring-fg');
    fg.setAttribute('transform', 'rotate(-90 50 50)');
    fg.style.strokeDasharray = '282.74';
    s.appendChild(bg); s.appendChild(fg);
    s._fg = fg;
    return s;
  }

  function btn(label, cls, fn, icon) {
    return h('button', { type: 'button', class: 'cz-btn ' + cls, onclick: fn }, [icon ? Cozy.icon(icon) : null, h('span', { text: label })]);
  }

  function dial(timeText, sub, frac) {
    var ring_ = ringSvg();
    ring_._fg.style.strokeDashoffset = String(282.74 * (1 - Math.max(0, Math.min(1, frac))));
    return h('div', { class: 'fx-dial' }, [ring_, h('div', { class: 'fx-dial-c' }, [h('div', { class: 'fx-time', text: timeText }), h('div', { class: 'fx-sub', text: sub })])]);
  }

  function viewTimer() {
    var T = F.timer, run = T.state === 'run', idle = T.state === 'idle';
    var left = remaining(T), frac = idle ? 1 : (T.total ? left / T.total : 0), i, chips = h('div', { class: 'fx-presets' });
    function chip(m) {
      return h('button', { type: 'button', class: 'cz-pill' + (T.min === m ? ' on' : ''), text: m + ' min', onclick: function () { T.min = m; save(); paint(true); } });
    }
    for (i = 0; i < PRESETS.length; i++) { chips.appendChild(chip(PRESETS[i])); }
    var side = h('div', { class: 'fx-side' });
    if (idle) {
      side.appendChild(h('div', { class: 'fx-lab', text: 'Duração' }));
      side.appendChild(Cozy.ui.stepper(T.min, 1, 180, 1, function (v) { T.min = v; save(); paint(true); }, function (v) { return v + ' min'; }).el);
      side.appendChild(chips);
    } else {
      side.appendChild(h('div', { class: 'fx-lab', text: run ? 'Em andamento' : 'Pausado' }));
    }
    side.appendChild(h('div', { class: 'fx-btns' }, [
      btn(run ? 'Pausar' : (idle ? 'Iniciar' : 'Continuar'), 'solid', A.timerToggle, run ? 'pause' : 'play'),
      idle ? null : btn('Zerar', '', A.timerReset, 'reset')
    ]));
    return h('div', { class: 'fx-view' }, [dial(fmt.clock(idle ? T.min * 60000 : left), idle ? 'pronto' : (run ? 'restante' : 'em pausa'), frac), side]);
  }

  function viewSw() {
    var S = F.sw, run = S.state === 'run', el = swElapsed();
    function ms(v) {
      var t = Math.floor(v / 10), cs = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000);
      return fmt.pad(m) + ':' + fmt.pad(s) + '.' + fmt.pad(cs);
    }
    var laps = h('div', { class: 'fx-laps' }), i;
    for (i = 0; i < S.laps.length && i < 5; i++) {
      var n = S.laps.length - i, prev = S.laps[i + 1] || 0;
      laps.appendChild(h('div', { class: 'fx-lap' }, [h('span', { text: 'Volta ' + n }), h('b', { text: '+' + ms(S.laps[i] - prev) }), h('em', { text: ms(S.laps[i]) })]));
    }
    var big = h('div', { class: 'fx-sw-time', id: 'fx-sw-time', text: ms(el) });
    return h('div', { class: 'fx-view sw' }, [
      h('div', { class: 'fx-sw-l' }, [big, h('div', { class: 'fx-btns' }, [
        btn(run ? 'Pausar' : (S.state === 'pause' ? 'Continuar' : 'Iniciar'), 'solid', A.swToggle, run ? 'pause' : 'play'),
        btn('Volta', '', A.swLap, 'flag'),
        S.state === 'idle' ? null : btn('Zerar', '', A.swReset, 'reset')
      ])]),
      laps
    ]);
  }

  function viewPomo() {
    var P = F.pomo, run = P.state === 'run', idle = P.state === 'idle';
    var total = phaseMs(P, P.phase), left = idle ? total : remaining(P);
    var frac = idle ? 1 : (P.total ? left / P.total : 0), dots = h('div', { class: 'fx-dots' }), i;
    for (i = 1; i <= P.every; i++) {
      dots.appendChild(h('i', { class: i < P.round || (i === P.round && P.phase !== 'focus') ? 'on' : (i === P.round ? 'cur' : '') }));
    }
    var side = h('div', { class: 'fx-side' }, [
      h('div', { class: 'fx-phase ' + P.phase, text: PHASE_NAMES[P.phase] }),
      dots,
      h('div', { class: 'fx-lab', text: 'Ciclo ' + P.round + ' de ' + P.every + ' · ' + P.done + (P.done === 1 ? ' foco hoje' : ' focos feitos') }),
      h('div', { class: 'fx-btns' }, [
        btn(run ? 'Pausar' : (idle ? 'Iniciar' : 'Continuar'), 'solid', A.pomoToggle, run ? 'pause' : 'play'),
        btn('Pular', '', A.pomoSkip, 'skip'),
        idle && P.round === 1 && P.phase === 'focus' && !P.done ? null : btn('Zerar', '', A.pomoReset, 'reset')
      ])
    ]);
    return h('div', { class: 'fx-view' }, [dial(fmt.clock(left), PHASE_NAMES[P.phase].toLowerCase(), frac), side]);
  }

  function viewPomoSettings() {
    var P = F.pomo;
    function st(key, min, max, label) {
      return Cozy.ui.row(label, Cozy.ui.stepper(P[key], min, max, 1, function (v) {
        P[key] = v;
        if (P.state === 'idle') { P.left = 0; }
        save();
      }, function (v) { return key === 'every' ? v + 'x' : v + ' min'; }).el);
    }
    return h('div', { class: 'fx-cfg' }, [
      st('focus', 1, 120, 'Foco'), st('short', 1, 60, 'Pausa curta'), st('long', 1, 90, 'Pausa longa'), st('every', 2, 8, 'Pausa longa a cada'),
      Cozy.ui.row('Começar a próxima fase sozinho', Cozy.ui.sw(P.auto, function (v) { P.auto = v; save(); }).el)
    ]);
  }

  var body = null, tabsEl = null, content = null, cfgOpen = false;

  function paint(full) {
    if (!body) { return; }
    // atualização leve do cronômetro, sem recriar a tela
    if (!full && F.tab === 'sw') {
      var t = d.getElementById('fx-sw-time');
      if (t) {
        var v = swElapsed(), c = Math.floor(v / 10);
        t.textContent = fmt.pad(Math.floor(c / 6000)) + ':' + fmt.pad(Math.floor(c / 100) % 60) + '.' + fmt.pad(c % 100);
      }
      return;
    }
    if (!full && F.tab !== 'sw') {
      // atualiza só o número e o anel para não perder o foco nos botões
      var o = F.tab === 'timer' ? F.timer : F.pomo;
      var node = body.querySelector('.fx-time'), fg = body.querySelector('.fx-ring-fg');
      if (node && o.state === 'run') {
        node.textContent = fmt.clock(remaining(o));
        if (fg && o.total) { fg.style.strokeDashoffset = String(282.74 * (1 - remaining(o) / o.total)); }
        return;
      }
      if (node && o.state !== 'run') { return; }
    }
    content.innerHTML = '';
    if (F.tab === 'timer') { content.appendChild(viewTimer()); }
    else if (F.tab === 'sw') { content.appendChild(viewSw()); }
    else {
      content.appendChild(cfgOpen ? viewPomoSettings() : viewPomo());
    }
    paintTabs();
  }

  function paintTabs() {
    var btns = tabsEl.querySelectorAll('button'), ids = ['pomo', 'timer', 'sw'], i;
    for (i = 0; i < btns.length; i++) { btns[i].className = ids[i] === F.tab ? 'on' : ''; }
    if (view.gear) { view.gear.style.display = F.tab === 'pomo' ? '' : 'none'; view.gear.className = 'cz-ib' + (cfgOpen ? ' on' : ''); }
  }

  /* ---------- Registro ---------- */
  Cozy.on('boot', function () {
    // se a página foi fechada com o Pomodoro rodando e já passou do fim, só ajusta o estado
    if (F.timer.state === 'run' && Date.now() >= F.timer.endAt) { F.timer.state = 'idle'; save(); }
    if (F.pomo.state === 'run' && Date.now() >= F.pomo.endAt) { F.pomo.state = 'idle'; F.pomo.left = 0; save(); }

    Cozy.registerPage({
      id: 'focus', title: 'Foco', icon: 'timer', widget: 'focus',
      status: function () {
        if (F.pomo.state === 'run') { return PHASE_NAMES[F.pomo.phase] + ' · ' + fmt.clock(remaining(F.pomo)); }
        if (F.timer.state === 'run') { return 'Timer · ' + fmt.clock(remaining(F.timer)); }
        if (F.sw.state === 'run') { return 'Cronômetro rodando'; }
        return 'Pomodoro, timer, cronômetro';
      },
      build: function (b, actions) {
        body = b;
        tabsEl = h('div', { class: 'cz-seg fx-tabs' }, [
          h('button', { type: 'button', text: 'Pomodoro', onclick: function () { F.tab = 'pomo'; save(); cfgOpen = false; paint(true); } }),
          h('button', { type: 'button', text: 'Timer', onclick: function () { F.tab = 'timer'; save(); cfgOpen = false; paint(true); } }),
          h('button', { type: 'button', text: 'Cronômetro', onclick: function () { F.tab = 'sw'; save(); cfgOpen = false; paint(true); } })
        ]);
        content = h('div', { class: 'fx-content' });
        b.appendChild(tabsEl); b.appendChild(content);
        view.gear = h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Ajustar Pomodoro', onclick: function () { cfgOpen = !cfgOpen; paint(true); } }, [Cozy.icon('sliders')]);
        actions.appendChild(view.gear);
        paint(true);
      },
      onOpen: function () { pageOpen = true; cfgOpen = false; paint(true); },
      onClose: function () { pageOpen = false; }
    });

    Cozy.registerChip({
      id: 'focus', order: 10, widget: 'focus', page: 'focus',
      render: function () {
        if (F.pomo.state === 'run' || F.pomo.state === 'pause') {
          return { icon: 'timer', text: PHASE_NAMES[F.pomo.phase] + ' ' + fmt.clock(remaining(F.pomo)), cls: F.pomo.phase === 'focus' ? 'accent' : '' };
        }
        if (F.timer.state === 'run' || F.timer.state === 'pause') { return { icon: 'timer', text: fmt.clock(remaining(F.timer)), cls: 'accent' }; }
        if (F.sw.state === 'run') { return { icon: 'timer', text: 'Cronômetro', cls: 'accent' }; }
        return null;
      }
    });

    // contagem em tempo real: 4x por segundo só enquanto algo estiver rodando (para fluidez do cronômetro)
    setInterval(function () {
      var any = F.timer.state === 'run' || F.pomo.state === 'run' || (pageOpen && F.sw.state === 'run');
      if (any) { tick(); }
    }, 250);

    Cozy.on('tick', function () { if (F.timer.state === 'pause' || F.pomo.state === 'pause') { Cozy.glanceSoon(); } });
    Cozy.on('minute', function () { Cozy.glanceSoon(); });
    // volta do segundo plano: confere se algo terminou enquanto a página dormia
    d.addEventListener('visibilitychange', function () { if (!d.hidden) { tick(); } });
    // zera o contador de focos do dia à meia-noite
    var day = fmt.key(new Date());
    Cozy.on('minute', function (now) { var k = fmt.key(now); if (k !== day) { day = k; F.pomo.done = 0; save(); } });
  });
})(window, document);
