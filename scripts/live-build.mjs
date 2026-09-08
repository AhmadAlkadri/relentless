import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Store, scopeHash } from '../src/storage.mjs';
import { Workspace } from '../src/service.mjs';
import { repo } from '../src/protocol.mjs';
const backend = process.argv[2]; if (!['codex', 'claude'].includes(backend)) throw new Error('Choose codex or claude explicitly.');
const root = fs.mkdtempSync(path.join(os.tmpdir(), `relentless-build-${backend}-`)); const project = path.join(root, 'project'); fs.mkdirSync(project); fs.writeFileSync(path.join(project, 'README.md'), 'Synthetic approval fixture.');
const store = new Store(path.join(root, 'private'), repo), app = new Workspace(store); let s = store.create({ title: 'SYNTHETIC Build and Tune', project, backend, context: 'Create exactly hello.txt with the text hello relentless followed by a newline. Check its content. This disposable fixture intentionally has no Git repository; do not initialize or commit. No other changes.' });
console.log(`Fixture ${root}\nSession ${s.id}`);
async function run(action, text = '') {
  s = store.read(s.id); await app.begin(s.id, { action, text, revision: s.revision, scope: scopeHash(s.values, s.meta.project), requestId: randomUUID() }); const active = app.active;
  const timer = setInterval(() => {
    const p = active.pending?.display;
    if (p) {
      const input = JSON.stringify(p.input || {});
      const allow = action === 'build' && p.kind === 'approval' && input.includes('hello.txt') && !/rm |curl |wget |sudo|chmod|\.ssh/.test(input);
      console.log(`INTERACTION ${p.kind} ${p.tool || ''} allowed=${allow}`);
      app.answer(s.id, { kind: p.kind, pendingId: p.id, allow, answers: p.kind === 'question' ? Object.fromEntries(p.questions.map(q => [q.id, 'The exact hello.txt task in the brief is agreed.'])) : undefined });
    }
  }, 200);
  const timeout = setTimeout(() => app.pause(s.id), 180000);
  await active.done; clearInterval(timer); clearTimeout(timeout); s = store.read(s.id);
  console.log(JSON.stringify({ action, status: s.meta.status, error: s.meta.error, reply: s.values.conversation.slice(-3000), proposals: s.meta.tune?.proposals }, null, 2));
  assert.notEqual(s.meta.status, 'uncertain');
}
await run('continue', 'Please implement the hello.txt task. This is an interview answer describing the intended change, not a Build control.');
assert.equal(fs.existsSync(path.join(project, 'hello.txt')), false, 'Action language must not write in interview');
await run('build');
assert.equal(fs.readFileSync(path.join(project, 'hello.txt'), 'utf8'), 'hello relentless\n');
assert.deepEqual(fs.readdirSync(project).sort(), ['README.md', 'hello.txt']);
await run('tune', 'Synthetic feedback: the explicit distinction between my answer and Build was useful. I prefer concise questions and concrete examples. Review this experience without inventing friction.');
console.log(`LIVE BUILD AND TUNE PASSED ${backend}. Retained fixture: ${root}`);
