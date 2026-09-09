import { cleanMarkdown } from '/markdown.js';

const controllers = new WeakMap();
let preferences;
try { const stored = JSON.parse(localStorage.getItem('relentless-compose')); preferences = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}; } catch { preferences = {}; }
function remember() { try { localStorage.setItem('relentless-compose', JSON.stringify(preferences)); } catch { /* Display preferences need no recovery writes. */ } }
function applyWidth() {
  document.body.classList.toggle('compose-expanded', preferences.expanded === true);
  for (const button of document.querySelectorAll('.compose-expand')) {
    button.textContent = preferences.expanded ? 'Collapse' : 'Expand';
    button.setAttribute('aria-pressed', String(preferences.expanded === true));
  }
}
applyWidth();

// Wrap the original textarea. It remains the sole editable value, with its own
// existing recovery, helper and submit listeners. Rendering never dispatches input.
export function compose(area, kind = 'draft') {
  if (controllers.has(area)) return area.parentElement.parentElement;
  const wrapper = document.createElement('div'); wrapper.className = 'compose-view';
  const toolbar = document.createElement('div'); toolbar.className = 'compose-toolbar'; toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', 'Answer view');
  const panes = document.createElement('div'); panes.className = 'compose-panes';
  const preview = document.createElement('article'); preview.className = 'compose-preview markdown'; preview.tabIndex = 0; preview.setAttribute('aria-label', 'Formatted answer preview, read only');
  preview.id = `compose-preview-${crypto.randomUUID()}`;
  const buttons = new Map();
  let mode = ['write', 'split', 'preview'].includes(preferences[kind]) ? preferences[kind] : 'write';
  let rendered = null, composing = false, timer, caret = null;
  const update = () => {
    clearTimeout(timer);
    if (composing || mode === 'write' || area.value === rendered) return;
    preview.replaceChildren(area.value ? cleanMarkdown(area.value) : document.createTextNode('Your formatted answer will appear here.'));
    rendered = area.value;
  };
  const setMode = (next, focus = false) => {
    if (next === 'preview' && mode !== 'preview') caret = { start: area.selectionStart, end: area.selectionEnd, direction: area.selectionDirection, scroll: area.scrollTop };
    const returning = mode === 'preview' && next !== 'preview';
    mode = next; wrapper.dataset.mode = mode;
    area.hidden = mode === 'preview'; preview.hidden = mode === 'write';
    for (const [name, button] of buttons) button.setAttribute('aria-pressed', String(name === mode));
    update();
    if (returning && caret) { area.setSelectionRange(caret.start, caret.end, caret.direction); area.scrollTop = caret.scroll; }
    // Only an explicit Write action returns focus; Preview never focuses a hidden
    // textarea and cannot activate its Continue keyboard shortcut.
    if (focus && mode === 'write') area.focus({ preventScroll: true });
  };
  for (const [value, label] of [['write', 'Write'], ['split', 'Split'], ['preview', 'Preview']]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-controls', preview.id);
    button.addEventListener('click', () => { preferences[kind] = value; remember(); setMode(value, true); });
    buttons.set(value, button); toolbar.append(button);
  }
  const expand = document.createElement('button'); expand.type = 'button'; expand.className = 'compose-expand'; expand.title = 'Use the available workspace width'; expand.textContent = preferences.expanded ? 'Collapse' : 'Expand'; expand.setAttribute('aria-pressed', String(preferences.expanded === true));
  expand.addEventListener('click', () => { preferences.expanded = !preferences.expanded; remember(); applyWidth(); }); toolbar.append(expand);
  area.before(wrapper); panes.append(area, preview); wrapper.append(toolbar, panes);
  area.addEventListener('input', () => { clearTimeout(timer); if (!composing) timer = setTimeout(update, 100); });
  area.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
  area.addEventListener('compositionend', () => { composing = false; update(); });
  controllers.set(area, { update, write: () => setMode('write', true), clear: () => { clearTimeout(timer); preview.replaceChildren(); rendered = null; caret = null; } });
  setMode(mode); applyWidth(); return wrapper;
}
export function updateComposition(area) { controllers.get(area)?.update(); }
export function writeComposition(area) { controllers.get(area)?.write(); }
export function clearCompositions() { for (const area of document.querySelectorAll('.compose-view textarea')) controllers.get(area)?.clear(); }
