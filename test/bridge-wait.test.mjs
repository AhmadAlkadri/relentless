import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startServer } from '../src/server.mjs';
import { api } from '../src/connection.mjs';

async function fixture(t, bridgeWaitMs = 30) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-wait-http-'));
  const project = path.join(root, 'synthetic project'); fs.mkdirSync(project);
  const s = await startServer({ root: path.join(root, 'private'), bridgeWaitMs });
  t.after(async () => { await s.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const owner = randomUUID();
  const bridge = (operation, body, signal = AbortSignal.timeout(2000)) => api(s, `bridge/${operation}`, { owner, ...body }, { bridge: true, signal });
  const opened = await bridge('open_interview', { cwd: project, client: 'codex', title: 'SYNTHETIC bounded HTTP wait' });
  const session = opened.session;
  const snapshot = await bridge('publish_interview', { session, publicationId: randomUUID(), discussion: 'Synthetic interview context.', questions: [{ id: 'scope', question: 'Which bounded outcome?' }] });
  const answer = () => api(s, `sessions/${session}/answer`, { pendingId: snapshot.question.id, questionRevision: snapshot.question.contentRevision, kind: 'question', answers: { scope: 'Inspect only the synthetic target.' } });
  return { s, session, bridge, snapshot, answer };
}

test('HTTP default and maximum waits expire as pending, then resume the same question and exact Build once', async t => {
  const f = await fixture(t), { session, bridge } = f;
  for (const body of [{ session }, { session, waitMs: 1500000 }]) {
    const pending = await bridge('await_interview', body);
    assert.equal(pending.operation, 'pending'); assert.equal(pending.authorized, false);
    assert.deepEqual(await bridge('attachment_status', { session }), f.snapshot);
  }
  assert.equal(f.s.app.attachments.waiters.size, 0);
  const submitted = await f.answer();
  const answer = await bridge('await_interview', { session });
  assert.equal(answer.operation, 'answer'); assert.equal(answer.authorized, false); assert.equal(answer.eventId, submitted.event);
  assert.equal(answer.attachment, f.snapshot.attachment); assert.equal(answer.target, f.snapshot.target);
  assert.match(answer.publicContext, /Inspect only the synthetic target/);
  assert.equal((await bridge('await_interview', { session, acknowledge: answer.eventId, waitMs: 1 })).operation, 'pending');
  assert.equal((await bridge('await_interview', { session })).operation, 'pending', 'acknowledged answer is not redelivered');
  const source = await bridge('attachment_status', { session });
  const prompt = '# Synthetic scope\nInspect only the synthetic target. No changes.';
  const ready = await bridge('publish_interview', { session, publicationId: randomUUID(), prompt, sourceRevision: source.contextRevision, exchanges: source.exchanges, ready: true });
  await assert.rejects(api(f.s, `sessions/${session}/turn`, { action: 'build', requestId: randomUUID(), target: '/wrong-target', promptRevision: ready.prompt.revision }), /target or prompt revision/);
  await api(f.s, `sessions/${session}/turn`, { action: 'build', requestId: randomUUID(), target: ready.target, promptRevision: ready.prompt.revision });
  const build = await bridge('await_interview', { session });
  assert.equal(build.operation, 'build'); assert.equal(build.role, 'control'); assert.equal(build.authorized, true);
  assert.equal(build.prompt, prompt); assert.equal(build.promptRevision, ready.prompt.revision); assert.equal(build.target, ready.target);
  const uncertain = await bridge('await_interview', { session });
  assert.equal(uncertain.operation, 'handback-uncertain'); assert.equal(uncertain.authorized, false); assert.equal(uncertain.eventId, build.eventId);
  const finished = await bridge('await_interview', { session, acknowledge: build.eventId, waitMs: 1 });
  assert.equal(finished.operation, 'finished'); assert.equal(finished.state, 'built'); assert.equal(finished.authorized, false);
  const after = await bridge('await_interview', { session });
  assert.equal(after.operation, 'pending'); assert.equal(after.authorized, false);
  const events = f.s.store.meta(session).attachment.events;
  assert.equal(events.length, 2); assert.ok(events.every(e => e.delivered && e.ack));
  assert.equal(f.s.app.active, null);
});

async function waitFor(condition) {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'HTTP wait did not reach the expected server state');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

test('cancelling an HTTP wait releases the waiter without ending or consuming the interview', async t => {
  const f = await fixture(t, 1000), { session, bridge } = f;
  const controller = new AbortController();
  const waiting = bridge('await_interview', { session }, controller.signal);
  const rejected = assert.rejects(waiting, { name: 'AbortError' });
  await waitFor(() => f.s.app.attachments.waiters.has(session));
  controller.abort(); await rejected;
  await waitFor(() => !f.s.app.attachments.waiters.has(session));
  assert.deepEqual(await bridge('attachment_status', { session }), f.snapshot);
  assert.deepEqual(f.s.store.meta(session).attachment.events, []);
  const continued = bridge('await_interview', { session });
  await waitFor(() => f.s.app.attachments.waiters.has(session));
  const submitted = await f.answer(), answer = await continued;
  assert.equal(answer.operation, 'answer'); assert.equal(answer.authorized, false); assert.equal(answer.eventId, submitted.event);
  assert.equal(answer.attachment, f.snapshot.attachment);
  await bridge('await_interview', { session, acknowledge: answer.eventId, waitMs: 1 });
  assert.equal(f.s.app.attachments.waiters.size, 0);
});
