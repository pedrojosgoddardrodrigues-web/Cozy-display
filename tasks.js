/* ===== Cozy Display — tarefas e anotações ===== */
(function (w, d) {
  'use strict';
  var Cozy = w.Cozy, h = Cozy.h;

  /* ================= Tarefas ================= */
  var tasks = Cozy.store.get('tasks', []);
  var tList, tProg, tInput, tPageOpen = false;
  function saveTasks() { Cozy.store.set('tasks', tasks); Cozy.glanceSoon(); }

  function counts() {
    var done = 0, i;
    for (i = 0; i < tasks.length; i++) { if (tasks[i].done) { done++; } }
    return { done: done, total: tasks.length };
  }

  function addTask() {
    var v = tInput.value.replace(/^\s+|\s+$/g, '');
    if (!v) { return; }
    tasks.push({ id: 't' + Date.now() + Math.floor(Math.random() * 1000), text: v.slice(0, 80), done: false });
    tInput.value = '';
    saveTasks(); paintTasks();
    tInput.focus();
  }

  function toggleTask(id) {
    var i;
    for (i = 0; i < tasks.length; i++) { if (tasks[i].id === id) { tasks[i].done = !tasks[i].done; break; } }
    saveTasks(); paintTasks();
  }

  function delTask(id) {
    var i;
    for (i = 0; i < tasks.length; i++) { if (tasks[i].id === id) { tasks.splice(i, 1); break; } }
    saveTasks(); paintTasks();
  }

  function clearDone() {
    var keep = [], i;
    for (i = 0; i < tasks.length; i++) { if (!tasks[i].done) { keep.push(tasks[i]); } }
    tasks = keep; saveTasks(); paintTasks();
  }

  function paintTasks() {
    if (!tList) { return; }
    var c = counts(), i, t, pct = c.total ? Math.round(c.done / c.total * 100) : 0;
    tProg.innerHTML = '';
    tProg.appendChild(h('div', { class: 'tk-prog-t' }, [
      h('span', { text: c.total ? c.done + ' de ' + c.total + ' concluídas' : 'Sem tarefas' }),
      h('b', { text: c.total ? pct + '%' : '' })
    ]));
    var bar = h('div', { class: 'tk-bar' }, [h('i')]);
    bar.firstChild.style.width = pct + '%';
    tProg.appendChild(bar);
    if (c.done > 0) { tProg.appendChild(h('button', { type: 'button', class: 'cz-link', text: 'Limpar concluídas', onclick: clearDone })); }

    tList.innerHTML = '';
    if (!tasks.length) { tList.appendChild(h('p', { class: 'cz-empty', text: 'Nada por aqui. Escreva uma tarefa acima e toque em +.' })); }
    function row(task) {
      return h('div', { class: 'tk-row' + (task.done ? ' done' : '') }, [
        h('button', { type: 'button', class: 'tk-check', 'aria-label': task.done ? 'Desmarcar' : 'Concluir', onclick: function () { toggleTask(task.id); } }, [Cozy.icon('check')]),
        h('span', { class: 'tk-text', text: task.text, onclick: function () { toggleTask(task.id); } }),
        h('button', { type: 'button', class: 'cz-ib small', 'aria-label': 'Apagar', onclick: function () { delTask(task.id); } }, [Cozy.icon('trash')])
      ]);
    }
    // pendentes primeiro, depois concluídas
    for (i = 0; i < tasks.length; i++) { t = tasks[i]; if (!t.done) { tList.appendChild(row(t)); } }
    for (i = 0; i < tasks.length; i++) { t = tasks[i]; if (t.done) { tList.appendChild(row(t)); } }
  }

  /* ================= Anotações ================= */
  var notes = Cozy.store.get('notes', []);
  var nCur = null, nList, nEdit, nArea, nPageOpen = false, nSaveTimer = 0;
  function saveNotes() { Cozy.store.set('notes', notes); Cozy.glanceSoon(); }

  function findNote(id) { var i; for (i = 0; i < notes.length; i++) { if (notes[i].id === id) { return notes[i]; } } return null; }

  function titleOf(n) {
    var line = (n.text || '').split('\n')[0].replace(/^\s+|\s+$/g, '');
    return line ? line.slice(0, 40) : 'Nota sem texto';
  }

  function newNote() {
    var n = { id: 'n' + Date.now(), text: '', t: Date.now() };
    notes.unshift(n);
    saveNotes();
    openNote(n.id);
  }

  function flushNote() {
    clearTimeout(nSaveTimer); nSaveTimer = 0;
    var n = nCur ? findNote(nCur) : null;
    if (n && nArea) { if (n.text !== nArea.value) { n.text = nArea.value; n.t = Date.now(); } saveNotes(); }
  }

  function openNote(id) {
    var n = findNote(id);
    if (!n) { return; }
    nCur = id;
    paintNotes();
    nArea.value = n.text;
    setTimeout(function () { if (!n.text) { nArea.focus(); } }, 50);
  }

  function closeNote() {
    flushNote();
    // nota vazia não precisa ficar guardada
    var n = nCur ? findNote(nCur) : null, i;
    if (n && !n.text.replace(/\s/g, '')) { for (i = 0; i < notes.length; i++) { if (notes[i].id === nCur) { notes.splice(i, 1); break; } } saveNotes(); }
    nCur = null;
    paintNotes();
  }

  function delNote() {
    var i;
    for (i = 0; i < notes.length; i++) { if (notes[i].id === nCur) { notes.splice(i, 1); break; } }
    nCur = null; saveNotes(); paintNotes();
  }

  function paintNotes() {
    if (!nList) { return; }
    var editing = nCur !== null, i;
    nEdit.style.display = editing ? '' : 'none';
    nList.style.display = editing ? 'none' : '';
    if (editing) { return; }
    nList.innerHTML = '';
    nList.appendChild(h('button', { type: 'button', class: 'nt-new', onclick: newNote }, [Cozy.icon('plus'), h('span', { text: 'Nova nota' })]));
    function card(n) {
      var rest = (n.text || '').split('\n').slice(1).join(' ').replace(/^\s+|\s+$/g, '');
      var dt = new Date(n.t);
      return h('button', { type: 'button', class: 'nt-card', onclick: function () { openNote(n.id); } }, [
        h('b', { text: titleOf(n) }),
        h('span', { text: rest.slice(0, 70) }),
        h('em', { text: Cozy.fmt.pad(dt.getDate()) + '/' + Cozy.fmt.pad(dt.getMonth() + 1) + ' ' + Cozy.fmt.pad(dt.getHours()) + ':' + Cozy.fmt.pad(dt.getMinutes()) })
      ]);
    }
    for (i = 0; i < notes.length; i++) { nList.appendChild(card(notes[i])); }
    if (!notes.length) { nList.appendChild(h('p', { class: 'cz-empty', text: 'Nenhuma nota ainda.' })); }
  }

  /* ================= Registro ================= */
  Cozy.on('boot', function () {
    Cozy.registerPage({
      id: 'tasks', title: 'Tarefas', icon: 'tasks', widget: 'tasks',
      status: function () { var c = counts(); return c.total ? c.done + '/' + c.total + ' concluídas' : 'Lista vazia'; },
      build: function (body) {
        tInput = h('input', { type: 'text', class: 'cz-input', placeholder: 'Nova tarefa…', maxlength: '80', enterkeyhint: 'done' });
        tInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { addTask(); } });
        tProg = h('div', { class: 'tk-prog' });
        tList = h('div', { class: 'tk-list' });
        body.appendChild(h('div', { class: 'tk-wrap' }, [
          h('div', { class: 'tk-top' }, [
            h('div', { class: 'tk-add' }, [tInput, h('button', { type: 'button', class: 'cz-btn solid round', 'aria-label': 'Adicionar tarefa', onclick: addTask }, [Cozy.icon('plus')])]),
            tProg
          ]),
          tList
        ]));
        paintTasks();
      },
      onOpen: function () { tPageOpen = true; paintTasks(); },
      onClose: function () { tPageOpen = false; }
    });

    Cozy.registerPage({
      id: 'notes', title: 'Notas', icon: 'note', widget: 'notes',
      status: function () { return notes.length ? notes.length + (notes.length === 1 ? ' nota' : ' notas') : 'Sem notas'; },
      build: function (body) {
        nList = h('div', { class: 'nt-list' });
        nArea = h('textarea', { class: 'nt-area', placeholder: 'Escreva aqui…', maxlength: '2000' });
        nArea.addEventListener('input', function () { clearTimeout(nSaveTimer); nSaveTimer = setTimeout(flushNote, 600); });
        nEdit = h('div', { class: 'nt-edit' }, [
          h('div', { class: 'nt-bar' }, [
            h('button', { type: 'button', class: 'cz-btn', onclick: closeNote }, [Cozy.icon('back'), h('span', { text: 'Notas' })]),
            h('button', { type: 'button', class: 'cz-ib', 'aria-label': 'Apagar nota', onclick: delNote }, [Cozy.icon('trash')])
          ]),
          nArea
        ]);
        body.appendChild(nList); body.appendChild(nEdit);
        paintNotes();
      },
      onOpen: function () { nPageOpen = true; paintNotes(); },
      onClose: function () { nPageOpen = false; if (nCur) { closeNote(); } }
    });

    Cozy.registerChip({
      id: 'tasks', order: 40, widget: 'tasks', page: 'tasks',
      render: function () {
        var c = counts();
        if (!c.total) { return null; }
        return { icon: 'tasks', text: c.done + '/' + c.total, cls: c.done === c.total ? 'accent' : '' };
      }
    });

    w.addEventListener('pagehide', flushNote);
    d.addEventListener('visibilitychange', function () { if (d.hidden) { flushNote(); } });
  });
})(window, document);
