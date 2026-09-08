import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { startServer } from '../src/server.mjs';
import { safeClaudePath, codexConfig, codexTextChunk } from '../src/providers.mjs';
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
test('restart retains browser origin and rotates the local capability', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-restart-')); const first = await startServer({ root }); const { origin, token } = first; await first.close(); const second = await startServer({ root });
  try { assert.equal(second.origin, origin); assert.notEqual(second.token, token); assert.equal((await fetch(origin + '/api/state', { headers: { Authorization: `Bearer ${token}` } })).status, 401); } finally { await second.close(); }
});
test('a second server cannot mark the live owner requests interrupted', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-owner-')); const first = await startServer({ root });
  try { const s = first.store.create(); const m = s.meta; m.status = 'running'; m.mode = 'build'; first.store.setMeta(s.id, m); await assert.rejects(startServer({ root }), /already owns/); assert.equal(first.store.meta(s.id).status, 'running'); assert.equal(first.store.meta(s.id).mode, 'build'); } finally { await first.close(); }
});
test('Codex streamed message boundaries preserve readable paragraphs', () => {
  const stream = { text: '', lastItem: null };
  assert.equal(codexTextChunk(stream, 'commentary', 'Inspecting'), 'Inspecting');
  assert.equal(codexTextChunk(stream, 'commentary', ' now.'), ' now.');
  assert.equal(codexTextChunk(stream, 'final', 'The scope is ready.'), '\n\nThe scope is ready.');
  assert.equal(stream.text, 'Inspecting now.\n\nThe scope is ready.');
});
