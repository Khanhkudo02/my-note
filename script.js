const KEY = 'sotay-monhoc-v1';
const COLORS = ['yellow', 'green', 'pink', 'blue'];
const MAX_INDENT = 4;
const uid = () => Math.random().toString(36).slice(2, 9);

let state = load();
let query = '';
let focusId = null;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.subjects)) return s;
  } catch (e) {}
  return { active: null, subjects: [] };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
const current = () => state.subjects.find(s => s.id === state.active);

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') e.className = props[k];
    else if (k === 'text') e.textContent = props[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), props[k]);
    else e.setAttribute(k, props[k]);
  }
  kids.flat().forEach(c => c && e.append(c));
  return e;
}

/* ---------- Môn học (sidebar) ---------- */
function renderSidebar() {
  const list = document.getElementById('subjectList');
  list.replaceChildren();
  if (!state.subjects.length) {
    list.append(h('div', { class: 'empty', text: 'Chưa có môn học nào. Bấm “Thêm môn học” để bắt đầu.' }));
    return;
  }
  state.subjects.forEach(s => {
    list.append(h('div', {
      class: 'subject' + (s.id === state.active ? ' active' : ''),
      onclick: () => { state.active = s.id; query = ''; document.getElementById('search').value = ''; save(); render(); closeMenu(); }
    },
      h('span', { class: 'name', text: s.name }),
      h('button', { class: 'mini', title: 'Sửa tên', 'aria-label': 'Sửa tên môn', text: '✎', onclick: e => { e.stopPropagation(); renameSubject(s); } }),
      h('button', { class: 'mini', title: 'Xoá môn', 'aria-label': 'Xoá môn', text: '🗑', onclick: e => { e.stopPropagation(); deleteSubject(s); } })
    ));
  });
}
function addSubject() {
  const name = (prompt('Tên môn học:') || '').trim();
  if (!name) return;
  const s = { id: uid(), name, topics: [] };
  state.subjects.push(s);
  state.active = s.id;
  save(); render(); closeMenu();
}
function renameSubject(s) {
  const name = (prompt('Sửa tên môn học:', s.name) || '').trim();
  if (!name) return;
  s.name = name; save(); render();
}
function deleteSubject(s) {
  if (!confirm(`Xoá môn “${s.name}” cùng toàn bộ chủ đề và nội dung?`)) return;
  state.subjects = state.subjects.filter(x => x.id !== s.id);
  if (state.active === s.id) state.active = state.subjects[0]?.id ?? null;
  save(); render();
}

/* ---------- Chủ đề ---------- */
function addTopic() {
  const s = current(); if (!s) return;
  const title = (prompt('Tên chủ đề:') || '').trim();
  if (!title) return;
  const line = { id: uid(), text: '', indent: 0, done: false };
  s.topics.push({ id: uid(), title, color: 'yellow', open: true, lines: [line] });
  focusId = line.id;
  save(); render();
}
function matches(t) {
  if (!query) return true;
  const q = query.toLowerCase();
  return t.title.toLowerCase().includes(q) || t.lines.some(l => l.text.toLowerCase().includes(q));
}
function renderTopics() {
  const box = document.getElementById('topics');
  box.replaceChildren();
  const s = current();
  if (!s) {
    box.append(h('div', { class: 'welcome' }, h('h2', { text: 'Chào mừng bạn' }), h('p', { text: 'Tạo môn học đầu tiên ở thanh bên trái.' })));
    return;
  }
  if (!s.topics.length) {
    box.append(h('div', { class: 'welcome' }, h('h2', { text: 'Môn này chưa có chủ đề' }), h('p', { text: 'Bấm “Thêm chủ đề” ở phía trên để bắt đầu ghi chép.' })));
    return;
  }
  const shown = s.topics.filter(matches);
  if (!shown.length) box.append(h('div', { class: 'welcome', text: 'Không tìm thấy kết quả phù hợp.' }));
  shown.forEach(t => box.append(topicEl(s, t)));
}
function topicEl(s, t) {
  const open = t.open || !!query;
  const el = h('article', { class: 'topic', 'data-color': t.color },
    h('div', { class: 'topic-head' },
      h('button', { class: 'fold' + (open ? '' : ' closed'), 'aria-label': 'Thu gọn / mở rộng', text: '▾', onclick: () => { t.open = !t.open; save(); render(); } }),
      h('h2', { class: 'topic-title' }, h('span', { text: t.title })),
      h('div', { class: 'tools' },
        h('button', { class: 'dot', title: 'Đổi màu highlight', 'aria-label': 'Đổi màu highlight', onclick: () => { t.color = COLORS[(COLORS.indexOf(t.color) + 1) % COLORS.length]; save(); render(); } }),
        h('button', { class: 'btn', text: 'Sửa', onclick: () => { const v = (prompt('Sửa tên chủ đề:', t.title) || '').trim(); if (v) { t.title = v; save(); render(); } } }),
        h('button', { class: 'btn danger', text: 'Xoá', onclick: () => { if (confirm(`Xoá chủ đề “${t.title}”?`)) { s.topics = s.topics.filter(x => x !== t); save(); render(); } } })
      )
    )
  );
  if (open) {
    const lines = h('div', { class: 'lines' }, t.lines.map(l => lineEl(t, l)));
    el.append(lines,
      h('button', { class: 'add-line', text: '+ Thêm dòng', onclick: () => addLine(t, t.lines.length - 1) }),
      h('div', { class: 'hint', text: 'Enter: dòng mới · Tab / Shift+Tab: thụt vào / lùi ra · Backspace ở dòng trống: xoá dòng' })
    );
  }
  return el;
}

