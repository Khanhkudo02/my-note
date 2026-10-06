const KEY = 'sotay-monhoc-v1';
const COLORS = ['purple', 'blue', 'green', 'yellow', 'pink'];
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
async function deleteSubject(s) {
  if (!await ask(`Xoá môn “${s.name}” cùng toàn bộ chủ đề và nội dung?`)) return;
  state.subjects = state.subjects.filter(x => x.id !== s.id);
  if (state.active === s.id) state.active = state.subjects[0]?.id ?? null;
  save(); render();
}

/* ---------- Hộp xác nhận ---------- */
function ask(msg, okText = 'Xoá') {
  return new Promise(res => {
    const d = document.getElementById('confirm');
    d.querySelector('p').textContent = msg;
    d.querySelector('.ok').textContent = okText;
    d.returnValue = '';
    d.onclose = () => res(d.returnValue === 'ok');
    d.showModal();
  });
}

/* ---------- Chủ đề ---------- */
function addTopic() {
  const s = current(); if (!s) return;
  const title = (prompt('Tên chủ đề:') || '').trim();
  if (!title) return;
  const line = { id: uid(), text: '', indent: 0, done: false };
  s.topics.push({ id: uid(), title, tag: '', color: 'purple', open: true, lines: [line] });
  focusId = line.id;
  save(); render();
}
function matches(t) {
  if (!query) return true;
  const q = query.toLowerCase();
  return t.title.toLowerCase().includes(q) || (t.tag || '').toLowerCase().includes(q) || t.lines.some(l => l.text.toLowerCase().includes(q));
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
  shown.forEach(t => box.append(topicEl(s, t, s.topics.indexOf(t))));
}
function topicEl(s, t, idx) {
  const open = t.open || !!query;
  const toggle = () => { t.open = !t.open; save(); render(); };
  const head = h('div', {
    class: 'topic-head', role: 'button', tabindex: '0', 'aria-expanded': String(open), onclick: toggle,
    onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }
  },
    h('span', { class: 'num', text: String(idx + 1) }),
    h('h2', { class: 'topic-title', text: t.title }),
    t.tag ? h('span', { class: 'tag', text: t.tag }) : null,
    h('span', { class: 'arrow' + (open ? '' : ' closed'), text: '▲', 'aria-hidden': 'true' })
  );
  const el = h('article', { class: 'topic' + (open ? '' : ' collapsed'), 'data-color': t.color }, head);
  if (!open) return el;

  const body = h('div', { class: 'topic-body' },
    h('div', { class: 'tools' },
      h('button', { class: 'dot', title: 'Đổi màu chủ đề', 'aria-label': 'Đổi màu chủ đề', onclick: () => { t.color = COLORS[(COLORS.indexOf(t.color) + 1) % COLORS.length]; save(); render(); } }),
      h('button', { class: 'btn', text: 'Thẻ', onclick: () => { const v = prompt('Thẻ cho chủ đề (để trống để bỏ thẻ):', t.tag || ''); if (v !== null) { t.tag = v.trim(); save(); render(); } } }),
      h('button', { class: 'btn', text: 'Sửa tên', onclick: () => { const v = (prompt('Sửa tên chủ đề:', t.title) || '').trim(); if (v) { t.title = v; save(); render(); } } }),
      h('button', { class: 'btn danger', text: 'Xoá chủ đề', onclick: async () => { if (await ask(`Xoá chủ đề “${t.title}” cùng toàn bộ nội dung?`)) { s.topics = s.topics.filter(x => x !== t); save(); render(); } } })
    )
  );
  const lines = h('div', { class: 'lines' });
  let grp = null;
  t.lines.forEach(l => {
    if (l.head) { grp = null; lines.append(lineEl(t, l)); }
    else { if (!grp) { grp = h('div', { class: 'group' }); lines.append(grp); } grp.append(lineEl(t, l)); }
  });
  body.append(lines,
    h('div', { class: 'adds' },
      h('button', { class: 'add-line', text: '+ Thêm dòng', onclick: () => addLine(t, t.lines.length - 1) }),
      h('button', { class: 'add-line', text: '+ Thêm tiêu đề mục', onclick: () => addLine(t, t.lines.length - 1, 0, true) })
    ),
    h('div', { class: 'hint', text: 'Enter: dòng mới · Tab / Shift+Tab: thụt vào / lùi ra · Ctrl+B: in đậm · Nút H: đổi dòng thành tiêu đề mục' })
  );
  el.append(body);
  return el;
}

