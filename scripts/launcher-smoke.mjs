// Verify the installed command from a fresh login shell, outside this repository.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-launcher-')));
const run = command => execFileSync('/bin/zsh', ['-lc', command], { cwd: '/tmp', env: { ...process.env, RELENTLESS_HOME: root }, encoding: 'utf8' }).trim();
async function stopped(origin) { for (let i = 0; i < 100; i++) { try { await fetch(origin, { signal: AbortSignal.timeout(250) }); } catch { return; } await new Promise(r => setTimeout(r, 100)); } throw new Error('Server did not stop'); }
console.log(`Installed command: ${run('command -v relentless')}`);
let state;
try {
  run('relentless --no-open'); state = JSON.parse(fs.readFileSync(path.join(root, 'server.json')));
  const result = run('relentless new --title "SYNTHETIC launcher fixture" --backend codex --no-open');
  const id = result.match(/session=([a-f0-9-]{36})/)[1];
  assert.equal(run(`relentless path ${id}`), path.join(root, 'sessions', `${id}.md`));
  const before = fs.readFileSync(path.join(root, 'sessions', `${id}.md`));
  assert.ok(run(`relentless print ${id}`).includes('Acceptance evidence')); assert.deepEqual(fs.readFileSync(path.join(root, 'sessions', `${id}.md`)), before);
  assert.ok(run(`relentless portable ${id}`).includes('Do not interview the user instead of thinking'));
  run(`relentless resume ${id} --no-open`); run('relentless stop'); await stopped(state.origin);
  run(`relentless resume ${id} --no-open`); const resumed = JSON.parse(fs.readFileSync(path.join(root, 'server.json')));
  assert.equal(resumed.origin, state.origin); assert.notEqual(resumed.token, state.token);
  run('relentless stop'); await stopped(resumed.origin);
  console.log(`PASS installed launch/new/path/Print/portable/resume/stop/restart from /tmp. Synthetic data retained: ${root}`);
} finally { if (fs.existsSync(path.join(root, 'server.json'))) try { run('relentless stop'); } catch {} }
