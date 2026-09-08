import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { startServer } from '../src/server.mjs';
import { safeClaudePath, codexConfig } from '../src/providers.mjs';
import { replaceSection, renderDocument, parseDocument } from '../src/storage.mjs';

test('server rejects unauthenticated, cross-origin, wrong-host, and traversal requests', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-http-'));
  const s = await startServer({ root });
  try {
    const good = { Authorization: `Bearer ${s.token}`, Origin: s.origin, 'Content-Type': 'application/json' };
    assert.equal((await fetch(s.origin + '/api/state')).status, 401);
    assert.equal((await fetch(s.origin + '/api/state', { headers: { ...good, Origin: 'https://evil.example' } })).status, 403);
    const wrongHost = await new Promise(resolve => { const request = http.get(s.origin + '/api/state', { headers: { ...good, Host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); }); request.on('error', () => resolve(0)); });
    assert.equal(wrongHost, 403);
    assert.equal((await fetch(s.origin + '/api/new', { method: 'POST', headers: { Authorization: good.Authorization, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.equal((await fetch(s.origin + '/api/sessions/%2e%2e%2fsecret', { headers: good })).status, 404);
    const created = await fetch(s.origin + '/api/new', { method: 'POST', headers: good, body: JSON.stringify({ title: 'SYNTHETIC browser boundary' }) }); assert.equal(created.status, 200);
    const id = (await created.json()).id; const read = await fetch(s.origin + `/api/sessions/${id}`, { headers: good }); assert.equal(read.status, 200);
    assert.match(read.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(fs.statSync(path.join(root, 'server.json')).mode & 0o777, 0o600);
  } finally { await s.close(); }
});
test('Claude path guard rejects symlink escapes and configuration writes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-paths-')); const project = path.join(root, 'project'); fs.mkdirSync(project); fs.writeFileSync(path.join(root, 'secret'), 'CANARY'); fs.symlinkSync(path.join(root, 'secret'), path.join(project, 'linked'));
  assert.equal(safeClaudePath(project, { file_path: path.join(root, 'secret') }), false);
  assert.equal(safeClaudePath(project, { file_path: 'linked' }), false);
  assert.equal(safeClaudePath(project, { file_path: '.env' }), false);
  assert.equal(safeClaudePath(project, { file_path: 'new.txt' }), true);
});
test('section marker examples in code fences never redirect section edits', () => {
  const text = renderDocument('Example', { brief: '```md\n<!-- relentless:draft -->\n## Draft\nexample\n```', draft: 'real answer', scratchpad: 'private' });
  const edited = replaceSection(text, 'draft', 'new answer'); const values = parseDocument(edited); assert.equal(values.draft, 'new answer'); assert.match(values.brief, /example/); assert.equal(values.scratchpad, 'private');
});
test('Codex restrictions disable hooks, plugins, connectors and network', () => {
  const config = codexConfig('/tmp/synthetic-fixture', 'interview');
  assert.equal(config['features.plugins'], false); assert.equal(config['features.hooks'], false); assert.equal(config['features.apps'], false); assert.equal(config['permissions.relentless.network.enabled'], false); assert.equal(config['permissions.relentless.filesystem']['/tmp/synthetic-fixture'], 'read');
});
