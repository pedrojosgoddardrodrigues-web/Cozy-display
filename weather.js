/* ===== Cozy Display — clima =====
   Fonte: Open-Meteo (https://open-meteo.com), gratuita para uso não comercial, sem chave de API.
   Dados sob licença CC BY 4.0: a atribuição aparece no rodapé desta tela. */
(function (w, d) {
  'use strict';
  var Cozy = w.Cozy, h = Cozy.h, fmt = Cozy.fmt, L = w.COZY_LOCAL || {};

  var CITY = L.city || 'Belo Horizonte, MG';
  var LAT = (L.latitude !== undefined) ? L.latitude : -19.9167;
  var LON = (L.longitude !== undefined) ? L.longitude : -43.9345;
  var TZ = L.timezone || 'America/Sao_Paulo';
  var URL = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=' + encodeURIComponent(TZ) + '&forecast_days=6';

  var REFRESH_MS = 30 * 60 * 1000;   // atualiza a cada 30 min
  var STALE_MS = 3 * 60 * 60 * 1000; // depois de 3 h os dados aparecem esmaecidos
  var RETRY_MS = 2 * 60 * 1000;      // intervalo mínimo entre tentativas

  var cache = Cozy.store.get('weather', null);
  var loading = false, lastError = null, lastTry = 0, box = null, pageOpen = false;

  /* ---------- Códigos WMO -> texto e ícone ---------- */
  function describe(code, isDay) {
    var day = !!isDay;
    switch (code) {
      case 0: return { l: 'Céu limpo', i: day ? 'sun' : 'moon' };
      case 1: return { l: 'Predominantemente limpo', i: day ? 'sun' : 'moon' };
      case 2: return { l: 'Parcialmente nublado', i: day ? 'partlyDay' : 'partlyNight' };
      case 3: return { l: 'Nublado', i: 'cloud' };
      case 45: case 48: return { l: 'Neblina', i: 'fog' };
      case 51: case 53: case 55: return { l: 'Garoa', i: 'rain' };
      case 56: case 57: return { l: 'Garoa congelante', i: 'rain' };
      case 61: return { l: 'Chuva fraca', i: 'rain' };
      case 63: return { l: 'Chuva', i: 'rain' };
      case 65: return { l: 'Chuva forte', i: 'rain' };
      case 66: case 67: return { l: 'Chuva congelante', i: 'rain' };
      case 71: case 73: case 75: case 77: case 85: case 86: return { l: 'Neve', i: 'snow' };
      case 80: return { l: 'Pancadas fracas', i: 'rain' };
      case 81: return { l: 'Pancadas de chuva', i: 'rain' };
      case 82: return { l: 'Pancadas fortes', i: 'rain' };
      case 95: return { l: 'Tempestade', i: 'storm' };
      case 96: case 99: return { l: 'Tempestade com granizo', i: 'storm' };
      default: return { l: 'Condição desconhecida', i: 'cloud' };
    }
  }
  Cozy.weatherInfo = describe;

  function ageMs() { return cache ? Date.now() - cache.t : Infinity; }
  function hhmm(ms) { var t = new Date(ms); return fmt.pad(t.getHours()) + ':' + fmt.pad(t.getMinutes()); }
  function deg(n) { return Math.round(n) + '°'; }

  /* ---------- Busca ---------- */
  function valid(j) {
    return j && j.current && typeof j.current.temperature_2m === 'number' &&
      j.daily && j.daily.time && j.daily.time.length > 1 && j.daily.temperature_2m_max;
  }

  function fetchWeather() {
    if (loading) { return; }
    lastTry = Date.now();
    loading = true;
    paint();
    var timeout = new Promise(function (res, rej) { setTimeout(function () { rej(new Error('tempo esgotado')); }, 15000); });
    Promise.race([w.fetch(URL), timeout]).then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.json();
    }).then(function (j) {
      if (!valid(j)) { throw new Error('resposta inesperada'); }
      cache = { t: Date.now(), data: j };
      Cozy.store.set('weather', cache);
      lastError = null;
    }).catch(function (e) {
      lastError = e;
    }).then(function () {
      loading = false;
      paint();
      Cozy.glanceSoon();
    });
  }

  function maybeRefresh(minAge) {
    if (!Cozy.widgetOn('weather')) { return; }
    if (ageMs() < minAge) { return; }
    if (Date.now() - lastTry < RETRY_MS) { return; }
    fetchWeather();
  }

  /* ---------- Tela ---------- */
  function dayLabel(key, idx) {
    if (idx === 1) { return 'Amanhã'; }
    var p = fmt.parseKey(key);
    if (!p) { return key; }
    return fmt.cap(fmt.DIAS3[new Date(p.y, p.m - 1, p.d).getDay()]);
  }

  function stat(label, value) {
    return h('div', { class: 'wx-stat' }, [h('span', { class: 'wx-stat-l', text: label }), h('span', { class: 'wx-stat-v', text: value })]);
  }

  function paint() {
    if (!box) { return; }
    box.innerHTML = '';
    var foot, wrap;

    if (!cache) {
      box.appendChild(h('div', { class: 'wx-empty' }, [
        h('p', { text: loading ? 'Buscando o clima…' : 'Sem dados de clima ainda.' }),
        (!loading && lastError) ? h('p', { class: 'wx-err', text: 'Não consegui consultar o serviço (' + lastError.message + '). Confira a internet.' }) : null,
        loading ? null : h('button', { type: 'button', class: 'cz-btn solid', text: 'Tentar de novo', onclick: fetchWeather })
      ]));
      return;
    }

    var j = cache.data, c = j.current, dd = j.daily, now = describe(c.weather_code, c.is_day), i;
    var days = h('div', { class: 'wx-days' });
    for (i = 1; i < dd.time.length && i <= 5; i++) {
      var info = describe(dd.weather_code[i], 1);
      var rain = dd.precipitation_probability_max ? dd.precipitation_probability_max[i] : null;
      days.appendChild(h('div', { class: 'wx-day' }, [
        h('span', { class: 'wx-day-n', text: dayLabel(dd.time[i], i) }),
        Cozy.icon(info.i, 'wx-day-i'),
        h('span', { class: 'wx-day-c', text: info.l }),
        h('span', { class: 'wx-day-r', text: (rain === null || rain === undefined) ? '' : rain + '%' }),
        h('span', { class: 'wx-day-t' }, [h('b', { text: deg(dd.temperature_2m_max[i]) }), h('i', { text: ' ' + deg(dd.temperature_2m_min[i]) })])
      ]));
    }

    var today = dd.precipitation_probability_max ? dd.precipitation_probability_max[0] : null;
    var left = h('div', { class: 'wx-now' }, [
      h('div', { class: 'wx-big' }, [Cozy.icon(now.i)]),
      h('div', { class: 'wx-temp', text: deg(c.temperature_2m) }),
      h('div', { class: 'wx-cond', text: now.l }),
      h('div', { class: 'wx-stats' }, [
        stat('Sensação', deg(c.apparent_temperature)),
        stat('Umidade', Math.round(c.relative_humidity_2m) + '%'),
        stat('Vento', Math.round(c.wind_speed_10m) + ' km/h'),
        stat('Hoje', deg(dd.temperature_2m_max[0]) + ' / ' + deg(dd.temperature_2m_min[0]) + (today !== null && today !== undefined ? ' · ' + today + '%' : ''))
      ])
    ]);

    var status = loading ? 'Atualizando…' :
      (lastError ? 'Sem conexão agora. Dados de ' + hhmm(cache.t) : 'Atualizado às ' + hhmm(cache.t));
    foot = h('div', { class: 'wx-foot' }, [
      h('span', { text: CITY + ' · ' + status + ' · ' }),
      h('a', { href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener', text: 'Dados: Open-Meteo.com' })
    ]);

    wrap = h('div', { class: 'wx-wrap' }, [left, days]);
    box.appendChild(wrap);
    box.appendChild(foot);
  }

  /* ---------- Registro ---------- */
  Cozy.on('boot', function () {
    Cozy.registerPage({
      id: 'weather', title: 'Clima', icon: 'weather', widget: 'weather',
      status: function () {
        if (!cache) { return CITY.split(',')[0]; }
        var c = cache.data.current;
        return deg(c.temperature_2m) + ' · ' + describe(c.weather_code, c.is_day).l;
      },
      build: function (body, actions) {
        box = h('div', { class: 'wx-box' });
        body.appendChild(box);
        actions.appendChild(h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Atualizar clima', onclick: function () { fetchWeather(); } }, [Cozy.icon('reset')]));
        paint();
      },
      onOpen: function () { pageOpen = true; paint(); maybeRefresh(10 * 60 * 1000); },
      onClose: function () { pageOpen = false; }
    });

    Cozy.registerChip({
      id: 'weather', order: 20, widget: 'weather', page: 'weather',
      render: function () {
        if (!cache) { return null; }
        var c = cache.data.current, info = describe(c.weather_code, c.is_day);
        return { icon: info.i, text: deg(c.temperature_2m), cls: ageMs() > STALE_MS ? 'stale' : '' };
      }
    });

    Cozy.on('minute', function () { maybeRefresh(REFRESH_MS); if (pageOpen) { paint(); } });
    Cozy.on('settings', function (k) { if (k === 'widgets' || k === 'all') { maybeRefresh(REFRESH_MS); } });
    d.addEventListener('visibilitychange', function () { if (!d.hidden) { maybeRefresh(15 * 60 * 1000); } });
    w.addEventListener('online', function () { lastTry = 0; maybeRefresh(5 * 60 * 1000); });
    maybeRefresh(REFRESH_MS);
  });
})(window, document);
