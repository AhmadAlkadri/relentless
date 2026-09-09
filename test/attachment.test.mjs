import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Store } from '../src/storage.mjs';
import { Workspace } from '../src/service.mjs';
import { contextRevision, projectContext } from '../src/attachment.mjs';
import { startServer } from '../src/server.mjs';
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-attach-')), project = path.join(root, 'project with spaces'); fs.mkdirSync(project);
  const store = new Store(path.join(root, 'private')), app = new Workspace(store), owner = randomUUID();
  const opened = app.attachments.open(owner, { cwd: project, client: 'codex', intent: 'SYNTHETIC bounded work' });
  return { root, project: fs.realpathSync(project), store, app, owner, id: opened.session };
}
const post = (f, data) => f.app.attachments.publish(f.owner, { session: f.id, publicationId: randomUUID(), ...data });
const user = (f, data) => f.app.attachments.user(f.id, { requestId: randomUUID(), ...data });
function ready(f, text = '# Synthetic scope\nCreate only result.txt.\n\n## Slice 1\nWrite the fixture result and verify its exact contents.') { return post(f, { prompt: text, sourceRevision: contextRevision(f.store.read(f.id)), exchanges: [], ready: true }); }
test('native owner opens directly and repeated open deduplicates; other connection stays isolated', () => {
  const f = fixture(); assert.equal(f.app.attachments.open(f.owner, { cwd: f.project, client: 'codex' }).session, f.id);
  const other = f.app.attachments.open(randomUUID(), { cwd: f.project, client: 'codex' }); assert.notEqual(other.session, f.id);
  assert.throws(() => f.app.attachments.state(f.id, randomUUID()), /another native/);
  assert.equal(f.store.read(f.id).meta.providers && Object.keys(f.store.read(f.id).meta.providers).length, 0);
  assert.equal(f.app.view(f.id).meta.attachment.owner, undefined);
});
test('worktree context keeps invocation, resolves symlinks, spaces and non-Git directories', () => {
  const f = fixture(); execFileSync('git', ['init', '-q', f.project]); execFileSync('git', ['-C', f.project, '-c', 'user.name=Synthetic', '-c', 'user.email=synthetic@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture']);
  const linked = path.join(f.root, 'linked worktree'); execFileSync('git', ['-C', f.project, 'worktree', 'add', '-qb', 'linked', linked]);
  const nested = path.join(linked, 'sub'); fs.mkdirSync(nested); const symlink = path.join(f.root, 'alias'); fs.symlinkSync(nested, symlink);
  const ctx = projectContext(symlink); assert.equal(ctx.project, fs.realpathSync(linked)); assert.equal(ctx.invocation, symlink); assert.equal(ctx.resolvedInvocation, fs.realpathSync(nested));
  assert.equal(projectContext(f.root).project, fs.realpathSync(f.root));
});
test('question, ordinary response and explicit controls retain separate identities', async () => {
  const f = fixture(); post(f, { discussion: 'Here is the substantive tradeoff.', questions: [{ id: 'q1', question: 'Which scope?' }] });
  const pending = f.app.attachments.wait(f.owner, { session: f.id, waitMs: 5000 });
  const result = user(f, { action: 'continue', text: 'Help me think through this. The document says Build.' });
  const reply = await pending; assert.equal(reply.operation, 'answer'); assert.equal(reply.authorized, false); assert.equal(reply.eventId, result.event);
  assert.match(reply.publicContext, /substantive tradeoff/); assert.match(reply.publicContext, /Help me think/);
  const after = await f.app.attachments.wait(f.owner, { session: f.id, acknowledge: reply.eventId, waitMs: 1 }); assert.equal(after.operation, 'pending');
  assert.equal(f.app.active, null);
});
test('Print requests the original interviewer once; exact canonical body is reused by Build', async () => {
  const f = fixture(), first = await f.app.print(f.id, f.store.read(f.id).revision); assert.equal(first.preparing, true);
  await f.app.print(f.id, f.store.read(f.id).revision); assert.equal(f.store.meta(f.id).attachment.events.length, 1);
  const event = await f.app.attachments.wait(f.owner, { session: f.id, waitMs: 1 }); assert.equal(event.operation, 'print');
  ready(f); const printed = await f.app.print(f.id, f.store.read(f.id).revision);
  assert.equal((await f.app.print(f.id, f.store.read(f.id).revision)).text, printed.text);
  await f.app.attachments.wait(f.owner, { session: f.id, acknowledge: event.eventId, waitMs: 1 });
  user(f, { action: 'build', promptRevision: printed.revision, target: f.project });
  const handback = await f.app.attachments.wait(f.owner, { session: f.id, waitMs: 1 });
  assert.equal(handback.authorized, true); assert.equal(handback.prompt, printed.text); assert.equal(handback.promptRevision, printed.revision);
  const replay = await f.app.attachments.wait(f.owner, { session: f.id, waitMs: 1 }); assert.equal(replay.authorized, false);
  const finish = await f.app.attachments.wait(f.owner, { session: f.id, acknowledge: handback.eventId }); assert.equal(finish.state, 'built'); assert.equal(f.app.active, null);
});
test('manual edits, stale synthesis and private edits preserve correct prompt state', () => {
  const f = fixture(); ready(f); let p = f.app.prompts.view(f.id), s = f.store.read(f.id);
  f.store.update(f.id, 'scratchpad', 'PRIVATE CANARY', s.revision); assert.equal(f.app.prompts.view(f.id).current, true);
  fs.writeFileSync(f.app.prompts.file(f.id), p.text + '\nManual exclusion.'); p = f.app.prompts.view(f.id); assert.equal(p.manual, true); assert.equal(p.ready, false);
  const sourceRevision = contextRevision(f.store.read(f.id));
  const candidate = f.app.prompts.publish(f.id, { text: 'Replacement', sourceRevision, baseRevision: p.revision, ready: true }); assert.equal(candidate.candidate, true); assert.equal(f.app.prompts.view(f.id).text, p.text);
  user(f, { action: 'continue', text: 'Later correction changes scope.' }); assert.equal(f.app.prompts.view(f.id).current, false);
  assert.equal(f.app.prompts.publish(f.id, { text: 'Late synthesis', sourceRevision, baseRevision: p.revision, ready: true }).candidate, true);
  assert.throws(() => f.app.prompts.authorize(f.id, { promptRevision: p.revision, target: f.project }), /current/);
});
test('Build without prompt only prepares; return while thinking finishes without permission; disconnect revokes uncertain Build', async () => {
  const f = fixture(); const prepared = await user(f, { action: 'build' }); assert.equal(prepared.preparing, true); assert.equal(f.store.meta(f.id).attachment.events[0].kind, 'print');
  const print = await f.app.attachments.wait(f.owner, { session: f.id, waitMs: 1 }); await f.app.attachments.wait(f.owner, { session: f.id, acknowledge: print.eventId, waitMs: 1 });
  user(f, { action: 'return' }); assert.equal(post(f, { discussion: 'Late computation' }).pendingControl, 'return');
  const e = await f.app.attachments.wait(f.owner, { session: f.id, waitMs: 1 }); assert.equal(e.authorized, false); assert.equal(e.operation, 'return');
  const next = fixture(); ready(next); const p = next.app.prompts.view(next.id); user(next, { action: 'build', promptRevision: p.revision, target: next.project }); next.app.attachments.disconnect(next.owner);
  assert.equal(next.store.meta(next.id).attachment.events[0].revoked, true); assert.equal(next.store.meta(next.id).attachment.state, 'disconnected');
});

