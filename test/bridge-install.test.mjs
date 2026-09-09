import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parse as parseToml } from 'smol-toml';
import { installBridge, BRIDGE_TOOLS } from '../scripts/install-bridge.mjs';
import { hashTree } from '../scripts/install.mjs';

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'relentless bridge install ')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const home = path.join(root, 'user home'), repo = path.join(root, 'source repository');
  await fs.mkdir(path.join(repo, 'bin'), { recursive: true });
  await fs.mkdir(path.join(home, '.codex'), { recursive: true });
  await fs.writeFile(path.join(repo, 'bin/relentless-mcp.mjs'), '#!/usr/bin/env node\n');
  return { root, home, repo, codex: path.join(home, '.codex/config.toml'), claude: path.join(home, '.claude.json') };
}

test('bridge registration is user scoped, narrowly approved and repeatable', async t => {
  const opts = await fixture(t);
  const first = await installBridge(opts);
  assert.equal(first.ok, true, JSON.stringify(first));
  const codex = parseToml(await fs.readFile(opts.codex, 'utf8')).mcp_servers.relentless;
  const claude = JSON.parse(await fs.readFile(opts.claude, 'utf8')).mcpServers.relentless;
  assert.deepEqual(codex.args, [path.join(opts.repo, 'bin/relentless-mcp.mjs'), '--client', 'codex']);
  assert.equal(codex.command, process.execPath);
  assert.deepEqual(codex.env_vars, ['WEZTERM_PANE', 'WEZTERM_UNIX_SOCKET']);
  assert.equal(codex.cwd, undefined);
  assert.equal(codex.tool_timeout_sec, 1800);
  assert.equal(codex.default_tools_approval_mode, 'prompt');
  assert.deepEqual(codex.enabled_tools, BRIDGE_TOOLS);
  assert.deepEqual(Object.keys(codex.tools), BRIDGE_TOOLS);
  assert.ok(Object.values(codex.tools).every(tool => tool.approval_mode === 'approve'));
  assert.equal(claude.type, 'stdio');
  assert.equal(claude.timeout, 1800000);
  assert.equal(claude.args.at(-1), 'claude');
  const before = await hashTree(opts.home);
  const again = await installBridge(opts);
  assert.ok(again.results.every(result => result.action === 'verified'), JSON.stringify(again));
  assert.equal(await hashTree(opts.home), before);
  assert.ok((await installBridge({ ...opts, diagnostics: true })).results.every(result => result.matches));
  assert.equal((await installBridge({ ...opts, uninstall: true })).ok, true);
  await assert.rejects(fs.stat(opts.codex), { code: 'ENOENT' });
  await assert.rejects(fs.stat(opts.claude), { code: 'ENOENT' });
});

test('unrelated configuration bytes, scopes and exact original formatting survive install and rollback', async t => {
  const opts = await fixture(t);
  const toml = '# Personal formatting\nmodel = "chosen-model"\n[mcp_servers.other]\ncommand = "/private tool"\n# Tail comment';
  const json = '{ "theme" : "dark", "projects": {"/fixture": {"mcpServers":{"local":{"command":"existing"}}}}, "mcpServers" : { "other" : { "url" : "https://example.invalid" } } }\n';
  await fs.writeFile(opts.codex, toml, { mode: 0o640 }); await fs.writeFile(opts.claude, json, { mode: 0o640 });
  const result = await installBridge(opts);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok((await fs.readFile(opts.codex, 'utf8')).startsWith(toml));
  assert.ok((await fs.readFile(opts.claude, 'utf8')).includes('"other" : { "url" : "https://example.invalid" }'));
  assert.equal(JSON.parse(await fs.readFile(opts.claude, 'utf8')).projects['/fixture'].mcpServers.local.command, 'existing');
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  for (const entry of Object.values(manifest.entries)) assert.equal((await fs.stat(entry.backup)).mode & 0o777, 0o600);
  assert.equal((await installBridge({ ...opts, uninstall: true })).ok, true);
  assert.equal(await fs.readFile(opts.codex, 'utf8'), toml);
  assert.equal(await fs.readFile(opts.claude, 'utf8'), json);
  assert.equal((await fs.stat(opts.codex)).mode & 0o777, 0o640);
});

test('dry runs and diagnostics create no files or backups', async t => {
  const opts = await fixture(t);
  const before = await hashTree(opts.home);
  assert.equal((await installBridge({ ...opts, dryRun: true })).ok, true);
  assert.equal((await installBridge({ ...opts, diagnostics: true })).ok, true);
  assert.equal(await hashTree(opts.home), before);
});

test('relocation updates only managed commands and rollback retains first originals', async t => {
  const opts = await fixture(t);
  const original = '{"theme":"light"}\n';
  await fs.writeFile(opts.claude, original);
  assert.equal((await installBridge(opts)).ok, true);
  const relocated = path.join(opts.root, 'relocated repository');
  await fs.rename(opts.repo, relocated);
  const next = await installBridge({ ...opts, repo: relocated });
  assert.equal(next.ok, true, JSON.stringify(next));
  assert.ok(next.results.every(result => result.action === 'relink'));
  assert.equal(parseToml(await fs.readFile(opts.codex, 'utf8')).mcp_servers.relentless.args[0], path.join(relocated, 'bin/relentless-mcp.mjs'));
  assert.equal((await installBridge({ ...opts, repo: relocated, uninstall: true })).ok, true);
  assert.equal(await fs.readFile(opts.claude, 'utf8'), original);
});