/* ---------- Dòng nội dung ---------- */
function lineEl(t, l) {
  const text = h('div', { class: 'text', contenteditable: 'true', spellcheck: 'false', 'data-id': l.id, role: 'textbox', 'aria-label': 'Nội dung' });
  text.textContent = l.text;
  text.addEventListener('input', () => { l.text = text.textContent; save(); });
  text.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\n/g, ' ')); });
  text.addEventListener('keydown', e => {
    const i = t.lines.indexOf(l);
    if (e.key === 'Tab') { e.preventDefault(); setIndent(t, l, l.indent + (e.shiftKey ? -1 : 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); addLine(t, i, l.indent); }
    else if (e.key === 'Backspace' && !l.text && t.lines.length > 1) {
      e.preventDefault();
      t.lines.splice(i, 1);
      focusId = t.lines[Math.max(0, i - 1)].id;
      save(); render();
    }
  });
  return h('div', { class: 'line' + (l.done ? ' done' : ''), 'data-i': l.indent, style: `--i:${l.indent}` },
    h('input', { type: 'checkbox', class: 'chk', 'aria-label': 'Đánh dấu đã học', ...(l.done ? { checked: '' } : {}), onchange: e => { l.done = e.target.checked; save(); render(); } }),
    text,
    h('div', { class: 'acts' },
      h('button', { title: 'Lùi ra (Shift+Tab)', 'aria-label': 'Lùi ra', text: '⇤', onclick: () => setIndent(t, l, l.indent - 1) }),
      h('button', { title: 'Thụt vào (Tab)', 'aria-label': 'Thụt vào', text: '⇥', onclick: () => setIndent(t, l, l.indent + 1) }),
      h('button', { class: 'del', title: 'Xoá dòng', 'aria-label': 'Xoá dòng', text: '✕', onclick: () => deleteLine(t, l) })
    )
  );
}
function setIndent(t, l, n) {
  l.indent = Math.max(0, Math.min(MAX_INDENT, n));
  focusId = l.id; save(); render();
}
function addLine(t, after, indent = 0) {
  const l = { id: uid(), text: '', indent, done: false };
  t.lines.splice(after + 1, 0, l);
  focusId = l.id; save(); render();
}
function deleteLine(t, l) {
  t.lines = t.lines.filter(x => x !== l);
  if (!t.lines.length) t.lines.push({ id: uid(), text: '', indent: 0, done: false });
  save(); render();
}

/* ---------- Khung chính ---------- */
function render() {
  renderSidebar();
  const s = current();
  document.getElementById('subjectTitle').textContent = s ? s.name : 'Sổ tay môn học';
  document.getElementById('topActions').style.display = s ? '' : 'none';
  renderTopics();
  if (focusId) {
    const el = document.querySelector(`[data-id="${focusId}"]`);
    if (el) {
      el.focus();
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    focusId = null;
  }
}
const closeMenu = () => document.getElementById('sidebar').classList.remove('open');

/* ---------- Sự kiện chung ---------- */
document.getElementById('addSubject').onclick = addSubject;
document.getElementById('addTopic').onclick = addTopic;
document.getElementById('editSubject').onclick = () => current() && renameSubject(current());
document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
document.getElementById('search').addEventListener('input', e => { query = e.target.value.trim(); renderTopics(); });

document.getElementById('exportBtn').onclick = () => {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })), download: 'so-tay-mon-hoc.json' });
  a.click(); URL.revokeObjectURL(a.href);
};
document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(txt => {
    const data = JSON.parse(txt);
    if (!Array.isArray(data.subjects)) throw 0;
    if (confirm('Nhập file sẽ thay thế dữ liệu hiện tại. Tiếp tục?')) { state = data; save(); render(); }
  }).catch(() => alert('File không hợp lệ.'));
  e.target.value = '';
};

if (!current() && state.subjects.length) state.active = state.subjects[0].id;
render();