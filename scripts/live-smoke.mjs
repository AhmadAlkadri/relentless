// Explicit opt-in, authenticated synthetic provider check. Never runs in npm test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store, scopeHash } from '../src/storage.mjs';
import { Workspace } from '../src/service.mjs';
import { repo } from '../src/protocol.mjs';

const backend = process.argv[2];
if (!['codex', 'claude'].includes(backend)) throw new Error('Usage: node scripts/live-smoke.mjs codex|claude');
const root = fs.mkdtempSync(path.join(os.tmpdir(), `relentless-live-${backend}-`));
const project = path.join(root, 'synthetic-project'); fs.mkdirSync(project); fs.writeFileSync(path.join(project, 'README.md'), '# Synthetic note sorter\nA personal plain text note sorter. No implementation yet.\n');
const store = new Store(path.join(root, 'private'), repo); let app = new Workspace(store);
let s = store.create({ backend, project, title: `SYNTHETIC ${backend} dogfood`, context: 'I want a tiny note sorter for myself. I care about understanding the next useful step. Inspect README.md before asking. This is a synthetic test, not personal data.' });
async function turn(action, text = '') {
  s = store.read(s.id); console.log(`START ${backend} ${action}`);
  await app.begin(s.id, { action, text, revision: s.revision, requestId: randomUUID(), scope: scopeHash(s.values, project) });
  const interval = setInterval(() => {
    const p = app.active?.pending?.display;
    if (p) app.answer(s.id, { pendingId: p.id, kind: p.kind, answers: p.kind === 'question' ? Object.fromEntries(p.questions.map(q => [q.id, 'Help me think through this with a concrete small example.'])) : undefined, allow: false });
  }, 200);
  const timeout = setTimeout(() => app.pause(s.id), 180000);
  await app.active.done; clearInterval(interval); clearTimeout(timeout); s = store.read(s.id);
  console.log(JSON.stringify({ status: s.meta.status, error: s.meta.error, provider: s.meta.providers, reply: s.values.conversation.slice(-4500) }, null, 2));
  if (s.meta.status === 'uncertain') throw new Error(s.meta.error);
}
console.log(`Fixture: ${root}\nSession: ${s.id}`);
await turn('interview');
// An external editor changes the actual Markdown. Saving alone makes no request.
s = store.update(s.id, 'draft', 'Help me think through this. I want to sort notes into a few plain folders and keep originals untouched. No accounts or complex taxonomy.', s.revision);
app = new Workspace(store); // New app owner resumes the persisted provider session.
await turn('continue');
await turn('summary');
const before = store.read(s.id).raw; const handoff = app.print(s.id, store.read(s.id).revision); if (store.read(s.id).raw !== before) throw new Error('Print mutated Markdown'); console.log(`PRINT ${handoff.text.length} characters, canonical Markdown unchanged`);
console.log(`LIVE CHECK COMPLETE ${backend}. Fixture retained at ${root}`);
