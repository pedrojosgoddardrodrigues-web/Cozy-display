/* ===== Cozy Display — aparência =====
   Temas de cores, modo claro/escuro, papel de parede, brilho, animações e modo descanso.
   Convive com o script.js do Spotify sem alterá-lo (ver comentários sobre o tema). */
(function (w, d) {
  'use strict';
  var Cozy = w.Cozy, S = Cozy.settings, h = Cozy.h, root = d.documentElement;

  Cozy.palettes = [
    { id: 'bege',     name: 'Bege',      sw: ['#F5F0E8', '#806B57', '#493B32'] },
    { id: 'salvia',   name: 'Sálvia',    sw: ['#EDEFE4', '#5F6E50', '#3A4433'] },
    { id: 'rose',     name: 'Rosé',      sw: ['#F6ECE8', '#8A5C55', '#55353A'] },
    { id: 'nevoa',    name: 'Névoa',     sw: ['#EBEEF0', '#5A6D7E', '#34424D'] },
    { id: 'lavanda',  name: 'Lavanda',   sw: ['#F0ECF3', '#6F5F82', '#43384F'] }
  ];

  var restOn = false, restAuto = false, restDismissed = false;

  /* ---------- Tema claro/escuro ----------
     O script.js do Spotify também controla o atributo data-theme (automático/claro/escuro).
     Para ter uma única fonte de verdade sem editá-lo: (1) interceptamos o toque no relógio e
     (2) um observador devolve o valor correto se o script.js trocar o atributo. */
  function desiredTheme() {
    if (restOn) { return 'dark'; }
    if (S.mode === 'light') { return 'light'; }
    if (S.mode === 'dark') { return 'dark'; }
    var hr = new Date().getHours();
    return (hr >= 22 || hr < 6) ? 'dark' : 'light';
  }

  function applyTheme() {
    var t = desiredTheme();
    if (root.getAttribute('data-theme') !== t) { root.setAttribute('data-theme', t); }
    Cozy.emit('theme', t);
  }

  var MODE_NAMES = { auto: 'automático (escuro à noite)', light: 'claro', dark: 'escuro' };
  var MODES = ['auto', 'light', 'dark'];
  Cozy.modeName = function (m) { return MODE_NAMES[m]; };

  function cycleMode() {
    var next = MODES[(MODES.indexOf(S.mode) + 1) % MODES.length];
    Cozy.set('mode', next);
    Cozy.toast('Tema: ' + MODE_NAMES[next]);
  }

  /* ---------- Paleta ---------- */
  function applyPalette() { root.setAttribute('data-palette', S.palette); }

  /* ---------- Papel de parede ---------- */
  var wall;
  function applyWall() {
    wall.className = S.wall === 'none' ? '' : S.wall;
    wall.style.backgroundImage = '';
    if (S.wall === 'photo') {
      var url = Cozy.store.get('wallphoto', '');
      if (url) { wall.style.backgroundImage = 'url(' + url + ')'; }
      else { wall.className = ''; }
    }
    wall.style.setProperty('--wallfade', String(S.wallFade / 100));
  }

  // Lê a foto escolhida, reduz para no máximo 1024 px e guarda no aparelho.
  Cozy.pickWallpaper = function (file, done) {
    if (!file) { return; }
    var fr = new FileReader();
    fr.onerror = function () { Cozy.toast('Não consegui abrir essa foto.'); };
    fr.onload = function () {
      var img = new Image();
      img.onerror = function () { Cozy.toast('Formato de imagem não suportado.'); };
      img.onload = function () {
        var max = 1024, sc = Math.min(1, max / Math.max(img.width, img.height));
        var cv = d.createElement('canvas');
        cv.width = Math.round(img.width * sc);
        cv.height = Math.round(img.height * sc);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var data = cv.toDataURL('image/jpeg', 0.72);
        if (!Cozy.store.set('wallphoto', data)) { Cozy.toast('A foto é grande demais para guardar. Tente outra.'); return; }
        Cozy.set('wall', 'photo');
        if (done) { done(); }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  };

  /* ---------- Brilho visual e luz quente ---------- */
  var dimEl, warmEl;
  function effectiveDim() { return restOn ? Math.max(S.dim, 45) : S.dim; }
  function applyBrightness() {
    dimEl.style.opacity = String(effectiveDim() / 100);
    warmEl.style.opacity = (S.warm || restOn) ? '0.12' : '0';
  }

  /* ---------- Animações discretas (canvas leve) ---------- */
  var cv, cx, parts = [], raf = 0, lastFrame = 0, rgb = [128, 107, 87], overlayOpen = false;
  var FRAME_MS = 45; // ~22 quadros por segundo

  function readColor() {
    var probe = h('span', { style: 'color:var(--soft);position:absolute;visibility:hidden' });
    d.body.appendChild(probe);
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(w.getComputedStyle(probe).color);
    d.body.removeChild(probe);
    if (m) { rgb = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]; }
  }

  function sizeCanvas() {
    cv.width = Math.max(1, w.innerWidth);
    cv.height = Math.max(1, w.innerHeight);
    seed();
  }

  function seed() {
    var i, n = S.anim === 'rain' ? 46 : 22, W = cv.width, H = cv.height, u = H / 100;
    parts = [];
    for (i = 0; i < n; i++) {
      if (S.anim === 'rain') {
        parts.push({ x: Math.random() * W, y: Math.random() * H, l: (3 + Math.random() * 4) * u, v: (70 + Math.random() * 60) * u, a: 0.10 + Math.random() * 0.14 });
      } else {
        parts.push({ x: Math.random() * W, y: Math.random() * H, r: (0.6 + Math.random() * 1.6) * u, vx: (Math.random() - 0.5) * 1.6 * u, vy: -(0.8 + Math.random() * 2.2) * u, a: 0.07 + Math.random() * 0.15, ph: Math.random() * 6.28 });
      }
    }
  }

  function frame(ts) {
    raf = w.requestAnimationFrame(frame);
    if (ts - lastFrame < FRAME_MS) { return; }
    var dt = Math.min(0.1, (ts - lastFrame) / 1000);
    lastFrame = ts;
    var W = cv.width, H = cv.height, i, p;
    cx.clearRect(0, 0, W, H);
    if (S.anim === 'rain') {
      cx.lineWidth = Math.max(1, H / 300);
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.y += p.v * dt; p.x -= p.v * dt * 0.12;
        if (p.y > H + p.l) { p.y = -p.l; p.x = Math.random() * W; }
        cx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + p.a + ')';
        cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.l * 0.12, p.y + p.l); cx.stroke();
      }
    } else {
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.ph += dt * 0.6;
        p.x += (p.vx + Math.sin(p.ph) * 0.4 * (H / 100)) * dt * 3;
        p.y += p.vy * dt * 3;
        if (p.y < -p.r * 2) { p.y = H + p.r * 2; p.x = Math.random() * W; }
        if (p.x < -10) { p.x = W + 10; } else if (p.x > W + 10) { p.x = -10; }
        cx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (p.a * (0.6 + 0.4 * Math.sin(p.ph * 1.7))) + ')';
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.2832); cx.fill();
      }
    }
  }

  function fxShouldRun() {
    return S.anim !== 'none' && !restOn && !overlayOpen && !d.hidden;
  }

  function fxSync() {
    if (fxShouldRun()) {
      if (!raf) { lastFrame = 0; raf = w.requestAnimationFrame(frame); }
    } else if (raf) {
      w.cancelAnimationFrame(raf); raf = 0;
      cx.clearRect(0, 0, cv.width, cv.height);
    }
  }

  /* ---------- Modo descanso ---------- */
  var restEl, restTime, restDate, restHint, hintTimer;
  function restPaint() {
    var n = new Date();
    restTime.textContent = Cozy.fmt.pad(n.getHours()) + ':' + Cozy.fmt.pad(n.getMinutes());
    restDate.textContent = Cozy.fmt.cap(Cozy.fmt.DIAS[n.getDay()]) + ', ' + n.getDate() + ' de ' + Cozy.fmt.MESES[n.getMonth()];
  }

  function enterRest(auto) {
    if (restOn) { return; }
    restOn = true; restAuto = !!auto;
    Cozy.closeAll();
    restPaint();
    restEl.className = 'on';
    restHint.style.opacity = '1';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { restHint.style.opacity = '0'; }, 4000);
    applyTheme(); applyBrightness(); fxSync();
  }

  function exitRest(byUser) {
    if (!restOn) { return; }
    restOn = false;
    if (byUser && restAuto) { restDismissed = true; }
    restEl.className = '';
    applyTheme(); applyBrightness(); fxSync();
    Cozy.glanceSoon();
  }

  function inRestWindow(hr) {
    var a = S.restFrom, b = S.restTo;
    return a <= b ? (hr >= a && hr < b) : (hr >= a || hr < b);
  }

  function checkRestSchedule(now) {
    if (!S.restAuto) { return; }
    var inside = inRestWindow(now.getHours());
    if (inside && !restOn && !restDismissed) { enterRest(true); }
    if (!inside) {
      restDismissed = false;
      if (restOn && restAuto) { exitRest(false); }
    }
  }

  Cozy.rest = { enter: function () { enterRest(false); }, exit: function () { exitRest(true); }, isOn: function () { return restOn; } };

  /* ---------- Início ---------- */
  Cozy.on('boot', function () {
    wall = h('div', { id: 'cz-wall' });
    cv = h('canvas', { id: 'cz-fx' });
    cx = cv.getContext('2d');
    dimEl = h('div', { id: 'cz-dim' });
    warmEl = h('div', { id: 'cz-warm' });
    restTime = h('div', { class: 'cz-rest-time' });
    restDate = h('div', { class: 'cz-rest-date' });
    restHint = h('div', { class: 'cz-rest-hint', text: 'Toque para sair do modo descanso' });
    restEl = h('div', { id: 'cz-rest', onclick: function () { exitRest(true); } }, [restTime, restDate, restHint]);

    // o fundo vem antes do #app para ficar atrás dele
    d.body.insertBefore(cv, d.body.firstChild);
    d.body.insertBefore(wall, d.body.firstChild);
    d.body.appendChild(restEl);
    d.body.appendChild(dimEl);
    d.body.appendChild(warmEl);

    // toque no relógio troca o modo (substitui o comportamento do script.js)
    d.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== d) {
        if (t.id === 'clock') { e.stopPropagation(); cycleMode(); return; }
        t = t.parentNode;
      }
    }, true);

    if (w.MutationObserver) {
      new MutationObserver(function () {
        if (root.getAttribute('data-theme') !== desiredTheme()) { applyTheme(); }
      }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }

    applyPalette(); applyTheme(); applyWall(); applyBrightness();
    readColor(); sizeCanvas(); fxSync();

    w.addEventListener('resize', function () { sizeCanvas(); });
    d.addEventListener('visibilitychange', fxSync);

    Cozy.on('overlay', function (on) { overlayOpen = on; fxSync(); });
    Cozy.on('minute', function (now) { applyTheme(); checkRestSchedule(now); if (restOn) { restPaint(); } });
    Cozy.on('theme', function () { setTimeout(readColor, 0); });
    Cozy.on('settings', function (k) {
      if (k === 'palette' || k === 'all') { applyPalette(); }
      if (k === 'mode' || k === 'all') { applyTheme(); }
      if (k === 'wall' || k === 'wallFade' || k === 'all') { applyWall(); }
      if (k === 'dim' || k === 'warm' || k === 'all') { applyBrightness(); }
      if (k === 'anim' || k === 'all') { seed(); fxSync(); }
      if (k === 'palette' || k === 'all') { setTimeout(readColor, 30); }
      if (k === 'restAuto' || k === 'restFrom' || k === 'restTo') { restDismissed = false; checkRestSchedule(new Date()); }
    });

    Cozy.registerPage({ id: 'rest', title: 'Descanso', icon: 'moon', action: function () { enterRest(false); }, status: function () { return S.restAuto ? 'Automático ' + S.restFrom + 'h–' + S.restTo + 'h' : 'Relógio calmo'; } });
    checkRestSchedule(new Date());
  });
})(window, document);
