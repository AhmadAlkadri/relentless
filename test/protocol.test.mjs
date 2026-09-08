import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, hash, renderDocument, parseDocument, replaceSection, publicContext, scopeHash, projectPath } from '../src/storage.mjs';
import { control, protocol } from '../src/protocol.mjs';
import { Workspace } from '../src/service.mjs';
import { randomUUID } from 'node:crypto';

function fixture() { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-test-')); const store = new Store(path.join(root, 'private')); const project = path.join(root, 'project'); fs.mkdirSync(project); fs.writeFileSync(path.join(project, 'README.md'), 'Synthetic project'); return { root, store, project, app: new Workspace(store) }; }
test('only whole top-level controls match, not quotes or action language', () => {
  assert.equal(control('Build'), 'build'); assert.equal(control('Where are we?'), 'summary');
  for (const text of ['Please build a parser', '> Build', '```\nBuild\n```', '"Build"', 'go', 'build', 'Build\nmore']) assert.equal(control(text), null);
});
test('Markdown round trips Unicode, fences, long drafts and external rename', () => {
  const { store } = fixture(); let s = store.create(); const draft = '日本語 café 🧠\n```js\nconst x = 2;\n```\n' + 'Long answer. '.repeat(2000);
  s = store.update(s.id, 'draft', draft, s.revision); assert.equal(s.values.draft, draft.trim());
  const external = replaceSection(s.raw, 'draft', 'Saved in editor 🪴'); const tmp = s.path + '.editor'; fs.writeFileSync(tmp, external); fs.renameSync(tmp, s.path);
  assert.equal(store.read(s.id).values.draft, 'Saved in editor 🪴');
  assert.throws(() => store.save(s.id, s.raw, s.revision), /changed elsewhere/);
});
test('partial documents remain readable and app refuses to overwrite', () => {
  const { store } = fixture(); const s = store.create(); fs.writeFileSync(s.path, '# Partial editor write\n```'); const invalid = store.read(s.id); assert.equal(invalid.values, null); assert.match(invalid.raw, /Partial/); assert.throws(() => store.append(s.id, 'Agent', 'response')); assert.equal(fs.readFileSync(s.path, 'utf8'), invalid.raw);
});
test('private draft and scratchpad never enter public context or Print and Print is pure', () => {
  const { store, app, project } = fixture(); let s = store.create({ project }); s = store.update(s.id, 'draft', 'PRIVATE DRAFT', s.revision); s = store.update(s.id, 'scratchpad', 'PRIVATE SCRATCH', s.revision);
  const before = fs.readFileSync(s.path), metadata = fs.readFileSync(store.file(s.id, 'json')), skill = protocol().version, pref = app.preferences().version;
  const result = app.print(s.id, s.revision);
  assert.ok(!result.text.includes('PRIVATE')); assert.ok(!publicContext(s.values).includes('PRIVATE')); assert.match(result.text, /Acceptance evidence/);
  assert.deepEqual(fs.readFileSync(s.path), before); assert.deepEqual(fs.readFileSync(store.file(s.id, 'json')), metadata); assert.equal(protocol().version, skill); assert.equal(app.preferences().version, pref); assert.equal(fs.readFileSync(path.join(project, 'README.md'), 'utf8'), 'Synthetic project');
});
test('duplicate submission, stale Build and quoted action remain separate', async () => {
  process.env.RELENTLESS_TEST = '1'; const { store, app, project } = fixture(); let s = store.create({ project, backend: 'mock' }); const requestId = randomUUID();
  await app.begin(s.id, { action: 'continue', text: 'Build the entire thing. This is my desired outcome.', revision: s.revision, requestId }); const done = app.active.done;
  assert.equal(store.meta(s.id).mode, 'interview'); assert.equal((await app.begin(s.id, { revision: s.revision, requestId })).duplicate, true); await done;
  s = store.read(s.id); const scope = scopeHash(s.values, project); s = store.update(s.id, 'brief', 'Changed scope', s.revision);
  await assert.rejects(app.begin(s.id, { action: 'build', revision: s.revision, requestId: randomUUID(), scope }), /scope changed/);
  assert.equal(fs.readdirSync(project).join(), 'README.md');
});
test('restart exposes uncertainty without executing or resubmitting', () => {
  const { store } = fixture(); const s = store.create(); const m = s.meta; m.status = 'question'; m.providers = { codex: { id: 'known-provider-session' } }; m.pending = { kind: 'question', questions: [{ question: 'What matters?' }] }; m.requests = ['prior-id']; store.setMeta(s.id, m); const next = new Workspace(store);
  assert.equal(store.meta(s.id).status, 'uncertain'); assert.equal(store.meta(s.id).pending.questions[0].question, 'What matters?'); assert.deepEqual(store.meta(s.id).requests, ['prior-id']); assert.equal(next.active, null);
  next.acknowledge(s.id); assert.deepEqual(store.meta(s.id).providers, {}); assert.equal(store.meta(s.id).mode, 'interview');
});
test('Pause interrupts generation and preserves submitted text', async () => {
  process.env.RELENTLESS_TEST = '1'; const { store, app } = fixture(); const s = store.create({ backend: 'mock' }); await app.begin(s.id, { action: 'continue', text: 'Help me think through this.', revision: s.revision, requestId: randomUUID() }); const done = app.active.done; app.pause(s.id); await done; assert.equal(store.meta(s.id).status, 'paused'); assert.match(store.read(s.id).values.conversation, /Help me think/);
});
test('eleven worklist items remain independent and reorder without losing sessions', () => {
  const { store } = fixture(); const items = Array.from({ length: 11 }, (_, i) => { const s = store.create({ title: `SYNTHETIC item ${i + 1}`, context: `Only item ${i + 1}` }); return { id: randomUUID(), title: s.meta.title, session: s.id }; }); store.saveWorklist(items, hash('[]')); const old = store.worklist(); store.saveWorklist([...old].reverse(), hash(JSON.stringify(old)));
  assert.equal(store.worklist()[0].title, 'SYNTHETIC item 11'); assert.equal(new Set(store.worklist().map(i => i.session)).size, 11); assert.equal(store.read(items[0].session).values.brief, 'Only item 1');
});
test('session traversal and symlinks rejected, project roots constrained', () => {
  const { store, root } = fixture(); assert.throws(() => store.read('../private')); const s = store.create(); fs.unlinkSync(s.path); fs.symlinkSync(path.join(root, 'project/README.md'), s.path); assert.throws(() => store.read(s.id), /symlinks/); assert.throws(() => projectPath('/')); assert.throws(() => projectPath(store.root, [store.root]));
});
test('Tune reject is pure for rules, preference acceptance versioned and stale method refused', () => {
  const { store, app } = fixture(); const s = store.create(); const p = protocol(); const m = s.meta;
  const proposals = [{ scope: 'method', before: 'text', after: 'replacement' }, { scope: 'preference', after: 'Use concrete examples.' }, { scope: 'method', before: 'text', after: 'replacement' }], encoded = JSON.stringify(proposals);
  store.append(s.id, 'Tune review', '```relentless-tune\n' + encoded + '\n```');
  m.tune = { version: p.version, preferenceVersion: app.preferences().version, sourceHash: hash(encoded), proposals: ['reject', 'preference', 'stale'].map(id => ({ id, status: 'proposed' })) }; store.setMeta(s.id, m);
  app.tuneDecision(s.id, { proposalId: 'reject', decision: 'reject' }); assert.equal(protocol().version, p.version);
  app.tuneDecision(s.id, { proposalId: 'preference', decision: 'accept' }); assert.equal(app.preferences().text, 'Use concrete examples.'); assert.ok(fs.readdirSync(path.join(store.root, 'history')).some(f => f.startsWith('preferences-')));
  assert.throws(() => app.tuneDecision(s.id, { proposalId: 'stale', decision: 'accept', version: 'wrong' }), /changed since review/);
});
