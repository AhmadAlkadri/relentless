import { marked } from '/vendor/marked.js';
import DOMPurify from '/vendor/purify.js';

const $ = id => document.getElementById(id);
const fragment = new URLSearchParams(location.hash.slice(1));
let capability = fragment.get('token') || sessionStorage.getItem('relentless-capability');
if (fragment.has('token')) {
  sessionStorage.setItem('relentless-capability', capability);
  fragment.delete('token');
  history.replaceState(null, '', `${location.pathname}${location.search}${fragment.size ? `#${fragment}` : ''}`);
}
let selected = fragment.get('session') || localStorage.getItem('relentless-last-session') || null;
let tuneOnOpen = fragment.get('tune') === '1';
let state = null, current = null, busy = false, polling = false;
let navigationSignature = '', conversationSignature = '', streamSignature = '', pendingSignature = '', tuneSignature = '', suggestionsSignature = '';
let noticeTimer, awaitingPrint = false;
const buffers = new Map();
const sectionLabels = { brief: 'Working brief', decisions: 'Accepted decisions', facts: 'Verified facts', assumptions: 'Assumptions', questions: 'Current questions', scratchpad: 'Private scratchpad' };
const defaults = { theme: 'system', size: 18, width: 760, focus: false };
let display = { ...defaults, ...readLocal('relentless-display', {}) };

function readLocal(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { notice('Browser recovery storage is full or unavailable. Save your text to Markdown.', true); } }
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'value') node.value = value;
    else if (typeof value === 'boolean') node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