/* ---------- Dòng nội dung ---------- */
const clean = el => el.innerHTML.replace(/<(\/?)strong>/gi, '<$1b>').replace(/<(?!\/?b>)[^>]*>/gi, '').replace(/&nbsp;/g, ' ');
function lineEl(t, l) {
  const text = h('div', { class: 'text', contenteditable: 'true', spellcheck: 'false', 'data-id': l.id, role: 'textbox', 'aria-label': l.head ? 'Tiêu đề mục' : 'Nội dung' });
  if (l.html) text.innerHTML = l.html; else text.textContent = l.text;
  text.addEventListener('input', () => { l.html = clean(text); l.text = text.textContent; save(); });
  text.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\n/g, ' ')); });
  text.addEventListener('keydown', e => {
    const i = t.lines.indexOf(l);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); document.execCommand('bold'); }
    else if (e.key === 'Tab') { e.preventDefault(); setIndent(t, l, l.indent + (e.shiftKey ? -1 : 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); addLine(t, i, l.head ? 0 : l.indent); }
    else if (e.key === 'Backspace' && !text.textContent && t.lines.length > 1) {
      e.preventDefault();
      t.lines.splice(i, 1);
      focusId = t.lines[Math.max(0, i - 1)].id;
      save(); render();
    }
  });
  const act = (title, label, fn, cls = '') => h('button', { class: cls, title, 'aria-label': title, text: label, onmousedown: e => e.preventDefault(), onclick: fn });
  return h('div', { class: 'line ' + (l.head ? 'head' : 'item') + (l.done ? ' done' : ''), style: `--i:${l.indent}` },
    l.head ? null : h('input', { type: 'checkbox', class: 'chk', 'aria-label': 'Đánh dấu đã học', ...(l.done ? { checked: '' } : {}), onchange: e => { l.done = e.target.checked; save(); render(); } }),
    text,
    h('div', { class: 'acts' },
      act('Đổi giữa tiêu đề mục và dòng thường', 'H', () => { l.head = !l.head; if (l.head) l.indent = 0; focusId = l.id; save(); render(); }),
      act('In đậm phần đang chọn (Ctrl+B)', 'B', () => { text.focus(); document.execCommand('bold'); }, 'bold'),
      act('Lùi ra (Shift+Tab)', '⇤', () => setIndent(t, l, l.indent - 1)),
      act('Thụt vào (Tab)', '⇥', () => setIndent(t, l, l.indent + 1)),
      act('Xoá dòng', '✕', () => deleteLine(t, l), 'del')
    )
  );
}
function setIndent(t, l, n) {
  if (l.head) return;
  l.indent = Math.max(0, Math.min(MAX_INDENT, n));
  focusId = l.id; save(); render();
}
function addLine(t, after, indent = 0, head = false) {
  const l = { id: uid(), text: '', indent, done: false, head };
  t.lines.splice(after + 1, 0, l);
  focusId = l.id; save(); render();
}
async function deleteLine(t, l) {
  if (l.text.trim()) {
    const p = l.text.trim();
    if (!await ask(`Xoá dòng này?\n“${p.length > 70 ? p.slice(0, 70) + '…' : p}”`)) return;
  }
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
  const anyOpen = !!s && s.topics.some(t => t.open);
  document.getElementById('foldAll').textContent = anyOpen ? 'Thu gọn tất cả' : 'Mở tất cả';
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
document.getElementById('foldAll').onclick = () => {
  const s = current(); if (!s) return;
  const anyOpen = s.topics.some(t => t.open);
  s.topics.forEach(t => t.open = !anyOpen);
  save(); render();
};
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