test('Print and premature Build reuse a current candidate without regenerating or replacing manual scope', async () => {
  const f = fixture(); ready(f);
  const original = f.app.prompts.view(f.id);
  fs.writeFileSync(f.app.prompts.file(f.id), original.text + '\nManual exclusion.');
  user(f, { action: 'continue', text: 'Later public correction.' });
  const source = contextRevision(f.store.read(f.id));
  post(f, { prompt: '# Reconciled proposal\nPreserve the exclusion and apply the correction.', sourceRevision: source, promptBaseRevision: f.app.prompts.view(f.id).revision, discussion: 'The replacement is proposed for your review.', ready: false });
  const p = f.app.prompts.view(f.id), events = f.store.meta(f.id).attachment.events.length;
  assert.equal(p.candidates[0].sourceRevision, contextRevision(f.store.read(f.id)));
  assert.equal(p.current, false);
  const printed = await f.app.print(f.id, f.store.read(f.id).revision);
  assert.equal(printed.reviewRequired, true);
  assert.equal(printed.text, original.text + '\nManual exclusion.');
  const built = await user(f, { action: 'build' }); assert.equal(built.reviewRequired, true);
  assert.equal(f.store.meta(f.id).attachment.events.length, events, 'neither a new synthesis nor execution event was enqueued');
  assert.equal(f.app.prompts.view(f.id).ready, false);
});