test('rollback after unrelated edits removes only the owned registration', async t => {
  const opts = await fixture(t);
  await fs.writeFile(opts.claude, '{ "theme": "dark" }\n');
  assert.equal((await installBridge(opts)).ok, true);
  const extra = '\n# A later user server\n[mcp_servers.later]\ncommand = "keep-me"\n';
  await fs.appendFile(opts.codex, extra);
  let json = await fs.readFile(opts.claude, 'utf8');
  json = json.replace('"theme": "dark"', '"theme": "light", "unrelated" : [1, 2, 3]');
  await fs.writeFile(opts.claude, json);
  assert.equal((await installBridge({ ...opts, uninstall: true })).ok, true);
  assert.equal(await fs.readFile(opts.codex, 'utf8'), extra);
  const after = await fs.readFile(opts.claude, 'utf8');
  assert.ok(after.includes('"unrelated" : [1, 2, 3]'));
  assert.deepEqual(JSON.parse(after), { theme: 'light', unrelated: [1, 2, 3] });
});

test('rollback preserves a concurrently added server in the newly created JSON parent', async t => {
  const opts = await fixture(t);
  await installBridge(opts);
  const config = JSON.parse(await fs.readFile(opts.claude, 'utf8'));
  config.mcpServers.later = { command: 'retain' };
  await fs.writeFile(opts.claude, JSON.stringify(config));
  const result = await installBridge({ ...opts, uninstall: true });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(JSON.parse(await fs.readFile(opts.claude, 'utf8')), { mcpServers: { later: { command: 'retain' } } });
});

test('unmanaged name collisions and malformed config are preserved', async t => {
  const opts = await fixture(t);
  const codex = '[mcp_servers.relentless]\ncommand="someone-else"\n';
  const claude = '{"mcpServers":{"relentless":{"command":"someone-else"}}}';
  await fs.writeFile(opts.codex, codex); await fs.writeFile(opts.claude, claude);
  assert.equal((await installBridge(opts)).ok, false);
  assert.equal(await fs.readFile(opts.codex, 'utf8'), codex);
  assert.equal(await fs.readFile(opts.claude, 'utf8'), claude);
  await fs.writeFile(opts.codex, 'this is not TOML');
  await fs.writeFile(opts.claude, '{"mcpServers":{}, "mcpServers":{}}');
  const rejected = await installBridge(opts);
  assert.equal(rejected.ok, false);
  assert.match(rejected.results.find(result => result.client === 'claude').reason, /Duplicate JSON key/);
});

test('edits to a managed entry prevent repeat installation and rollback', async t => {
  const opts = await fixture(t);
  await installBridge(opts);
  const codex = (await fs.readFile(opts.codex, 'utf8')).replace('tool_timeout_sec = 1800', 'tool_timeout_sec = 99');
  const claude = (await fs.readFile(opts.claude, 'utf8')).replace('1800000', '99');
  await fs.writeFile(opts.codex, codex); await fs.writeFile(opts.claude, claude);
  assert.equal((await installBridge(opts)).ok, false);
  assert.equal((await installBridge({ ...opts, uninstall: true })).ok, false);
  assert.equal(await fs.readFile(opts.codex, 'utf8'), codex);
  assert.equal(await fs.readFile(opts.claude, 'utf8'), claude);
});

test('changed backups and unsafe manifest paths block restoration', async t => {
  const opts = await fixture(t);
  await fs.writeFile(opts.codex, '# original\n');
  const result = await installBridge(opts);
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  await fs.writeFile(manifest.entries.codex.backup, 'changed');
  assert.equal((await installBridge({ ...opts, uninstall: true })).ok, false);
  const latest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  latest.entries.codex.backup = path.join(opts.home, 'escape');
  await fs.writeFile(result.manifest, JSON.stringify(latest));
  await assert.rejects(installBridge({ ...opts, uninstall: true }), /Unsafe bridge backup path/);
});

test('interrupted installation restores both pre-write and post-write states', async t => {
  for (const beforeWrite of [true, false]) {
    const opts = await fixture(t);
    await fs.writeFile(opts.codex, '# original\n');
    const result = await installBridge(opts);
    const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
    manifest.entries.codex.pending = true;
    await fs.writeFile(result.manifest, JSON.stringify(manifest));
    if (beforeWrite) await fs.writeFile(opts.codex, '# original\n');
    assert.equal((await installBridge(opts)).ok, false);
    assert.equal((await installBridge({ ...opts, uninstall: true })).ok, true);
    assert.equal(await fs.readFile(opts.codex, 'utf8'), '# original\n');
  }
});

test('configuration symlinks and escaping parent symlinks are refused', async t => {
  const opts = await fixture(t);
  const target = path.join(opts.root, 'external.toml');
  await fs.writeFile(target, '# leave alone');
  await fs.symlink(target, opts.codex);
  await assert.rejects(installBridge(opts), /regular configuration file/);
  assert.equal(await fs.readFile(target, 'utf8'), '# leave alone');
  await fs.unlink(opts.codex); await fs.rmdir(path.dirname(opts.codex));
  await fs.symlink(opts.repo, path.dirname(opts.codex));
  await assert.rejects(installBridge(opts), /outside the selected home/);
});

test('valid JSON strings with escaped braces and nested arrays remain intact', async t => {
  const opts = await fixture(t);
  const original = '{"note":"quoted \\\" } , { ","array":[{"inner":[true,false,null,-1.25e2]}],"mcpServers":{}}';
  await fs.writeFile(opts.claude, original);
  const installed = await installBridge(opts);
  assert.equal(installed.ok, true, JSON.stringify(installed));
  await fs.writeFile(opts.claude, (await fs.readFile(opts.claude, 'utf8')).replace('-1.25e2', '42'));
  assert.equal((await installBridge({ ...opts, uninstall: true })).ok, true);
  assert.deepEqual(JSON.parse(await fs.readFile(opts.claude, 'utf8')), JSON.parse(original.replace('-1.25e2', '42')));
});
