import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = process.cwd();
for (const dir of ['src', 'bin', 'scripts', 'public']) if (fs.existsSync(dir)) {
  for (const file of fs.readdirSync(dir).filter(f => /\.(mjs|js)$/.test(f))) execFileSync(process.execPath, ['--check', path.join(dir, file)]);
}
for (const skill of ['relentless', 'tune', 'sprint-prompt']) {
  const text = fs.readFileSync(path.join(root, 'skills', skill, 'SKILL.md'), 'utf8');
  assert.ok(text.startsWith(`---\nname: ${skill}\n`));
  assert.ok(text.includes('disable-model-invocation: true'));
  assert.ok(!text.includes('\u2014'), 'User-facing skills must avoid em dashes.');
  assert.ok(fs.readFileSync(path.join(root, 'skills', skill, 'agents/openai.yaml'), 'utf8').includes('allow_implicit_invocation: false'));
}
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
console.log('JavaScript syntax, skill metadata, and whitespace checks passed. Behavioral quality requires live evaluation.');
