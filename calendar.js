/* ===== Cozy Display — calendário e contagens regressivas ===== */
(function (w, d) {
  'use strict';
  var Cozy = w.Cozy, h = Cozy.h, fmt = Cozy.fmt, L = w.COZY_LOCAL || {};

  var dates = Cozy.store.get('dates', null);
  if (!dates) {
    dates = [];
    var seed = L.dates || [], i;
    for (i = 0; i < seed.length; i++) {
      dates.push({ id: 'd' + i, name: seed[i].name, date: seed[i].date, yearly: !!seed[i].yearly });
    }
    Cozy.store.set('dates', dates);
  }

  var view = null;         // mês exibido: { y, m } com m de 0 a 11
  var monthBox, sideBox, formOpen = false, pageOpen = false;

  function saveDates() { Cozy.store.set('dates', dates); Cozy.glanceSoon(); }

  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }

  // próxima data de um item (anual: neste ano ou no próximo)
  function nextInfo(item, t) {
    var p = fmt.parseKey(item.date), dt, diff;
    if (!p) { return null; }
    if (item.yearly) {
      dt = new Date(t.getFullYear(), p.m - 1, p.d);
      diff = fmt.daysBetween(t, dt);
      if (diff < 0) { dt = new Date(t.getFullYear() + 1, p.m - 1, p.d); }
    } else {
      dt = new Date(p.y, p.m - 1, p.d);
    }
    return { date: dt, days: fmt.daysBetween(t, dt) };
  }

  function sorted() {
    var t = today(), list = [], i, inf;
    for (i = 0; i < dates.length; i++) {
      inf = nextInfo(dates[i], t);
      if (inf) { list.push({ item: dates[i], days: inf.days, date: inf.date }); }
    }
    list.sort(function (a, b) {
      var pa = a.days < 0 ? 1 : 0, pb = b.days < 0 ? 1 : 0;
      if (pa !== pb) { return pa - pb; }
      return pa ? b.days - a.days : a.days - b.days;
    });
    return list;
  }

  function when(days) {
    if (days === 0) { return 'é hoje!'; }
    if (days === 1) { return 'amanhã'; }
    if (days > 1) { return 'faltam ' + days + ' dias'; }
    return days === -1 ? 'foi ontem' : 'há ' + (-days) + ' dias';
  }

  function hasEvent(y, m, day) {
    var i, p;
    for (i = 0; i < dates.length; i++) {
      p = fmt.parseKey(dates[i].date);
      if (!p) { continue; }
      if (p.m === m + 1 && p.d === day && (dates[i].yearly || p.y === y)) { return true; }
    }
    return false;
  }

  /* ---------- Mês ---------- */
  function renderMonth() {
    monthBox.innerHTML = '';
    var t = today(), y = view.y, m = view.m;
    var first = new Date(y, m, 1).getDay();
    var count = new Date(y, m + 1, 0).getDate();
    var i, cells = h('div', { class: 'cal-grid' });

    var head = h('div', { class: 'cal-nav' }, [
      h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Mês anterior', onclick: function () { shift(-1); } }, [Cozy.icon('back')]),
      h('button', { type: 'button', class: 'cal-ttl', text: fmt.cap(fmt.MESES[m]) + ' ' + y, onclick: function () { view = { y: t.getFullYear(), m: t.getMonth() }; renderMonth(); } }),
      h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Próximo mês', onclick: function () { shift(1); } }, [Cozy.icon('next')])
    ]);
    monthBox.appendChild(head);

    var wk = h('div', { class: 'cal-grid cal-wk' });
    var ini = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    for (i = 0; i < 7; i++) { wk.appendChild(h('span', { text: ini[i] })); }
    monthBox.appendChild(wk);

    for (i = 0; i < first; i++) { cells.appendChild(h('span', { class: 'cal-d empty' })); }
    for (i = 1; i <= count; i++) {
      var isToday = (y === t.getFullYear() && m === t.getMonth() && i === t.getDate());
      cells.appendChild(h('span', { class: 'cal-d' + (isToday ? ' today' : '') }, [
        h('b', { text: String(i) }),
        hasEvent(y, m, i) ? h('i') : null
      ]));
    }
    monthBox.appendChild(cells);
  }

  function shift(dir) {
    var m = view.m + dir, y = view.y;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    view = { y: y, m: m };
    renderMonth();
  }

  /* ---------- Lateral: hoje + datas especiais ---------- */
  function renderSide() {
    sideBox.innerHTML = '';
    var n = new Date(), list = sorted(), i;

    sideBox.appendChild(h('div', { class: 'cal-today' }, [
      h('div', { class: 'cal-wd', text: fmt.cap(fmt.DIAS[n.getDay()]) }),
      h('div', { class: 'cal-full', text: n.getDate() + ' de ' + fmt.MESES[n.getMonth()] + ' de ' + n.getFullYear() })
    ]));

    sideBox.appendChild(h('div', { class: 'cal-sec' }, [
      h('span', { text: 'Datas especiais' }),
      h('button', { type: 'button', class: 'cz-ib small', 'aria-label': 'Adicionar data', onclick: function () { formOpen = !formOpen; renderSide(); } }, [Cozy.icon(formOpen ? 'close' : 'plus')])
    ]));

    if (formOpen) { sideBox.appendChild(buildForm()); }

    var listEl = h('div', { class: 'cal-list' });
    if (!list.length) { listEl.appendChild(h('p', { class: 'cz-empty', text: 'Nenhuma data ainda. Toque em + para criar uma contagem regressiva.' })); }
    function row(e) {
      var p = fmt.parseKey(e.item.date);
      var shown = fmt.pad(p.d) + '/' + fmt.pad(p.m) + (e.item.yearly ? ' · todo ano' : '/' + p.y);
      return h('div', { class: 'cal-ev' + (e.days < 0 ? ' past' : '') }, [
        h('div', { class: 'cal-ev-l' }, [h('span', { class: 'cal-ev-n', text: e.item.name }), h('span', { class: 'cal-ev-s', text: when(e.days) + ' · ' + shown })]),
        h('span', { class: 'cal-ev-d', text: e.days >= 0 ? String(e.days) : '–' }),
        h('button', { type: 'button', class: 'cz-ib small', 'aria-label': 'Remover ' + e.item.name, onclick: function () { remove(e.item.id); } }, [Cozy.icon('trash')])
      ]);
    }
    for (i = 0; i < list.length; i++) { listEl.appendChild(row(list[i])); }
    sideBox.appendChild(listEl);
  }

  function remove(id) {
    var i;
    for (i = 0; i < dates.length; i++) { if (dates[i].id === id) { dates.splice(i, 1); break; } }
    saveDates(); renderSide(); renderMonth();
  }

  function buildForm() {
    var name = h('input', { type: 'text', class: 'cz-input', placeholder: 'Nome (ex.: Viagem)', maxlength: '24' });
    var t = today();
    var when_ = h('input', { type: 'date', class: 'cz-input', value: fmt.key(t) });
    var yearly = Cozy.ui.sw(false);
    function save() {
      var nm = name.value.replace(/^\s+|\s+$/g, ''), dv = when_.value;
      if (!nm) { Cozy.toast('Dê um nome à data.'); return; }
      if (!fmt.parseKey(dv)) { Cozy.toast('Use uma data válida (AAAA-MM-DD).'); return; }
      dates.push({ id: 'd' + Date.now(), name: nm, date: dv, yearly: yearly.get() });
      formOpen = false;
      saveDates(); renderSide(); renderMonth();
    }
    return h('div', { class: 'cal-form' }, [
      name,
      h('div', { class: 'cal-form-r' }, [when_, h('label', { class: 'cal-yr' }, [h('span', { text: 'Todo ano' }), yearly.el])]),
      h('button', { type: 'button', class: 'cz-btn solid', text: 'Salvar data', onclick: save })
    ]);
  }

  /* ---------- Registro ---------- */
  Cozy.on('boot', function () {
    var t = today();
    view = { y: t.getFullYear(), m: t.getMonth() };

    Cozy.registerPage({
      id: 'calendar', title: 'Calendário', icon: 'calendar', widget: 'calendar',
      status: function () {
        var l = sorted(), i;
        for (i = 0; i < l.length; i++) {
          if (l[i].days >= 0) { return l[i].item.name + (l[i].days === 0 ? ' é hoje' : ' em ' + l[i].days + 'd'); }
        }
        return fmt.cap(fmt.MESES[new Date().getMonth()]);
      },
      build: function (body) {
        monthBox = h('div', { class: 'cal-month' });
        sideBox = h('div', { class: 'cal-side' });
        body.appendChild(h('div', { class: 'cal-wrap' }, [monthBox, sideBox]));
        renderMonth(); renderSide();
      },
      onOpen: function () { pageOpen = true; var n = today(); view = { y: n.getFullYear(), m: n.getMonth() }; formOpen = false; renderMonth(); renderSide(); },
      onClose: function () { pageOpen = false; }
    });

    Cozy.registerChip({
      id: 'dates', order: 30, widget: 'calendar', page: 'calendar',
      render: function () {
        var l = sorted(), i, e, nm;
        for (i = 0; i < l.length; i++) {
          e = l[i];
          if (e.days >= 0) {
            nm = e.item.name.length > 12 ? e.item.name.slice(0, 11) + '…' : e.item.name;
            return { icon: 'calendar', text: nm + ' · ' + (e.days === 0 ? 'hoje' : e.days + 'd') };
          }
        }
        return null;
      }
    });

    Cozy.on('minute', function () { Cozy.glanceSoon(); if (pageOpen) { renderSide(); } });
  });
})(window, document);