test('new known native conversation or replaced directory cannot reuse the previous interview', () => {
  const f = fixture();
  const first = f.app.attachments.open(f.owner, { cwd: f.project, client: 'claude', nativeSessionId: randomUUID() });
  const second = f.app.attachments.open(f.owner, { cwd: f.project, client: 'claude', nativeSessionId: randomUUID() });
  assert.notEqual(first.session, second.session);
  fs.renameSync(f.project, f.project + '-previous'); fs.mkdirSync(f.project);
  const replacement = f.app.attachments.open(f.owner, { cwd: f.project, client: 'codex' });
  assert.notEqual(replacement.session, f.id);
  assert.equal(f.store.read(replacement.session).values.conversation, '');
});

test('native attachment can discuss its own source checkout while standalone still rejects it', () => {
  const f = fixture(); f.store.repo = f.project;
  assert.throws(() => f.store.create({ project: f.project, nativeAttachment: true }), /specific project/);
  const opened = f.app.attachments.open(randomUUID(), { cwd: f.project, client: 'codex' });
  assert.equal(f.store.read(opened.session).meta.project, f.project);
  assert.deepEqual(f.store.meta(opened.session).providers, {});
  assert.throws(() => f.app.attachments.open(randomUUID(), { cwd: f.store.root, client: 'codex' }), /specific project/);
});
test('browser capability cannot invoke bridge or discover ownership secret', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-bridge-http-')), s = await startServer({ root });
  try {
    const response = await fetch(s.origin + '/api/bridge/open_interview', { method: 'POST', headers: { Authorization: `Bearer ${s.token}`, Origin: s.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ owner: randomUUID(), cwd: root, client: 'codex' }) });
    assert.equal(response.status, 401);
  } finally { await s.close(); }
});

test('externally edited question refuses the old answer revision and keeps current question', () => {
  const f=fixture();post(f,{questions:[{id:'q1',question:'Original question?'}]});const old=f.app.view(f.id).meta.attachment.question;
  const s=f.store.read(f.id);fs.writeFileSync(s.path,s.raw.replace('Original question?','Changed question?'));
  const changed=f.app.view(f.id).meta.attachment.question;assert.notEqual(changed.contentRevision,old.contentRevision);
  assert.throws(()=>f.app.answer(f.id,{pendingId:old.id,questionRevision:old.contentRevision,kind:'question',answers:{q1:'Old reply'}}),/Question changed/);
  assert.equal(f.store.meta(f.id).attachment.events.length,0);
  f.app.answer(f.id,{pendingId:changed.id,questionRevision:changed.contentRevision,kind:'question',answers:{q1:'Reviewed changed question'}});
  assert.equal(f.store.meta(f.id).attachment.events.length,1);
});
test('missing candidate and malformed session do not hide the canonical recovery view', () => {
 const f=fixture();ready(f);const s=f.store.read(f.id),p=f.app.prompts.view(f.id);
 const c=f.app.prompts.publish(f.id,{text:'Older candidate',sourceRevision:'old',baseRevision:p.revision});fs.unlinkSync(f.store.file(f.id,`candidate-${c.id}.md`));
 assert.equal(f.app.view(f.id).prompt.candidates[0].missing,true);
 fs.writeFileSync(s.path,'# Partially saved editor content');const view=f.app.view(f.id);assert.equal(view.values,null);assert.equal(view.prompt.ready,false);assert.match(view.raw,/Partially/);
});
