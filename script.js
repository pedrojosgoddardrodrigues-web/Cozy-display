/* ===== Cozy Display =====
   Relógio + painel do Spotify. JavaScript puro, sem bibliotecas.
   Escrito de forma conservadora para rodar no Chrome do Android 8. */
(function () {
  'use strict';

  /* ---------- Configuração ---------- */
  var CFG = window.COZY_CONFIG || {};
  var CLIENT_ID = String(CFG.clientId || '').replace(/\s/g, '');
  if (CLIENT_ID.indexOf('COLE_') === 0) { CLIENT_ID = ''; }

  // O endereço de retorno é calculado a partir de onde a página está hospedada.
  // Ele precisa estar cadastrado, idêntico, no painel do Spotify.
  var REDIRECT_URI = location.origin + location.pathname.replace(/index\.html$/, '');

  var SCOPES = 'user-read-playback-state user-modify-playback-state';
  var AUTH_URL = 'https://accounts.spotify.com/authorize';
  var TOKEN_URL = 'https://accounts.spotify.com/api/token';
  var API = 'https://api.spotify.com/v1';

  var POLL_PLAYING = 4000;   // consulta o Spotify a cada 4 s com música tocando
  var POLL_PAUSED = 8000;    // e a cada 8 s se estiver pausado ou sem música

  var LS = {
    access: 'cozy_access',
    expires: 'cozy_expires',
    refresh: 'cozy_refresh',
    verifier: 'cozy_verifier',
    state: 'cozy_state',
    theme: 'cozy_theme'
  };

  /* ---------- Utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  function sdel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } }

  function qs(obj) {
    var out = [];
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        out.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
      }
    }
    return out.join('&');
  }

  var el = {
    time: $('time'), date: $('date'), clock: $('clock'),
    cover: $('cover'), title: $('title'), artist: $('artist'), album: $('album'),
    pos: $('pos'), dur: $('dur'), fill: $('fill'),
    prev: $('btnPrev'), play: $('btnPlay'), next: $('btnNext'),
    status: $('status'), connect: $('btnConnect'),
    full: $('btnFull'), logout: $('btnLogout'),
    toast: $('toast'), redirectUri: $('redirectUri'), metaTheme: $('metaTheme')
  };
  var body = document.body;

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 3500);
  }

  function setStatus(msg) { el.status.textContent = msg || ''; }

  /* ---------- Relógio e data ---------- */
  var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var lastTime = '', lastDate = '';

  function tickClock() {
    var d = new Date();
    var t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var dt = DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
    if (t !== lastTime) { el.time.textContent = t; lastTime = t; applyTheme(d); }
    if (dt !== lastDate) { el.date.textContent = dt; lastDate = dt; }
  }

  /* ---------- Tema (automático / claro / escuro) ---------- */
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_NAMES = { auto: 'automático (escuro à noite)', light: 'claro', dark: 'escuro' };
  var themeMode = sget(LS.theme) || 'auto';
  if (THEMES.indexOf(themeMode) < 0) { themeMode = 'auto'; }

  function applyTheme(now) {
    var dark;
    if (themeMode === 'auto') {
      var h = (now || new Date()).getHours();
      dark = (h >= 22 || h < 6);
    } else {
      dark = (themeMode === 'dark');
    }
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    el.metaTheme.setAttribute('content', dark ? '#493B32' : '#F5F0E8');
  }

  /* ---------- PKCE ---------- */
  function randomString(len) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    var arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    var s = '';
    for (var i = 0; i < len; i++) { s += chars.charAt(arr[i] % chars.length); }
    return s;
  }

  function base64url(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i++) { s += String.fromCharCode(bytes[i]); }
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function login() {
    if (!window.crypto || !crypto.subtle) {
      toast('Este navegador não permite o login seguro. Abra a página por https://.');
      return;
    }
    var verifier = randomString(96);
    var state = randomString(16);
    sset(LS.verifier, verifier);
    sset(LS.state, state);
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (hash) {
      location.href = AUTH_URL + '?' + qs({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        state: state,
        code_challenge_method: 'S256',
        code_challenge: base64url(hash)
      });
    })['catch'](function () { toast('Não consegui iniciar o login.'); });
  }

  function postForm(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs(data)
    }).then(function (r) {
      return r.json()['catch'](function () { return {}; }).then(function (j) {
        return { ok: r.ok, status: r.status, json: j };
      });
    });
  }

  function saveTokens(j) {
    sset(LS.access, j.access_token);
    sset(LS.expires, String(Date.now() + (j.expires_in || 3600) * 1000));
    if (j.refresh_token) { sset(LS.refresh, j.refresh_token); }
  }

  function clearAuth() {
    sdel(LS.access); sdel(LS.expires); sdel(LS.refresh);
    sdel(LS.verifier); sdel(LS.state);
  }

  var refreshing = null;
  function refreshToken() {
    var rt = sget(LS.refresh);
    if (!rt) { return Promise.resolve(null); }
    if (refreshing) { return refreshing; }
    refreshing = postForm(TOKEN_URL, {
      grant_type: 'refresh_token',
      refresh_token: rt,
      client_id: CLIENT_ID
    }).then(function (x) {
      refreshing = null;
      if (x.ok && x.json.access_token) { saveTokens(x.json); return x.json.access_token; }
      if (x.status === 400 || x.status === 401) { clearAuth(); return null; } // autorização revogada/expirada
      throw new Error('refresh');
    }, function (err) { refreshing = null; throw err; }); // erro de rede: mantém o login e tenta depois
    return refreshing;
  }

  function getToken() {
    var t = sget(LS.access);
    var exp = parseInt(sget(LS.expires) || '0', 10);
    if (t && Date.now() < exp - 60000) { return Promise.resolve(t); }
    return refreshToken();
  }

  function handleCallback(code, state) {
    var verifier = sget(LS.verifier);
    var savedState = sget(LS.state);
    cleanUrl();
    if (!code || !verifier || state !== savedState) {
      toast('Login inválido. Tente conectar de novo.');
      showLogin();
      return;
    }
    setStatus('Conectando…');
    postForm(TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier
    }).then(function (x) {
      sdel(LS.verifier); sdel(LS.state);
      if (x.ok && x.json.access_token) {
        saveTokens(x.json);
        startPlayer();
      } else {
        toast('O Spotify recusou o login (' + (x.json.error_description || x.json.error || x.status) + ').');
        showLogin();
      }
    }, function () {
      toast('Sem conexão para concluir o login.');
      showLogin();
    });
  }

  function cleanUrl() {
    try { history.replaceState(null, '', REDIRECT_URI); } catch (e) { /* ignora */ }
  }

  /* ---------- Chamadas à API ---------- */
  function request(method, path, isRetry) {
    return getToken().then(function (tok) {
      if (!tok) { return { status: 401, body: null, retry: 0 }; }
      return fetch(API + path, {
        method: method,
        headers: { 'Authorization': 'Bearer ' + tok }
      }).then(function (r) {
        if (r.status === 401 && !isRetry) {
          sdel(LS.access); sdel(LS.expires);
          return request(method, path, true);
        }
        var retry = parseInt(r.headers.get('Retry-After') || '0', 10) || 0;
        if (r.status === 204) { return { status: 204, body: null, retry: retry }; }
        return r.text().then(function (t) {
          var b = null;
          try { b = t ? JSON.parse(t) : null; } catch (e) { b = null; }
          return { status: r.status, body: b, retry: retry };
        });
      });
    });
  }

  /* ---------- Estado do player ---------- */
  var started = false;
  var state = null;        // última resposta de /me/player
  var syncedAt = 0;        // quando recebemos esse estado (para animar a barra)
  var coverUrl = '';
  var pollTimer = null;
  var lastEndPoll = 0;

  function schedule(ms) {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, ms);
  }

  function poll() {
    if (!started) { return; }
    if (document.hidden) { schedule(3000); return; }

    request('GET', '/me/player?additional_types=episode').then(function (res) {
      var next = POLL_PAUSED;
      if (res.status === 200 && res.body && res.body.item) {
        applyState(res.body);
        next = res.body.is_playing ? POLL_PLAYING : POLL_PAUSED;
      } else if (res.status === 200 || res.status === 204) {
        applyState(null);
      } else if (res.status === 401) {
        logout(true);
        return;
      } else if (res.status === 403) {
        applyState(null);
        setStatus('O Spotify recusou o acesso. Confira se seu e-mail está na lista de usuários do app e se o Premium está ativo.');
        next = 30000;
      } else if (res.status === 429) {
        next = Math.max(res.retry || 10, 5) * 1000;
      } else {
        next = 10000;
      }
      schedule(next);
    }, function () {
      if (!state) { setStatus('Sem conexão. Tentando de novo…'); }
      schedule(10000);
    });
  }

  function pickImage(images) {
    if (!images || !images.length) { return ''; }
    var best = null, biggest = images[0], i, w;
    for (i = 0; i < images.length; i++) {
      w = images[i].width || 0;
      if (w > (biggest.width || 0)) { biggest = images[i]; }
      if (w >= 500 && (!best || w < (best.width || 0))) { best = images[i]; }
    }
    return (best || biggest).url || '';
  }

  function applyState(s) {
    if (!s || !s.item) {
      state = null;
      body.classList.remove('has-track', 'playing');
      setStatus('Nada tocando agora. Toque uma música em qualquer aparelho.');
      return;
    }
    state = s;
    syncedAt = Date.now();

    var it = s.item, isEp = it.type === 'episode';
    var title = it.name || '';
    var artist, album, images;
    if (isEp) {
      artist = (it.show && it.show.name) || '';
      album = (it.show && it.show.publisher) || '';
      images = (it.images && it.images.length) ? it.images : (it.show && it.show.images);
    } else {
      var names = [], a = it.artists || [], i;
      for (i = 0; i < a.length; i++) { names.push(a[i].name); }
      artist = names.join(', ');
      album = (it.album && it.album.name) || '';
      images = it.album && it.album.images;
    }

    el.title.textContent = title;
    el.artist.textContent = artist;
    el.album.textContent = album;
    el.dur.textContent = fmt(it.duration_ms || 0);

    var url = pickImage(images);
    if (url !== coverUrl) {
      coverUrl = url;
      if (url) { el.cover.src = url; } else { el.cover.removeAttribute('src'); }
    }

    setStatus('');
    body.classList.add('has-track');
    if (s.is_playing) { body.classList.add('playing'); } else { body.classList.remove('playing'); }
    updateProgress();
  }

  /* ---------- Progresso (animado localmente entre as consultas) ---------- */
  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + pad(s % 60);
  }

  function currentPos() {
    if (!state || !state.item) { return 0; }
    var dur = state.item.duration_ms || 0;
    var pos = state.progress_ms || 0;
    if (state.is_playing) { pos += Date.now() - syncedAt; }
    return Math.min(pos, dur);
  }

  var lastPosText = '', lastPct = -1;
  function updateProgress() {
    if (!state || !state.item) { return; }
    var dur = state.item.duration_ms || 0;
    var pos = currentPos();
    var t = fmt(pos);
    if (t !== lastPosText) { el.pos.textContent = t; lastPosText = t; }
    var pct = dur ? Math.round((pos / dur) * 1000) / 10 : 0;
    if (pct !== lastPct) { el.fill.style.width = pct + '%'; lastPct = pct; }

    // a música acabou? pergunta ao Spotify qual é a próxima
    if (state.is_playing && dur && pos >= dur && Date.now() - lastEndPoll > 3000) {
      lastEndPoll = Date.now();
      schedule(800);
    }
  }

  /* ---------- Controles ---------- */
  var busyUntil = 0;
  function guard() {
    var now = Date.now();
    if (now < busyUntil) { return false; }
    busyUntil = now + 350;
    return true;
  }

  function afterControl(res) {
    if (res && res.status === 404) {
      toast('Nenhum aparelho ativo. Abra o Spotify e toque uma música.');
    } else if (res && res.status === 403) {
      toast('O Spotify não permitiu esse comando agora.');
    } else if (res && res.status === 401) {
      logout(true);
      return;
    }
    schedule(500);
  }

  function onControlError() { toast('Sem conexão com o Spotify.'); schedule(3000); }

  function togglePlay() {
    if (!guard() || !state) { return; }
    var wasPlaying = !!state.is_playing;
    // atualiza a tela na hora, sem esperar a resposta
    state.progress_ms = currentPos();
    syncedAt = Date.now();
    state.is_playing = !wasPlaying;
    if (state.is_playing) { body.classList.add('playing'); } else { body.classList.remove('playing'); }
    request('PUT', wasPlaying ? '/me/player/pause' : '/me/player/play').then(afterControl, onControlError);
  }

  function skip(dir) {
    if (!guard() || !state) { return; }
    request('POST', '/me/player/' + dir).then(afterControl, onControlError);
  }

  /* ---------- Sessão ---------- */
  function startPlayer() {
    started = true;
    body.classList.add('connected');
    setStatus('Conectado. Procurando música…');
    poll();
  }

  function showLogin() {
    started = false;
    clearTimeout(pollTimer);
    state = null;
    body.classList.remove('connected', 'has-track', 'playing');
    setStatus('Conecte sua conta Spotify para ver a música que está tocando.');
  }

  function logout(expired) {
    clearAuth();
    showLogin();
    if (expired) { setStatus('Sessão expirada. Conecte o Spotify de novo.'); }
  }

  var logoutArmed = 0;
  function onLogoutTap() {
    if (Date.now() - logoutArmed < 3000) { logout(false); return; }
    logoutArmed = Date.now();
    toast('Toque de novo para desconectar do Spotify.');
  }

  /* ---------- Tela cheia, orientação e tela sempre ligada ---------- */
  function lockOrientation() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        var p = screen.orientation.lock('landscape');
        if (p && p['catch']) { p['catch'](function () { /* ignora */ }); }
      }
    } catch (e) { /* ignora */ }
  }

  function toggleFullscreen() {
    var d = document, e = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      return;
    }
    var rq = e.requestFullscreen || e.webkitRequestFullscreen;
    if (!rq) { toast('Este navegador não oferece tela cheia.'); return; }
    var p = rq.call(e);
    if (p && p.then) { p.then(lockOrientation, function () { /* ignora */ }); } else { lockOrientation(); }
  }

  var wakeLock = null;
  function keepAwake() {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request && !wakeLock) {
        navigator.wakeLock.request('screen').then(function (s) {
          wakeLock = s;
          s.addEventListener('release', function () { wakeLock = null; });
        }, function () { /* ignora */ });
      }
    } catch (e) { /* ignora */ }
  }

  /* ---------- Início ---------- */
  function init() {
    applyTheme();
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(updateProgress, 500);

    el.clock.addEventListener('click', function () {
      themeMode = THEMES[(THEMES.indexOf(themeMode) + 1) % THEMES.length];
      sset(LS.theme, themeMode);
      applyTheme();
      toast('Tema: ' + THEME_NAMES[themeMode]);
    });
    el.connect.addEventListener('click', login);
    el.play.addEventListener('click', togglePlay);
    el.prev.addEventListener('click', function () { skip('previous'); });
    el.next.addEventListener('click', function () { skip('next'); });
    el.full.addEventListener('click', toggleFullscreen);
    el.logout.addEventListener('click', onLogoutTap);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { keepAwake(); if (started) { schedule(0); } }
    });
    window.addEventListener('online', function () { if (started) { schedule(0); } });
    keepAwake();

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js')['catch'](function () { /* ignora */ });
    }

    // Sem Client ID: mostra o passo de configuração
    if (!CLIENT_ID) {
      el.redirectUri.textContent = REDIRECT_URI;
      body.classList.add('setup');
      return;
    }

    // Voltando do login do Spotify?
    var params = new URLSearchParams(location.search);
    if (params.get('error')) {
      cleanUrl();
      toast('Login cancelado.');
      showLogin();
      return;
    }
    if (params.get('code')) {
      handleCallback(params.get('code'), params.get('state'));
      return;
    }

    if (sget(LS.refresh) || sget(LS.access)) { startPlayer(); } else { showLogin(); }
  }

  init();
})();
