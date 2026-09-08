import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';

export const sections = ['brief', 'decisions', 'facts', 'assumptions', 'questions', 'conversation', 'draft', 'scratchpad'];
export const hash = x => createHash('sha256').update(x).digest('hex');
export const dataHome = () => process.env.RELENTLESS_HOME || path.join(os.homedir(), '.local/share/relentless');
export class Fault extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function directory(p) { fs.mkdirSync(p, { recursive: true, mode: 0o700 }); return fs.realpathSync(p); }
export function atomic(file, text) {
  const tmp = `${file}.${randomUUID()}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try { fs.writeFileSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
export function json(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } }
export function contained(root, candidate) { const r = path.relative(root, candidate); return r === '' || (!r.startsWith(`..${path.sep}`) && r !== '..' && !path.isAbsolute(r)); }
export function projectPath(value, forbidden = []) {
  if (!value) return null;
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Fault('Project must be an existing absolute directory.');
  let resolved;
  try { resolved = fs.realpathSync(value); if (!fs.statSync(resolved).isDirectory()) throw new Error(); } catch { throw new Fault('Project directory does not exist.'); }
  if (resolved === '/' || resolved === os.homedir() || forbidden.some(p => contained(resolved, p) || contained(p, resolved))) throw new Fault('Choose a specific project outside Relentless source and private storage.');
  return resolved;
}
export function renderDocument(title, values = {}) {
  return `# ${title.replace(/[\r\n]/g, ' ')}\n\nLocal session. Save edits, then explicitly Continue. Draft and scratchpad stay private.\n\n` + sections.map(k => `<!-- relentless:${k} -->\n## ${k[0].toUpperCase() + k.slice(1)}\n\n${values[k] || ''}\n\n`).join('');
}
function documentMarkers(raw) {
  if (Buffer.byteLength(raw) > 2_000_000) throw new Fault('Document exceeds the 2 MB safety limit. Text is preserved on disk.', 422);
  const found = []; let fence = null; let offset = 0;
  for (const line of raw.split(/(?<=\n)/)) {
    const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) { if (!fence) fence = f[1]; else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null; }
    if (!fence) { const m = line.trim().match(/^<!-- relentless:([a-z]+) -->$/); if (m) found.push({ key: m[1], start: offset, end: offset + line.length }); }
    offset += line.length;
  }
  if (found.map(x => x.key).join() !== sections.join()) throw new Fault('Section markers are missing, duplicated or inside an unfinished code fence. Repair the Markdown; your file has been preserved.', 422);
  return found;
}
export function parseDocument(raw) {
  const found = documentMarkers(raw);
  const values = {};
  found.forEach((x, i) => { values[x.key] = raw.slice(x.end, found[i + 1]?.start ?? raw.length).replace(/^\s*## [^\n]+\n/, '').trim(); });
  return values;
}
export function replaceSection(raw, key, value) {
  if (!sections.includes(key)) throw new Fault('Unknown section.');
  const values = parseDocument(raw); values[key] = value;
  // Preserve all untouched bytes and headings. Delimiters have already been validated.
  const markers = documentMarkers(raw), index = sections.indexOf(key), marker = markers[index];
  const end = markers[index + 1]?.start ?? raw.length;
  const content = raw.slice(marker.end, end), heading = content.match(/^\s*## [^\n]+\n/);
  const bodyStart = marker.end + (heading?.[0].length || 0);
  const updated = raw.slice(0, bodyStart) + `\n${value}\n\n` + raw.slice(end);
  parseDocument(updated); return updated;
}
export function publicContext(values) { return sections.filter(k => !['draft', 'scratchpad'].includes(k)).map(k => `## ${k}\n${values[k]}`).join('\n\n'); }
export function scopeHash(values, project) { return hash(JSON.stringify([project, ...['brief', 'decisions', 'facts', 'assumptions'].map(k => values[k])])); }

export class Store {
  constructor(root = dataHome(), repo) {
    this.root = directory(root); this.repo = repo; directory(path.join(root, 'sessions')); directory(path.join(root, 'recovery')); directory(path.join(root, 'history')); directory(path.join(root, 'empty-project'));
    this.worklistFile = path.join(root, 'worklist.json');
  }
  file(id, ext = 'md') {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Fault('Invalid session identifier.');
    const file = path.join(this.root, 'sessions', `${id}.${ext}`);
    if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Fault('Session symlinks are not accepted.');
    return file;
  }
  meta(id) { const m = json(this.file(id, 'json'), null); if (!m) throw new Fault('Session not found.', 404); return m; }
  setMeta(id, m) { atomic(this.file(id, 'json'), JSON.stringify(m, null, 2)); }
  read(id) {
    const meta = this.meta(id); let raw;
    try { raw = fs.readFileSync(this.file(id), 'utf8'); } catch (e) { if (e instanceof Fault) throw e; throw new Fault('Session Markdown is temporarily missing. Restore the file or use history.', 422); }
    let values = null, error = null; try { values = parseDocument(raw); } catch (e) { error = e.message; }
    return { id, raw, revision: hash(raw), values, error, meta, path: this.file(id) };
  }
  save(id, raw, revision) {
    parseDocument(raw);
    const current = this.read(id);
    if (revision !== current.revision) throw new Fault('The Markdown changed elsewhere. Your draft is retained. Compare and merge before saving.', 409);
    if (raw === current.raw) return current;
    const history = directory(path.join(this.root, 'history', id));
    const prev = path.join(history, `${current.revision}.md`);
    if (!fs.existsSync(prev)) atomic(prev, current.raw);
    // Serialized synchronous mutation, followed by a final external-edit check.
    if (hash(fs.readFileSync(this.file(id))) !== revision) throw new Fault('External edit detected during save. Retry after merging.', 409);
    atomic(this.file(id), raw);
    return this.read(id);
  }
  update(id, key, value, revision) { const s = this.read(id); return this.save(id, replaceSection(s.raw, key, value), revision); }
  append(id, role, text) {
    const s = this.read(id); if (!s.values) throw new Fault(s.error, 422);
    return this.update(id, 'conversation', `${s.values.conversation}\n\n### ${role}\n\n${text}`.trim(), s.revision);
  }
  create({ title = 'Untitled idea', project = null, backend = 'codex', context = '' } = {}) {
    if (!['codex', 'claude', 'mock'].includes(backend)) throw new Fault('Unknown backend.');
    if (typeof title !== 'string' || title.length > 250) throw new Fault('Use a title under 250 characters.');
    project = projectPath(project, [this.root, this.repo].filter(Boolean));
    const id = randomUUID();
    this.setMeta(id, { id, title, project, backend, created: new Date().toISOString(), status: 'idle', mode: 'interview', providers: {}, requests: [], protocol: null });
    atomic(this.file(id), renderDocument(title, { brief: context || title }));
    return this.read(id);
  }
  list() { return fs.readdirSync(path.join(this.root, 'sessions')).filter(f => f.endsWith('.json')).map(f => this.meta(f.slice(0, -5))).sort((a, b) => b.created.localeCompare(a.created)); }
  recover() {
    for (const m of this.list()) if (['running', 'question', 'approval'].includes(m.status)) { m.status = 'uncertain'; m.mode = 'interview'; m.error = 'The server stopped during a provider request. No request was replayed. Inspect recovery and provider state before continuing.'; this.setMeta(m.id, m); }
  }
  recovery(id, text, label = 'response') { this.meta(id); const file = path.join(this.root, 'recovery', `${id}-${label}-${randomUUID()}.md`); atomic(file, text); return file; }
  worklist() { return json(this.worklistFile, []); }
  saveWorklist(items, revision) {
    const old = this.worklist(); if (revision !== hash(JSON.stringify(old))) throw new Fault('The worklist changed in another window.', 409);
    if (!Array.isArray(items) || items.length > 250) throw new Fault('Worklist must contain at most 250 items.');
    const seen = new Set(); const clean = items.map(i => {
      if (typeof i.title !== 'string' || !i.title.trim() || i.title.length > 250 || !/^[a-f0-9-]{36}$/.test(i.id) || seen.has(i.id)) throw new Fault('Invalid worklist item.'); seen.add(i.id);
      if (i.session) this.meta(i.session);
      return { id: i.id, title: i.title, project: projectPath(i.project, [this.root, this.repo].filter(Boolean)), status: ['open', 'thinking', 'ready', 'done', 'paused'].includes(i.status) ? i.status : 'open', session: i.session || null };
    }); atomic(this.worklistFile, JSON.stringify(clean, null, 2)); return clean;
  }
}