function button(text, onClick, attrs = {}) { return el('button', { type: 'button', text, onClick: () => run(onClick), ...attrs }); }
async function run(fn) { try { return await fn(); } catch (error) { notice(error.message || String(error), true); } }
function notice(message, error = false) {
  clearTimeout(noticeTimer);
  $('notice').replaceChildren(el('span', { text: message }), button('×', () => { $('notice').hidden = true; }, { class: 'icon-button', 'aria-label': 'Dismiss notice' }));
  $('notice').classList.toggle('error', error); $('notice').hidden = false;
  if (!error) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 8000);
}
async function api(route, body) {
  const response = await fetch(`/api/${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${capability || ''}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || `Request failed (${response.status}).`); error.status = response.status; throw error; }
  return data;
}
function sessionApi(operation = '', body) { if (!selected) throw new Error('Choose a session first.'); return api(`sessions/${selected}${operation ? `/${operation}` : ''}`, body); }
function cleanMarkdown(text) {
  const publicText = String(text || '').replace(/```relentless-(?:state|tune|accepted|question)\s*\n[\s\S]*?\n```/g, '').replace(/```relentless-(?:state|tune|accepted|question)[\s\S]*$/, '');
  const html = DOMPurify.sanitize(marked.parse(publicText, { breaks: false }), { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'], ALLOWED_ATTR: ['href', 'title', 'start'], ALLOW_DATA_ATTR: false });
  const template = document.createElement('template'); template.innerHTML = html;
  for (const a of template.content.querySelectorAll('a')) {
    const href = a.getAttribute('href') || '';
    if (!/^(https?:|mailto:|#)/i.test(href)) a.removeAttribute('href');
    a.target = '_blank'; a.rel = 'noopener noreferrer';
  }
  return template.content;
}
function selectionInside(node) { const selection = getSelection(); return selection && !selection.isCollapsed && (node.contains(selection.anchorNode) || node.contains(selection.focusNode)); }
function renderMarkdown(node, text) { if (selectionInside(node)) return false; node.replaceChildren(cleanMarkdown(text)); return true; }
function applyDisplay() {
  const dark = display.theme === 'dark' || (display.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  // Preferences are finite numeric values, never CSS supplied by imported content.
  document.documentElement.style.setProperty('--reading-size', `${Math.min(25, Math.max(15, Number(display.size) || 18))}px`);
  document.documentElement.style.setProperty('--reading-width', `${Math.min(1000, Math.max(560, Number(display.width) || 760))}px`);
  document.body.classList.toggle('focus-mode', Boolean(display.focus)); $('focus-button').setAttribute('aria-pressed', String(Boolean(display.focus)));
  writeLocal('relentless-display', display);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDisplay);
applyDisplay();

function openModal(title, content) {
  $('modal-title').textContent = title; $('modal-content').replaceChildren(content);
  if (!$('modal').open) $('modal').showModal();
}
function closeModal() { $('modal').close(); }
$('modal-close').addEventListener('click', closeModal);
$('modal').addEventListener('click', event => { if (event.target === $('modal')) { const r = $('modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
async function copy(text) { try { await navigator.clipboard.writeText(text); notice('Copied.'); } catch { throw new Error('Clipboard access is unavailable. Select and copy the text from the dialog.'); } }
function showText(title, text, filename = 'relentless-context.md', description = '') {
  const area = el('textarea', { class: 'export-text', value: text, readOnly: true, 'aria-label': title, spellcheck: false });
  openModal(title, el('div', {}, description ? el('p', { class: 'modal-help', text: description }) : null, area, el('div', { class: 'modal-actions' }, button('Copy', () => copy(text), { class: 'primary' }), button('Save .md…', () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })); const link = el('a', { href: url, download: filename }); link.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
  }))));
}
function formField(label, input, help = '') { return el('label', { class: 'form-field' }, el('span', { text: label }), input, help ? el('small', { text: help }) : null); }
function backendSelect(value = 'codex') {
  const select = el('select', { name: 'backend', 'aria-label': 'Backend' }, el('option', { value: 'codex', text: 'Codex · installed authentication' }), el('option', { value: 'claude', text: 'Claude · installed authentication' }));
  if (state?.testMode) select.append(el('option', { value: 'mock', text: 'Synthetic test backend' }));
  select.value = value; return select;
}
function newSession(item = null) {
  const title = el('input', { name: 'title', value: item?.title || '', placeholder: 'What is on your mind?', maxLength: 250, required: true });
  const project = el('input', { name: 'project', value: item?.project || '', placeholder: '/absolute/path/to/project' });
  const backend = backendSelect();
  const context = el('textarea', { name: 'context', rows: 4, placeholder: 'A few lines of context, if you have them.' });
  const submit = el('button', { type: 'submit', class: 'primary', text: 'Open thinking space' });
  const form = el('form', { onSubmit: event => { event.preventDefault(); run(async () => {
    submit.disabled = true;
    try {
      const created = await api('new', { title: title.value.trim() || 'Untitled idea', project: project.value.trim() || null, backend: backend.value, context: context.value });
      if (item) { await refreshState(); await saveWorklist(state.worklist.map(x => x.id === item.id ? { ...x, session: created.id, status: 'thinking' } : x)); }
      closeModal(); await selectSession(created.id); await refreshState(); notice('Your Markdown space is ready. Start interview when you want to connect.');
    } finally { submit.disabled = false; }
  }); } }, formField('A title for this thought', title), formField('Project directory (optional)', project, 'Ideas without repositories work too. Choose an existing, specific directory when you have one.'), formField('Think with', backend, 'A separate app-owned conversation uses the installed client. Nothing is sent until you start.'), formField('Working brief (optional)', context), el('div', { class: 'modal-actions' }, submit));
  openModal(item ? 'Start this thought' : 'A new thought', form); title.focus();
}
$('session-title').addEventListener('dblclick', () => { const title = el('input', { value: current.meta.title, maxLength: 250, 'aria-label': 'Interview title' }); openModal('Rename this interview', el('div', {}, title, button('Save title', async () => { await sessionApi('rename', { title: title.value }); closeModal(); await refreshSession(); }, { class: 'primary' }))); });
$('new-button').addEventListener('click', () => newSession()); $('welcome-new').addEventListener('click', () => newSession());
$('home-link').addEventListener('click', event => { event.preventDefault(); selected = null; current = null; localStorage.removeItem('relentless-last-session'); history.replaceState(null, '', location.pathname); renderSession(); renderNavigation(true); });
$('nav-button').addEventListener('click', () => { const opened = document.body.classList.toggle('nav-open'); $('nav-button').setAttribute('aria-expanded', String(opened)); });
function toggleContext(open = $('context-panel').hidden) { $('context-panel').hidden = !open; document.body.classList.toggle('context-open', open); $('context-button').setAttribute('aria-expanded', String(open)); if (open && display.focus) { display.focus = false; applyDisplay(); } }
$('context-button').addEventListener('click', () => toggleContext()); $('close-context').addEventListener('click', () => toggleContext(false));
$('focus-button').addEventListener('click', () => { display.focus = !display.focus; if (display.focus) toggleContext(false); applyDisplay(); });
$('display-button').addEventListener('click', () => {
  const theme = el('select', { 'aria-label': 'Appearance' }, ...['system', 'light', 'dark'].map(value => el('option', { value, text: value[0].toUpperCase() + value.slice(1) }))); theme.value = display.theme;
  theme.addEventListener('change', () => { display.theme = theme.value; applyDisplay(); });
  const size = el('input', { type: 'range', min: 15, max: 25, value: display.size, 'aria-label': 'Text size' }), sizeOut = el('output', { text: `${display.size}px` });
  size.addEventListener('input', () => { display.size = Number(size.value); sizeOut.textContent = `${display.size}px`; applyDisplay(); });
  const width = el('input', { type: 'range', min: 560, max: 1000, step: 20, value: display.width, 'aria-label': 'Writing width' }), widthOut = el('output', { text: `${display.width}px` });
  width.addEventListener('input', () => { display.width = Number(width.value); widthOut.textContent = `${display.width}px`; applyDisplay(); });
  openModal('Make yourself comfortable', el('div', {}, el('p', { class: 'modal-help', text: 'These display preferences stay in this browser. They do not change the interviewing method.' }), el('div', { class: 'display-row' }, el('label', { text: 'Appearance' }), theme), el('div', { class: 'display-row' }, el('label', { text: 'Text size' }), size, sizeOut), el('div', { class: 'display-row' }, el('label', { text: 'Writing width' }), width, widthOut)));
});

function importWorklist() {
  const area = el('textarea', { rows: 12, 'aria-label': 'Paste your worklist', placeholder: 'One thought per line\n- A Markdown list works\n2. So does a numbered list' });
  const count = el('p', { class: 'modal-help', text: 'Nothing is imported or sent to a provider until you choose Add items.' });
  const parse = () => area.value.split('\n').map(x => x.replace(/^\s*(?:[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)/, '').trim()).filter(Boolean);
  area.addEventListener('input', () => { count.textContent = `${parse().length} items will be added. Your existing list stays in place.`; });
  openModal('Bring your list', el('div', {}, el('p', { class: 'modal-help', text: 'Paste plain text or Markdown, one item per line. Add project directories later, or leave them as ideas.' }), area, count, el('div', { class: 'modal-actions' }, button('Add items', async () => { const titles = parse(); if (!titles.length) throw new Error('Paste at least one item.'); await saveWorklist([...state.worklist, ...titles.map(title => ({ id: crypto.randomUUID(), title, project: null, status: 'open', session: null }))]); closeModal(); notice(`${titles.length} thoughts added to your worklist.`); }, { class: 'primary' }))));
}
$('import-button').addEventListener('click', importWorklist);
async function saveWorklist(items) { await api('worklist', { items, revision: state.worklistRevision }); await refreshState(); }
function editItem(id) {
  const item = state.worklist.find(x => x.id === id); if (!item) return;
  const title = el('input', { value: item.title, maxLength: 250, required: true }), project = el('input', { value: item.project || '', disabled: Boolean(item.session), placeholder: '/absolute/path/to/project' });
  const status = el('select', {}, ...['open', 'thinking', 'ready', 'paused', 'done'].map(value => el('option', { value, text: value }))); status.value = item.status;
  openModal('Edit worklist item', el('form', { onSubmit: event => { event.preventDefault(); run(async () => { await saveWorklist(state.worklist.map(x => x.id === id ? { ...x, title: title.value.trim(), project: project.value.trim() || null, status: status.value } : x)); closeModal(); }); } }, formField('Title', title), formField('Project directory', project, item.session ? 'The existing session keeps its resolved target. Start a new thought for a different target.' : 'Optional. Ideas do not need a repository.'), formField('Status', status), el('div', { class: 'modal-actions' }, el('button', { type: 'submit', class: 'primary', text: 'Save item' }))));
}
function renderNavigation(force = false) {
  if (!state) return;
  const signature = JSON.stringify([state.sessions.map(s => [s.id, s.title, s.status]), state.worklist, selected]); if (!force && signature === navigationSignature) return; navigationSignature = signature;
  $('session-count').textContent = String(state.sessions.length); $('worklist-empty').hidden = state.worklist.length > 0;
  $('sessions').replaceChildren(...state.sessions.map(s => button('', () => selectSession(s.id), { class: `session-nav${s.id === selected ? ' selected' : ''}`, 'aria-current': s.id === selected ? 'page' : 'false' }).appendChild(el('span', { text: s.title })).parentNode));
  for (const [index, node] of [...$('sessions').children].entries()) node.append(el('small', { text: ['running', 'question', 'approval'].includes(state.sessions[index].status) ? state.sessions[index].status : '' }));
  $('worklist').replaceChildren(...state.worklist.map((item, index) => el('div', { class: 'worklist-item' }, el('div', { class: 'item-top' }, button(item.title, () => item.session ? selectSession(item.session) : newSession(item), { class: 'item-open', title: item.session ? 'Resume this interview' : 'Start this interview' })), el('div', { class: 'item-tools' }, el('span', { class: 'item-status', text: item.status }), el('div', { class: 'item-order' }, button('↑', async () => { const list = [...state.worklist]; [list[index - 1], list[index]] = [list[index], list[index - 1]]; await saveWorklist(list); }, { disabled: index === 0, 'aria-label': `Move ${item.title} up` }), button('↓', async () => { const list = [...state.worklist]; [list[index], list[index + 1]] = [list[index + 1], list[index]]; await saveWorklist(list); }, { disabled: index === state.worklist.length - 1, 'aria-label': `Move ${item.title} down` }), button('Edit', () => editItem(item.id), { class: 'text-button', 'aria-label': `Edit ${item.title}` }))))));
}
async function refreshState() { state = await api('state'); renderNavigation(); $('connection').textContent = state.active ? 'One agent turn active' : 'Connected locally'; $('connection').previousElementSibling.classList.remove('offline'); }
async function selectSession(id) {
  selected = id; current = null; conversationSignature = streamSignature = pendingSignature = tuneSignature = suggestionsSignature = '';
  localStorage.setItem('relentless-last-session', id); const hash = new URLSearchParams(location.hash.slice(1)); hash.set('session', id); hash.delete('tune'); history.replaceState(null, '', `${location.pathname}#${hash}`);
  document.body.classList.remove('nav-open'); $('nav-button').setAttribute('aria-expanded', 'false'); $('use-preferences').checked = false;
  await refreshSession(); renderNavigation(true);
}
async function refreshSession() { if (!selected) { renderSession(); return; } const id = selected; const session = await api(`sessions/${id}`); if (selected !== id) return; current = session; syncEditors(); renderSession(); }

for (const [section, label] of Object.entries(sectionLabels)) {
  const field = el('textarea', { id: `editor-${section}`, 'data-section': section, rows: section === 'brief' ? 6 : 4, 'aria-label': label });
  const details = el('details', { class: 'context-section', open: section === 'brief' }, el('summary', { text: label }), el('p', { class: 'context-preview', id: `preview-${section}` }), section === 'scratchpad' ? el('p', { class: 'section-note', text: 'Private. Never sent automatically. Copy selected text into your answer only when you choose to share it.' }) : null, field, el('span', { id: `save-${section}`, class: 'save-status' }), el('div', { id: `conflict-${section}`, class: 'conflict', hidden: true }), button('Save', () => saveSection(section), { 'data-save': section }));
  $('context-editors').append(details);
}
function editorKey(section, id = selected) { return `${id}:${section}`; }
function editor(section) {
  const key = editorKey(section); if (buffers.has(key)) return buffers.get(key);
  const base = section === 'raw' ? current?.raw || '' : current?.values?.[section] || '';
  const saved = readLocal(`relentless-buffer:${key}`, null);
  const buffer = saved && typeof saved.text === 'string' && typeof saved.base === 'string' ? { ...saved, dirty: saved.text !== saved.base, conflict: saved.base !== base } : { text: base, base, revision: current?.revision, dirty: false, conflict: false };
  if (!buffer.dirty) { buffer.text = base; buffer.base = base; buffer.revision = current?.revision; buffer.conflict = false; }
  buffers.set(key, buffer); return buffer;
}
function rememberBuffer(section, b) { const key = `relentless-buffer:${editorKey(section)}`; if (b.dirty) writeLocal(key, { text: b.text, base: b.base, revision: b.revision }); else localStorage.removeItem(key); }
function syncEditors() {
  if (!current) return;
  for (const node of document.querySelectorAll('textarea[data-section]')) {
    const section = node.dataset.section, b = editor(section), incoming = section === 'raw' ? current.raw : current.values?.[section];
    if (incoming === undefined) { node.disabled = true; continue; }
    node.disabled = false;
    if (!b.dirty) { b.text = incoming; b.base = incoming; b.revision = current.revision; b.conflict = false; }
    else if (b.base !== incoming) b.conflict = true;
    else { b.revision = current.revision; b.conflict = false; }
    if (node.value !== b.text) { const start = node.selectionStart, end = node.selectionEnd, scroll = node.scrollTop; node.value = b.text; if (document.activeElement === node) { node.setSelectionRange(Math.min(start, b.text.length), Math.min(end, b.text.length)); node.scrollTop = scroll; } }
    renderEditorStatus(section);
    const preview = $(`preview-${section}`); if (preview) preview.textContent = incoming || (section === 'scratchpad' ? 'A private place for unfinished thoughts.' : 'Nothing recorded yet.');
  }
}
function renderEditorStatus(section) {
  const b = editor(section), status = $(`save-${section}`), conflict = $(`conflict-${section}`);
  status.textContent = b.conflict ? 'External edit needs review' : b.dirty ? 'Unsaved · browser recovery copy' : 'Saved locally'; status.classList.toggle('dirty', b.dirty);
  if (b.conflict && !conflict.hasChildNodes()) conflict.append(el('span', { text: 'Saved Markdown changed here. Your edit is preserved.' }), el('br'), button('Compare and merge', () => compareSection(section)));
  conflict.hidden = !b.conflict;
  for (const save of document.querySelectorAll(`[data-save="${section}"]`)) save.disabled = !b.dirty || b.conflict || busy;
  updateSaveSummary();
}
function updateSaveSummary() {
  if (!current) return;
  const edited = [...buffers].filter(([k, v]) => k.startsWith(`${selected}:`) && v.dirty); $('workspace-state').textContent = edited.length ? `${edited.length} unsaved ${edited.length === 1 ? 'section' : 'sections'} · held in this browser` : 'All edits saved locally';
  $('build-unsaved').textContent = edited.some(([k]) => !k.endsWith(':draft') && !k.endsWith(':scratchpad')) ? 'There are unsaved context edits. Build uses only the saved scope shown above.' : '';
}
for (const node of document.querySelectorAll('textarea[data-section]')) node.addEventListener('input', () => { if (!current) return; const section = node.dataset.section, b = editor(section); b.text = node.value; b.dirty = b.text !== b.base; if (!b.dirty) b.conflict = false; rememberBuffer(section, b); renderEditorStatus(section); });
for (const node of document.querySelectorAll('[data-save]')) if (node.id === 'save-draft-button' || node.dataset.save === 'raw') node.addEventListener('click', () => run(() => saveSection(node.dataset.save)));
async function saveSection(section) {
  if (!current) return;
  const b = editor(section); if (b.conflict) { compareSection(section); return; } if (!b.dirty) return;
  const text = b.text, id = selected;
  try {
    await sessionApi('save', section === 'raw' ? { raw: text, revision: b.revision } : { section, text, revision: b.revision });
    if (selected !== id) return;
    // A keystroke entered while this save was in flight remains an unsaved edit.
    b.base = text; b.dirty = b.text !== text; b.conflict = false; rememberBuffer(section, b); await refreshSession(); notice(section === 'raw' ? 'Markdown saved.' : `${section === 'draft' ? 'Draft' : sectionLabels[section]} saved.`);
  } catch (error) { if (error.status === 409) await refreshSession(); throw error; }
}
function compareSection(section) {
  const b = editor(section), latest = section === 'raw' ? current.raw : current.values?.[section] || '';
  const mine = el('textarea', { value: b.text, 'aria-label': 'Your edit or merged text' }), theirs = el('textarea', { value: latest, readOnly: true, 'aria-label': 'Latest saved text' });
  const seenRevision = current.revision;
  openModal('Keep the whole thought', el('div', {}, el('p', { class: 'modal-help', text: 'Nothing has been overwritten. Compare the current saved text with your edit. Edit the left side into the result you want, then review and save it explicitly.' }), el('div', { class: 'compare-grid' }, el('div', {}, el('label', { text: 'Your edit / merged text' }), mine), el('div', {}, el('label', { text: 'Latest saved text' }), theirs)), el('div', { class: 'modal-actions' }, button('Use saved text', () => { if (current.revision !== seenRevision) throw new Error('The file changed again. Reopen the comparison.'); b.base = latest; b.text = latest; b.dirty = false; b.conflict = false; b.revision = seenRevision; rememberBuffer(section, b); syncEditors(); closeModal(); }), button('Use my reviewed merge', () => { if (current.revision !== seenRevision) throw new Error('The file changed again. Reopen the comparison.'); b.base = latest; b.text = mine.value; b.dirty = b.text !== latest; b.conflict = false; b.revision = seenRevision; rememberBuffer(section, b); syncEditors(); closeModal(); notice('Merged text is in your editor. Save when ready.'); }, { class: 'primary' }))));
}

function renderSession() {
  $('welcome').hidden = Boolean(current); $('session-view').hidden = !current; $('context-button').disabled = !current;
  if (!current) { $('mode-badge').textContent = 'Local workspace'; $('session-title').textContent = ''; return; }
  const m = current.meta, attached = m.attachment, ended = attached && ['built', 'returned', 'finished', 'disconnected', 'paused'].includes(attached.state), finishing = attached?.state === 'finishing', active = Boolean(current.active), invalid = !current.values, interrupted = m.status === 'uncertain';
  document.title = `${m.title} · Relentless`; $('session-title').textContent = m.title; $('session-target').textContent = m.project || 'An idea with room to develop. No project directory selected.';
  $('mode-badge').textContent = `${m.backend === 'mock' ? 'Synthetic' : m.backend === 'codex' ? 'Codex' : 'Claude'} · ${m.mode === 'build' ? 'Execution' : 'Read-only interview'}`; $('mode-badge').classList.toggle('executing', m.mode === 'build');
  if (attached) $('mode-badge').textContent = `${attached.client === 'codex' ? 'Codex' : 'Claude'} · Attached interviewer`;
  $('privacy-note').textContent = attached ? `This is your original native conversation’s sidecar. ${attached.nativeSessionId ? 'Native session identity captured.' : 'Continuity is tied to this live MCP connection; native session ID is unavailable.'} Answer helpers are separate and optional.` : 'Standalone: a separate app-owned conversation. Submitted public context goes to its provider. Drafts and scratchpad stay local.';
  $('interview-button').hidden = Boolean(attached); $('return-button').hidden = !attached; $('return-button').disabled = ended || finishing;
  if (ended || finishing) { $('session-alert').hidden = false; $('session-alert').textContent = ended ? `Interview ${attached.state}. Your record and working prompt are preserved. Return to your original terminal. Reopen Relentless there to resume.` : 'Finishing at the next native tool boundary. Native computation may still be running; no cancellation is claimed.'; }
  $('session-kicker').textContent = m.mode === 'build' ? 'MAKING THE AGREED SCOPE REAL' : 'THINKING TOGETHER';
  $('session-alert').hidden = !(invalid || m.error); $('session-alert').textContent = current.error || m.error || '';
  $('recovery-actions').hidden = !(interrupted || invalid || m.status === 'paused'); $('acknowledge-button').hidden = !interrupted; $('reconcile-button').hidden = !interrupted;
  $('interview-button').textContent = current.values?.conversation ? 'Resume interview' : 'Start interview';
  for (const id of ['interview-button', 'summary-button', 'continue-button', 'tune-button', 'build-button']) $(id).disabled = busy || active || Boolean(state?.active) || interrupted || invalid || ended || finishing;
  $('build-button').disabled ||= !m.project || !current.values?.brief?.trim();
  $('print-button').disabled = busy || invalid; $('export-button').disabled = invalid;
  $('pause-button').hidden = !active && !attached; $('pause-button').disabled = ended || finishing; $('pause-button').disabled = busy || ended || finishing;
  const conversation = current.values?.conversation || '';
  if (conversation !== conversationSignature || !conversation && !$('conversation').hasChildNodes()) {
    if (!conversation) { $('conversation').replaceChildren(el('p', { class: 'empty-conversation', text: 'A good conversation starts with a little context. Start the interview, or add to the working brief first.' })); conversationSignature = ''; }
    else if (renderMarkdown($('conversation'), conversation)) conversationSignature = conversation;
  }
  const streamed = current.active?.text || '', retainedSelection = !streamed && selectionInside($('stream')); $('stream').hidden = !streamed && !retainedSelection;
  if (!retainedSelection && streamed !== streamSignature && renderMarkdown($('stream'), streamed)) streamSignature = streamed;
  $('thinking').hidden = !active; $('thinking-text').textContent = m.status === 'question' ? 'Waiting for your answer' : m.status === 'approval' ? 'Waiting for a tool approval' : m.mode === 'build' ? 'Working within the agreed scope…' : 'Thinking with you…';
  $('document-path').textContent = current.path;
  $('build-target').textContent = m.project || 'No target directory. Start a project-linked session to execute.';
  const scopeText = current.prompt?.text || 'Prepare the working prompt with Print before execution. No scope is authorized yet.';
  $('prompt-status').textContent = current.prompt ? `Revision ${String(current.prompt.revision || 'candidate').slice(0, 12)} · ${!current.prompt.current ? 'Potentially outdated' : current.prompt.ready ? 'Ready to Build' : 'Provisional / review required'}${current.prompt.manual ? ' · Edited by you' : ''}` : 'No working prompt yet';
  if (awaitingPrint && current.prompt?.current) { awaitingPrint = false; reviewPrompt(); }
  if ($('build-scope').dataset.scope !== scopeText && renderMarkdown($('build-scope'), scopeText)) $('build-scope').dataset.scope = scopeText;
  const loaded = m.protocol ? m.protocol.slice(0, 12) : 'loaded on first turn'; $('protocol-info').textContent = `Method: ${loaded}. Current source: ${current.currentProtocol.slice(0, 12)}.${m.protocol && m.protocol !== current.currentProtocol ? ' The new method loads on the next turn boundary.' : ''} Provider session identifiers remain in the local metadata sidecar.`;
  renderPending(); renderTune(); renderSuggestions(); updateSaveSummary();
}
async function startTurn(action) {
  if (busy) return;
  if (state?.active && state.active !== selected) throw new Error('Another session owns the active agent turn. Open it and pause or wait.');
  const b = editor('draft'); if (action === 'continue' && b.conflict) throw new Error('Review the externally changed answer before continuing. Your local answer is preserved.');
  const submitted = action === 'continue' ? b.text : '';
  const reviewed = { revision: current.revision, scope: current.scope, promptRevision: current.prompt?.revision, target: current.meta.project }, id = selected;
  busy = true; renderSession();
  try {
    const response = await sessionApi('turn', { action, text: submitted, ...reviewed, requestId: crypto.randomUUID(), usePreferences: $('use-preferences').checked });
    if (response.preparing) { awaitingPrint = true; notice(response.message); }
    if (action === 'continue' && selected === id) { if (b.text === submitted) b.text = ''; b.base = ''; b.dirty = b.text !== ''; b.conflict = false; rememberBuffer('draft', b); }
    if (selected === id) { await refreshState(); await refreshSession(); }
  } finally { busy = false; renderSession(); }
}
for (const [id, action] of [['interview-button', 'interview'], ['summary-button', 'summary'], ['continue-button', 'continue'], ['tune-button', 'tune'], ['build-button', 'build']]) $(id).addEventListener('click', () => run(() => startTurn(action)));
$('pause-button').addEventListener('click', () => run(async () => { await sessionApi('pause', {}); notice('Pause requested. Completed text and recovery remain local.'); await refreshSession(); }));
$('print-button').addEventListener('click', () => run(async () => { const result = await sessionApi('print', { revision: current.revision }); if (result.preparing) { awaitingPrint = true; notice(result.message); } else { await refreshSession(); reviewPrompt(); } }));
$('review-prompt-button').addEventListener('click', () => run(() => current.prompt ? reviewPrompt() : $('print-button').click()));
$('return-button').addEventListener('click', () => run(async () => { await sessionApi('return', { requestId: crypto.randomUUID() }); await refreshSession(); }));
function reviewPrompt() {
  const p = current.prompt; if (!p) return;
  const revision = p.revision, sourceRevision = current.contextRevision;
  const key = `relentless-prompt-edit:${selected}:${revision}`;
  const area = el('textarea', { class: 'export-text', value: readLocal(key, p.text), 'aria-label': 'Working execution prompt', spellcheck: false });
  area.addEventListener('input', () => writeLocal(key, area.value));
  const ready = el('input', { type: 'checkbox', checked: p.ready });
  const proposed = el('div');
  for (const candidate of p.candidates || []) proposed.append(el('details', {}, el('summary', { text: `Proposed replacement · ${candidate.sourceRevision === sourceRevision ? 'current context' : 'older context'}` }), el('pre', { text: candidate.text }), button('Review replacement in editor', () => { writeLocal(key + ':previous', area.value); area.value = candidate.text; area.dispatchEvent(new Event('input')); ready.checked = false; notice('Previous editor text preserved locally. Review this proposal and its freshness before saving.'); })));
  openModal('Working execution prompt', el('div', {}, el('p', { class: 'modal-help', text: `${p.path} · revision ${String(revision || 'candidate').slice(0,12)}. ${p.current ? '' : 'Potentially outdated: reconcile changed context before Build.'} Print and Build use this exact saved body. Saving here grants no execution authority.` }), area, proposed,
    el('label', { class: 'checkbox-line' }, ready, ' This proposed scope is clear enough to begin; no blocking decisions remain'),
    el('div', { class: 'modal-actions' }, button('Copy', () => copy(p.text)), button('Export saved .md…', () => showText('Export working execution prompt', p.text, 'relentless-execution-prompt.md')), button('Save reviewed prompt', async () => { await sessionApi('prompt-edit', { text: area.value, revision, sourceRevision, ready: ready.checked }); localStorage.removeItem(key); closeModal(); await refreshSession(); notice('Working prompt saved. Build is a separate deliberate action.'); }, { class: 'primary' }))));
}
$('export-button').addEventListener('click', () => run(async () => { const result = await sessionApi('export', {}); showText('Take the thought with you', result.text, 'relentless-chatgpt-context.md', 'Copy into a new ChatGPT conversation, or explicitly save and upload this Markdown. Generated from the canonical method and compact public context. Local skills do not automatically sync to ChatGPT web.'); }));
$('copy-path-button').addEventListener('click', () => run(() => copy(current.path)));
$('raw-toggle-button').addEventListener('click', () => { $('raw-editor-container').hidden = !$('raw-editor-container').hidden; $('raw-toggle-button').textContent = $('raw-editor-container').hidden ? 'Edit full Markdown' : 'Hide Markdown editor'; });
$('recovery-button').addEventListener('click', () => run(async () => { const result = await sessionApi('recovery'); showText('Recovered text', result.files.length ? result.files.map(f => `# ${f.name}\n\n${f.text}`).join('\n\n---\n\n') : 'No interrupted response text was found. The canonical session Markdown remains available on disk.', 'relentless-recovery.md', 'Recovery text is evidence of the interrupted turn. It is not automatically submitted or merged into the session.'); }));
$('reconcile-button').addEventListener('click', () => run(async () => { const result = await sessionApi('reconcile', {}); showText('Provider state', result.message || JSON.stringify(result.thread, null, 2), 'relentless-provider-reconciliation.md', 'Inspect this result and target files before acknowledging an interrupted execution. No request was replayed.'); }));
$('acknowledge-button').addEventListener('click', () => run(async () => { await sessionApi('acknowledge', {}); await refreshSession(); notice('Interrupted state acknowledged. The next submission starts a fresh thread with current public context.'); }));
$('stop-button').addEventListener('click', () => { openModal('Close the local workspace?', el('div', {}, el('p', { text: 'The application will pause an active turn and stop its local server. Saved Markdown stays on disk. Unsaved text remains in this browser’s recovery storage. Run relentless to reopen.' }), el('div', { class: 'modal-actions' }, button('Keep thinking', closeModal), button('Stop application', async () => { await api('stop', {}); closeModal(); capability = null; sessionStorage.removeItem('relentless-capability'); notice('Application stopped. Run relentless to reopen your workspace.'); $('connection').textContent = 'Stopped'; }, { class: 'primary' })))); });

function renderPending() {
  const pending = current.meta.attachment?.question || current.active?.pending || (current.meta.status === 'uncertain' ? current.meta.pending : null), recovered = Boolean(pending && !current.active?.pending && !current.meta.attachment); const signature = `${pending?.id || ''}:${recovered}`;
  if (signature === pendingSignature) return; pendingSignature = signature; $('pending').hidden = !pending; $('pending').replaceChildren(); if (!pending) return;
  if (pending.kind === 'approval' && recovered) {
    $('pending').append(el('div', { class: 'pending-card' }, el('p', { class: 'eyebrow', text: 'INTERRUPTED TOOL APPROVAL' }), el('h2', { text: pending.tool || 'Previous tool request' }), el('p', { class: 'small muted', text: 'The callback ended when the server stopped. This retained request cannot be approved. Check provider state and target files before acknowledging the interruption.' }), el('pre', { text: JSON.stringify(pending.input, null, 2) }))); return;
  }
  if (pending.kind === 'approval') {
    const approve = button('Approve this tool request', () => send(true), { class: 'primary' }), deny = button('Deny', () => send(false));
    const send = async allow => { approve.disabled = deny.disabled = true; try { await sessionApi('answer', { pendingId: pending.id, kind: 'approval', allow }); await refreshSession(); } catch (error) { approve.disabled = deny.disabled = false; throw error; } };
    $('pending').append(el('div', { class: 'pending-card' }, el('p', { class: 'eyebrow', text: 'TOOL APPROVAL · EXECUTION ONLY' }), el('h2', { text: pending.tool || 'An action needs your approval' }), el('p', { class: 'small muted', text: 'This approval applies to the specific tool request below. It is separate from answering a question or authorizing Build.' }), el('pre', { text: JSON.stringify(pending.input, null, 2) }), el('div', { class: 'button-row' }, deny, approve))); return;
  }
  const answers = {};
  const fields = (pending.questions || []).map((question, i) => {
    const key = question.id || question.question || String(i), area = el('textarea', { rows: 3, 'aria-label': `Answer: ${question.question}`, placeholder: 'Your own answer, a question back, or help me think through this.' }); answers[key] = area;
    const options = (question.options || []).map(option => button(option.label || option, () => { area.value = option.label || option; area.dispatchEvent(new Event('input')); area.focus(); }, { title: option.description || '' }));
    options.push(button('Help me think through this', () => { area.value = 'Help me think through this.'; area.dispatchEvent(new Event('input')); area.focus(); }));
    const bufferKey = `relentless-question:${selected}:${pending.id}:${key}`; area.value = readLocal(bufferKey, ''); area.addEventListener('input', () => writeLocal(bufferKey, area.value));
    const fromDraft = button('Use saved Markdown draft', () => { if (area.value.trim()) throw new Error('Clear this question answer first to preserve your current writing.'); area.value = current.values?.draft || ''; area.dispatchEvent(new Event('input')); area.focus(); notice('Saved draft copied. Review it, then send the answer explicitly.'); });
    return el('fieldset', {}, el('legend', { text: question.question || question.header || 'A question for you' }), el('div', { class: 'pending-options' }, ...options), area, fromDraft);
  });
  const submit = button('Send answer', async () => {
    const values = Object.fromEntries(Object.entries(answers).map(([key, area]) => [key, area.value])); if (!Object.values(values).some(x => x.trim())) throw new Error('Write anything that helps, including a question back.');
    submit.disabled = true; try { await sessionApi('answer', { pendingId: pending.id, kind: 'question', answers: values }); for (const key of Object.keys(values)) localStorage.removeItem(`relentless-question:${selected}:${pending.id}:${key}`); await refreshSession(); } finally { submit.disabled = false; }
  }, { class: 'primary', disabled: recovered });
  $('pending').append(el('div', { class: 'pending-card' }, el('p', { class: 'eyebrow', text: recovered ? 'QUESTION RETAINED AFTER INTERRUPTION' : 'A QUESTION TO THINK WITH' }), ...fields, recovered ? button('Copy answer to draft', () => { const b = editor('draft'); if (b.dirty || b.text.trim()) throw new Error('Save or submit your current draft before copying this retained answer into it.'); b.text = Object.values(answers).map(area => area.value).filter(Boolean).join('\n\n'); b.dirty = b.text !== b.base; rememberBuffer('draft', b); syncEditors(); notice('Answer copied to your local draft. Acknowledge the interrupted turn before explicitly continuing.'); }) : submit, el('p', { class: 'small muted', text: recovered ? 'The previous question callback ended. Your answers remain local and editable. Check provider state, then acknowledge the interruption and deliberately submit a new turn.' : 'Your answer continues the interview. It cannot approve tools or authorize execution.' })));
}
function renderSuggestions() {
  const suggestion = current.meta.suggestion, signature = JSON.stringify(suggestion); if (signature === suggestionsSignature) return; suggestionsSignature = signature;
  $('suggestions').replaceChildren(); $('suggestions').hidden = !suggestion || !Object.keys(suggestion).length; if (!suggestion) return;
  $('suggestions').append(el('h3', { text: 'Suggested context updates' }), el('p', { class: 'small muted', text: 'These are agent suggestions. Review them in your editor before saving.' }));
  for (const [section, text] of Object.entries(suggestion)) {
    if (!sectionLabels[section]) continue;
    $('suggestions').append(el('details', { class: 'suggestion-card' }, el('summary', { text: sectionLabels[section] }), el('pre', { text }), button('Review in editor', () => {
      const b = editor(section); if (b.dirty) throw new Error(`Save or resolve your current ${sectionLabels[section].toLowerCase()} edit before reviewing a suggestion.`);
      b.text = text; b.dirty = b.text !== b.base; rememberBuffer(section, b); syncEditors(); const field = $(`editor-${section}`); field.closest('details').open = true; field.focus(); notice('Suggestion placed in the editor. Review and Save to accept it into context.');
    })));
  }
}
function renderTune() {
  const tune = current.meta.tune, signature = JSON.stringify(tune); if (signature === tuneSignature) return; tuneSignature = signature;
  $('tune-review').hidden = !tune; $('tune-proposals').replaceChildren(); if (!tune) return;
  $('tune-version').textContent = `Method ${tune.version.slice(0, 12)}`;
  if (!tune.proposals.length) { $('tune-proposals').append(el('p', { class: 'callout', text: 'No structured changes proposed. The review is preserved in the conversation. No change needed is a valid outcome.' })); return; }
  for (const proposal of tune.proposals) {
    const pending = ['proposed', 'deferred'].includes(proposal.status);
    const after = el('textarea', { rows: 5, value: proposal.after || '', 'aria-label': `Proposed change: ${proposal.change || proposal.scope}`, disabled: !pending });
    const actions = el('div', { class: 'button-row' });
    const decide = async decision => {
      for (const node of actions.children) node.disabled = true;
      try { const result = await sessionApi('tune-decision', { proposalId: proposal.id, decision, after: after.value, version: tune.version }); await refreshSession(); await refreshState(); if (result.implementationPrompt) showText('Interface implementation proposal', result.implementationPrompt, 'relentless-interface-change.md', 'This acceptance records a concrete implementation prompt. Interface code has not been changed or executed.'); else notice(decision === 'accept' ? 'Reviewed change accepted within its stated scope. It takes effect at the next relevant boundary.' : decision === 'reject' ? 'Proposal rejected. Reusable rules are unchanged.' : 'Proposal deferred. No rules changed.'); }
      catch (error) { for (const node of actions.children) node.disabled = false; throw error; }
    };
    if (pending) actions.append(button('Reject', () => decide('reject')), button('Defer', () => decide('defer')), button('Accept reviewed change', () => decide('accept'), { class: 'primary' }));
    if (proposal.implementationPrompt) actions.append(button('Copy implementation prompt', () => showText('Interface implementation proposal', proposal.implementationPrompt, 'relentless-interface-change.md')));
    const details = el('dl'); for (const [label, value] of [['Observed friction or success', proposal.observed], ['Supporting exchange or feedback', proposal.evidence], ['Expected benefit', proposal.benefit], ['Possible downside', proposal.downside], ['Before', proposal.before]]) details.append(el('dt', { text: label }), el('dd', { text: value || 'Not specified in this proposal.' }));
    let preferencePreview = null;
    if (proposal.scope === 'preference' && pending) {
      const preview = el('pre', { text: proposal.preferencePreview || '' });
      const update = () => { const current = proposal.currentPreference || '', before = proposal.before || '', replacement = after.value; preview.textContent = !current || current === before ? replacement : before && current.split(before).length === 2 ? current.replace(before, replacement) : current.includes(replacement) ? current : `${current}\n\n${replacement}`.trim(); };
      after.addEventListener('input', update);
      preferencePreview = el('details', { open: true }, el('summary', { text: 'Resulting personal preferences' }), el('p', { class: 'small muted', text: 'A matching excerpt is replaced. Otherwise this adds the reviewed preference while preserving existing text.' }), preview);
    }
    $('tune-proposals').append(el('article', { class: 'tune-card' }, el('p', { class: 'proposal-status', text: `${proposal.scope} · ${proposal.status}` }), el('h3', { text: proposal.change || 'A proposed refinement' }), details, el('label', { text: pending ? 'After / your edited replacement' : 'Reviewed replacement' }), after, preferencePreview, proposal.commit ? el('p', { class: 'file-path', text: `Method commit: ${proposal.commit}` }) : null, actions));
  }
}
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { const section = document.activeElement?.dataset?.section; if (section) { event.preventDefault(); run(() => saveSection(section)); } }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && document.activeElement === $('editor-draft') && !$('continue-button').disabled) { event.preventDefault(); run(() => startTurn('continue')); }
  if (event.key === 'Escape' && !$('modal').open) { toggleContext(false); document.body.classList.remove('nav-open'); }
});
window.addEventListener('beforeunload', event => { if ([...buffers.values()].some(b => b.dirty)) { event.preventDefault(); event.returnValue = ''; } });
async function poll() {
  if (polling || !capability) return; polling = true;
  try { await refreshState(); if (selected && !state.sessions.some(s => s.id === selected)) { selected = null; current = null; localStorage.removeItem('relentless-last-session'); } await refreshSession(); }
  catch (error) { $('connection').textContent = 'Connection unavailable'; if (error.status === 401) { capability = null; notice('This browser needs a fresh local connection. Run relentless to open an authorized workspace link. Your text is preserved locally.', true); } else if (!state) notice(error.message, true); }
  finally { polling = false; }
}
if (!capability) notice('Open this workspace with the relentless command to establish its private local connection.', true);
else run(async () => { await poll(); if (selected) await selectSession(selected); if (tuneOnOpen && current) { tuneOnOpen = false; await startTurn('tune'); } });
setInterval(poll, 1100);
