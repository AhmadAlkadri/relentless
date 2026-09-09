import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, hash, renderDocument, parseDocument, replaceSection, publicContext, scopeHash, projectPath } from '../src/storage.mjs';
import { control, protocol } from '../src/protocol.mjs';
import { Workspace, preferenceChange } from '../src/service.mjs';
import { randomUUID } from 'node:crypto';
import { contextRevision } from '../src/attachment.mjs';
import { providers } from '../src/providers.mjs';

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
test('private draft and scratchpad never enter public context; Print reuses the canonical prompt', async () => {
  const { store, app, project } = fixture(); let s = store.create({ project }); s = store.update(s.id, 'draft', 'PRIVATE DRAFT', s.revision); s = store.update(s.id, 'scratchpad', 'PRIVATE SCRATCH', s.revision);
  app.prompts.publish(s.id, { text: '# Acceptance evidence\nSynthetic useful prompt.', sourceRevision: contextRevision(s), ready: false });
  const before = fs.readFileSync(s.path), metadata = fs.readFileSync(store.file(s.id, 'json')), skill = protocol().version, pref = app.preferences().version;
  const result = await app.print(s.id, s.revision);
  assert.ok(!result.text.includes('PRIVATE')); assert.ok(!publicContext(s.values).includes('PRIVATE')); assert.match(result.text, /Acceptance evidence/);
  assert.deepEqual(fs.readFileSync(s.path), before); assert.deepEqual(fs.readFileSync(store.file(s.id, 'json')), metadata); assert.equal(protocol().version, skill); assert.equal(app.preferences().version, pref); assert.equal(fs.readFileSync(path.join(project, 'README.md'), 'utf8'), 'Synthetic project');
});
test('duplicate submission, stale Build and quoted action remain separate', async () => {
  process.env.RELENTLESS_TEST = '1'; const { store, app, project } = fixture(); let s = store.create({ project, backend: 'mock' }); const requestId = randomUUID();
  await app.begin(s.id, { action: 'continue', text: 'Build the entire thing. This is my desired outcome.', revision: s.revision, requestId }); const done = app.active.done;
  assert.equal(store.meta(s.id).mode, 'interview'); assert.equal((await app.begin(s.id, { revision: s.revision, requestId })).duplicate, true); await done;
  s = store.read(s.id); const scope = scopeHash(s.values, s.meta.project); s = store.update(s.id, 'brief', 'Changed scope', s.revision);
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
test('new preference preserves existing text and exact edits replace narrowly', () => {
  assert.equal(preferenceChange('Keep examples concrete.', 'No stored preference', 'Keep questions concise.'), 'Keep examples concrete.\n\nKeep questions concise.');
  assert.equal(preferenceChange('Keep examples concrete. Ask when consequential.', 'Ask when consequential.', 'Ask only when consequential.'), 'Keep examples concrete. Ask only when consequential.');
});
test('every saved execution-packet field invalidates scope, private writing does not', () => {
  const values = parseDocument(renderDocument('Synthetic', { brief: 'Agreed task' })); const original = scopeHash(values, '/synthetic/project');
  for (const key of ['brief', 'decisions', 'facts', 'assumptions', 'questions']) assert.notEqual(scopeHash({ ...values, [key]: 'Changed context' }, '/synthetic/project'), original);
  for (const key of ['draft', 'scratchpad', 'conversation']) assert.equal(scopeHash({ ...values, [key]: 'Private or unaccepted text' }, '/synthetic/project'), original);
});
test('interview refuses a replaced project identity without sending a turn', async () => {
  const { store, app, project, root } = fixture(); const s = store.create({ project, backend: 'mock' }); fs.renameSync(project, path.join(root, 'old-project')); fs.mkdirSync(project);
  await assert.rejects(app.begin(s.id, { action: 'interview', revision: s.revision, requestId: randomUUID() }), /changed identity/); assert.equal(app.active, null); assert.equal(store.meta(s.id).requests.length, 0);
});
async function waitFor(check) { for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(resolve => setImmediate(resolve)); } throw new Error('Expected interaction did not appear'); }
test('parallel provider requests serialize and preserve externally edited questions', async t => {
  const original = providers.mock; t.after(() => { providers.mock = original; });
  const { store, app } = fixture(); const s = store.create({ backend: 'mock' });
  providers.mock = async ({ interact }) => {
    const latest = store.read(s.id); store.update(s.id, 'questions', 'USER EDIT DURING TURN', latest.revision);
    const results = await Promise.all([1, 2].map(i => interact({ kind: 'question', questions: [{ id: String(i), question: `Question ${i}` }] })));
    assert.deepEqual(results.map(x => x.answers), [{ '1': 'First answer' }, { '2': 'Help me think through this' }]);
    return { text: 'Follow-up complete.' };
  };
  await app.begin(s.id, { action: 'interview', revision: s.revision, requestId: randomUUID() }); const done = app.active.done;
  await waitFor(() => app.active.pending); const first = app.active.pending.display;
  assert.equal(first.questions[0].id, '1'); assert.equal(store.read(s.id).values.questions, 'USER EDIT DURING TURN');
  app.answer(s.id, { pendingId: first.id, kind: 'question', answers: { '1': 'First answer' } });
  await waitFor(() => app.active.pending); const second = app.active.pending.display;
  assert.equal(second.questions[0].id, '2'); assert.notEqual(second.id, first.id);
  app.answer(s.id, { pendingId: second.id, kind: 'question', answers: { '2': 'Help me think through this' } });
  await done; assert.equal(app.active, null); assert.equal(store.meta(s.id).status, 'idle'); assert.equal(store.read(s.id).values.questions, 'USER EDIT DURING TURN');
});
test('Pause rejects active and queued provider questions without stranded callbacks', async t => {
  const original = providers.mock; t.after(() => { providers.mock = original; }); let results;
  providers.mock = async ({ interact }) => { results = await Promise.allSettled([1, 2].map(i => interact({ kind: 'question', questions: [{ id: String(i), question: `Question ${i}` }] }))); return { text: 'Paused safely.' }; };
  const { store, app } = fixture(); const s = store.create({ backend: 'mock' });
  await app.begin(s.id, { action: 'interview', revision: s.revision, requestId: randomUUID() }); const done = app.active.done;
  await waitFor(() => app.active.pending); app.pause(s.id); await done;
  assert.deepEqual(results.map(x => x.status), ['rejected', 'rejected']); assert.equal(app.active, null); assert.equal(store.meta(s.id).status, 'paused');
});
test('an execution question records the exchange without mutating authorized scope', async t => {
  const original = providers.mock; t.after(() => { providers.mock = original; });
  providers.mock = async ({ interact }) => { await interact({ kind: 'question', questions: [{ id: 'detail', question: 'Clarify this bounded detail?' }] }); return { text: 'Scope preserved.' }; };
  const { store, app, project } = fixture(); const s = store.create({ backend: 'mock', project }); const scope = scopeHash(s.values, s.meta.project);
  app.prompts.publish(s.id, { text: '# Synthetic scope\nClarify a bounded detail.', sourceRevision: contextRevision(s), ready: true });
  await app.begin(s.id, { action: 'build', revision: s.revision, scope, promptRevision: app.prompts.view(s.id).revision, target: s.meta.project, requestId: randomUUID() }); const done = app.active.done;
  await waitFor(() => app.active.pending); assert.equal(scopeHash(store.read(s.id).values, s.meta.project), scope);
  app.answer(s.id, { pendingId: app.active.pending.display.id, kind: 'question', answers: { detail: 'Keep the agreed default.' } }); await done;
  assert.equal(store.meta(s.id).status, 'idle'); assert.equal(scopeHash(store.read(s.id).values, s.meta.project), scope);
});

test('editing the canonical prompt revokes a pending standalone Build approval', async t => {
  const original = providers.mock; t.after(() => { providers.mock = original; });
  let approved = false;
  providers.mock = async ({ interact }) => { const result = await interact({ kind: 'approval', command: 'synthetic fixture write' }); approved = result.allow; return { text: 'Complete.' }; };
  const { store, app, project } = fixture(); const s = store.create({ backend: 'mock', project });
  app.prompts.publish(s.id, { text: '# Agreed fixture scope\nWrite one local result.', sourceRevision: contextRevision(s), ready: true });
  await app.begin(s.id, { action: 'build', revision: s.revision, scope: scopeHash(s.values, s.meta.project), promptRevision: app.prompts.view(s.id).revision, target: s.meta.project, requestId: randomUUID() });
  const done = app.active.done; await waitFor(() => app.active.pending);
  fs.writeFileSync(app.prompts.file(s.id), '# Edited scope\nA different result.');
  assert.throws(() => app.answer(s.id, { pendingId: app.active.pending.display.id, kind: 'approval', allow: true }), /scope changed/);
  await done;
  assert.equal(approved, false); assert.equal(store.meta(s.id).status, 'paused');
});
