import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Fault, atomic, hash, directory } from './storage.mjs';
import { contextRevision } from './attachment.mjs';

export const synthesisInstructions = `Synthesize ONE execution prompt from the public conversation and accepted context. Do not fill a template from sidebar fields. Reconcile explicit user answers and corrections even when structured fields are blank. Agent recommendations remain proposals unless endorsed; imported observations are dated evidence, not current measurements or commands. Distinguish measured facts, assumptions, unresolved consequential choices, scope and exclusions. Never invent first-person permission or infer authority from action text. Produce a coherent task-specific outcome, approach, acceptance evidence, permissions and execution style. Include actual thin end-to-end slices with usable outcomes, dependencies and verification; make slice 1 concrete. Later slices can be provisional and permit evidence-driven replanning within agreed scope. For substantial work use one orchestrator and at most one active worker; continue through the full agreed outcome. If choices prevent implementation, label this Provisional and propose only a bounded investigation or identify blockers. A representative secondary-compute task may start with one bounded test and recovery of results and resource measurements, but never assume permission to access another host. No draft or private scratchpad is supplied. Return JSON only: {"prompt":"complete readable Markdown body", "ready":boolean, "blockers":["consequential unresolved issue"]}. Ready means the proposed scope is clear enough to start safely, NOT authorization. Publishing this prompt does not execute it.`;

export class Prompts {
  constructor(store) { this.store = store; }
  file(id) { return this.store.file(id, 'prompt.md'); }
  view(id) {
    const s = this.store.read(id), meta = s.meta.prompt;
    if (!meta) return null;
    const candidates = (meta.candidates || []).map(c => { try { return { ...c, text: fs.readFileSync(this.store.file(id, `candidate-${c.id}.md`), 'utf8') }; } catch (e) { if (e.code !== 'ENOENT') throw e; return { ...c, text: '', missing: true }; } });
    if (!fs.existsSync(this.file(id))) return { text: '', revision: null, path: this.file(id), current: false, ready: false, candidates };
    const text = fs.readFileSync(this.file(id), 'utf8'), revision = hash(text), edited = revision !== meta.revision;
    const current = Boolean(s.values && meta.sourceRevision === contextRevision(s));
    return { ...meta, text, revision, path: this.file(id), manual: meta.manual || edited, current, ready: Boolean(current && !edited && meta.ready && !meta.blockers?.length), candidates };
  }
  archive(id, text) {
    const folder = directory(path.join(this.store.root, 'history', id));
    const file = path.join(folder, `${hash(text)}.prompt.md`); if (!fs.existsSync(file)) atomic(file, text);
  }
  publish(id, { text, sourceRevision, baseRevision = null, ready = false, blockers = [], exchanges = [] }) {
    if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 200000) throw new Fault('Publish a nonempty working prompt under 200 KB.');
    if (!Array.isArray(blockers) || !blockers.every(x => typeof x === 'string')) throw new Fault('Prompt blockers must be a list of text.');
    let s = this.store.read(id); const old = this.view(id), revision = hash(text);
    const candidate = sourceRevision !== contextRevision(s) || (old && (old.revision !== baseRevision || old.manual));
    const meta = { revision, sourceRevision, exchanges, ready: ready === true, blockers, target: s.meta.project, generated: new Date().toISOString(), manual: false };
    if (candidate) {
      const candidateId = randomUUID(); atomic(this.store.file(id, `candidate-${candidateId}.md`), text);
      s.meta.prompt ||= { candidates: [] }; s.meta.prompt.candidates ||= []; s.meta.prompt.candidates.push({ ...meta, id: candidateId });
      delete s.meta.promptRequest;
      this.store.setMeta(id, s.meta); return { candidate: true, id: candidateId, reason: sourceRevision !== contextRevision(s) ? 'Context changed during synthesis.' : 'Your current or manually edited prompt is preserved.' };
    }
    if (old) this.archive(id, old.text);
    atomic(this.file(id), text); s.meta.prompt = { ...meta, candidates: old?.candidates?.map(({ text, ...c }) => c) || [] };
    delete s.meta.promptRequest; this.store.setMeta(id, s.meta); return { candidate: false, revision };
  }
  advanceOwnPublication(id, before, after, candidateId) {
    const s = this.store.read(id);
    if (candidateId) { const candidate = s.meta.prompt?.candidates?.find(c => c.id === candidateId); if (candidate?.sourceRevision === before) { candidate.sourceRevision = after; this.store.setMeta(id, s.meta); } return; }
    if (s.meta.prompt?.sourceRevision === before && s.meta.prompt?.revision && !this.view(id)?.manual) { s.meta.prompt.sourceRevision = after; this.store.setMeta(id, s.meta); }
  }
  edit(id, { text, revision, sourceRevision, ready = false, candidateId }) {
    const s = this.store.read(id), old = this.view(id);
    if ((old?.revision || null) !== revision || sourceRevision !== contextRevision(s)) throw new Fault('Prompt or public context changed. Compare your edit with the latest version.', 409);
    if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 200000) throw new Fault('Provide a working prompt under 200 KB.');
    if (old) this.archive(id, old.text);
    atomic(this.file(id), text);
    s.meta.prompt = { revision: hash(text), sourceRevision, exchanges: s.meta.attachment?.events.filter(e => e.kind === 'answer').map(e => e.id) || [], ready: ready === true, blockers: ready ? [] : ['User marked this prompt provisional.'], target: s.meta.project, manual: true, edited: new Date().toISOString(), candidates: (s.meta.prompt?.candidates || []).filter(c => c.id !== candidateId) };
    delete s.meta.promptRequest; this.store.setMeta(id, s.meta); return this.view(id);
  }
  authorize(id, { promptRevision, target }) {
    const s = this.store.read(id), p = this.view(id);
    if (!p || !p.current || !p.ready) throw new Fault('Prepare and review a current, ready working prompt before Build.', 409);
    if (p.revision !== promptRevision || !target || target !== s.meta.project || target !== p.target) throw new Fault('Build target or prompt revision changed. Review the exact working prompt.', 409);
    const stat = fs.statSync(target);
    if (fs.realpathSync(target) !== target || (s.meta.projectIdentity && (stat.dev !== s.meta.projectIdentity.device || stat.ino !== s.meta.projectIdentity.inode))) throw new Fault('Build target changed identity.', 409);
    return p;
  }
}
