/* ===== Cozy Display — ajustes: temas, papel de parede, brilho, animações, widgets, descanso ===== */
(function (w, d) {
  'use strict';
  var Cozy = w.Cozy, S = Cozy.settings, h = Cozy.h, body = null;

  var WIDGETS = [
    { id: 'calendar', name: 'Calendário e datas' },
    { id: 'weather',  name: 'Clima' },
    { id: 'focus',    name: 'Foco (pomodoro, timer, cronômetro)' },
    { id: 'tasks',    name: 'Tarefas' },
    { id: 'notes',    name: 'Notas' },
    { id: 'sound',    name: 'Sons ambientes' }
  ];

  function sec(title, kids) {
    return h('section', { class: 'st-sec' }, [h('h3', { text: title })].concat(kids));
  }

  function hourText(v) { return v + 'h'; }

  function paletteRow() {
    var row = h('div', { class: 'st-pal' }), i, btns = [];
    function paint() { for (var j = 0; j < btns.length; j++) { btns[j].b.className = 'st-sw' + (btns[j].id === S.palette ? ' on' : ''); } }
    function make(p) {
      var b = h('button', { type: 'button', class: 'st-sw', 'aria-label': 'Tema ' + p.name, onclick: function () { Cozy.set('palette', p.id); paint(); } }, [
        h('span', { class: 'st-dots' }, [h('i', { style: 'background:' + p.sw[0] }), h('i', { style: 'background:' + p.sw[1] }), h('i', { style: 'background:' + p.sw[2] })]),
        h('em', { text: p.name })
      ]);
      btns.push({ id: p.id, b: b });
      row.appendChild(b);
    }
    for (i = 0; i < Cozy.palettes.length; i++) { make(Cozy.palettes[i]); }
    paint();
    return row;
  }

  function wallControls() {
    var fadeRow, photoRow, input;
    var seg = Cozy.ui.seg([
      { v: 'none', label: 'Nenhum' }, { v: 'linen', label: 'Linho' }, { v: 'dots', label: 'Pontos' }, { v: 'glow', label: 'Brilho' }, { v: 'photo', label: 'Foto' }
    ], S.wall, function (v) {
      if (v === 'photo' && !Cozy.store.get('wallphoto', '')) { Cozy.set('wall', 'none'); input.click(); return; }
      Cozy.set('wall', v);
      sync();
    });
    input = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      Cozy.pickWallpaper(f, function () { seg.set('photo'); sync(); });
      input.value = '';
    });
    var fade = Cozy.ui.range(40, 95, 1, S.wallFade, function (v) { Cozy.set('wallFade', v); });
    fadeRow = Cozy.ui.row('Esmaecer a foto', fade.el, 'Mais alto deixa o texto mais legível');
    photoRow = h('div', { class: 'st-photo' }, [
      h('button', { type: 'button', class: 'cz-btn', onclick: function () { input.click(); } }, [Cozy.icon('photo'), h('span', { text: 'Escolher foto' })]),
      h('button', { type: 'button', class: 'cz-btn', onclick: function () { Cozy.store.del('wallphoto'); Cozy.set('wall', 'none'); seg.set('none'); sync(); } }, [Cozy.icon('trash'), h('span', { text: 'Remover' })])
    ]);
    function sync() {
      var has = !!Cozy.store.get('wallphoto', '');
      fadeRow.style.display = S.wall === 'photo' ? '' : 'none';
      photoRow.style.display = (S.wall === 'photo' || has) ? '' : 'none';
    }
    sync();
    return [seg.el, photoRow, fadeRow, input];
  }

  function paint() {
    body.innerHTML = '';
    var resetArmed = 0, i, wl = [];

    var look = sec('Aparência', [
      paletteRow(),
      Cozy.ui.row('Modo', Cozy.ui.seg([{ v: 'auto', label: 'Auto' }, { v: 'light', label: 'Claro' }, { v: 'dark', label: 'Noite' }], S.mode, function (v) { Cozy.set('mode', v); }).el, 'Auto: noite das 22h às 6h'),
      Cozy.ui.row('Escurecer', Cozy.ui.range(0, 60, 1, S.dim, function (v) { Cozy.set('dim', v); }).el, 'Brilho visual da tela'),
      Cozy.ui.row('Luz quente', Cozy.ui.sw(S.warm, function (v) { Cozy.set('warm', v); }).el, 'Tom âmbar, bom à noite')
    ]);

    var wall = sec('Papel de parede', wallControls());

    var anim = sec('Animações', [
      Cozy.ui.seg([{ v: 'none', label: 'Nenhuma' }, { v: 'dust', label: 'Partículas' }, { v: 'rain', label: 'Chuva' }], S.anim, function (v) { Cozy.set('anim', v); }).el,
      h('p', { class: 'cz-note', text: 'Ficam bem discretas e pausam sozinhas no modo descanso e quando um menu está aberto.' })
    ]);

    var wd = [];
    function addW(wi) { wd.push(Cozy.ui.row(wi.name, Cozy.ui.sw(Cozy.widgetOn(wi.id), function (v) { Cozy.setWidget(wi.id, v); }).el)); }
    for (i = 0; i < WIDGETS.length; i++) { addW(WIDGETS[i]); }
    var widgets = sec('Widgets', wd);

    var rest = sec('Modo descanso', [
      Cozy.ui.row('Entrar automaticamente', Cozy.ui.sw(S.restAuto, function (v) { Cozy.set('restAuto', v); }).el, 'Só o relógio, bem escuro'),
      Cozy.ui.row('A partir das', Cozy.ui.stepper(S.restFrom, 0, 23, 1, function (v) { Cozy.set('restFrom', v); }, hourText).el),
      Cozy.ui.row('Até as', Cozy.ui.stepper(S.restTo, 0, 23, 1, function (v) { Cozy.set('restTo', v); }, hourText).el),
      h('button', { type: 'button', class: 'cz-btn', onclick: function () { Cozy.rest.enter(); } }, [Cozy.icon('moon'), h('span', { text: 'Entrar agora' })])
    ]);

    var resetBtn = h('button', { type: 'button', class: 'cz-btn', onclick: function () {
      if (Date.now() - resetArmed < 3000) { Cozy.resetSettings(); paint(); Cozy.toast('Ajustes restaurados.'); return; }
      resetArmed = Date.now();
      Cozy.toast('Toque de novo para restaurar os padrões.');
    } }, [Cozy.icon('reset'), h('span', { text: 'Restaurar padrões' })]);
    var about = sec('Sobre', [
      h('p', { class: 'cz-note', text: 'Tarefas, notas e datas ficam guardadas só neste aparelho. O Spotify é configurado no arquivo config.js. Atalhos no computador: M abre o menu, Esc fecha.' }),
      resetBtn
    ]);

    body.appendChild(h('div', { class: 'st-grid' }, [look, wall, anim, widgets, rest, about]));
  }

  Cozy.on('boot', function () {
    Cozy.registerPage({
      id: 'settings', title: 'Ajustes', icon: 'sliders',
      status: function () {
        for (var i = 0; i < Cozy.palettes.length; i++) { if (Cozy.palettes[i].id === S.palette) { return 'Tema ' + Cozy.palettes[i].name; } }
        return 'Temas, fundo, brilho';
      },
      build: function (b) { body = b; paint(); },
      onOpen: function () { paint(); }
    });
  });
})(window, document);
