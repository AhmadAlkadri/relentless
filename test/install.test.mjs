import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { install as installAll, hashTree } from '../scripts/install.mjs';

const install = opts => installAll({ ...opts, bridge: false });
async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'relentless installer ')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repo = path.join(root, 'source repository');
  const home = path.join(root, 'user home');
  await fs.mkdir(home, { recursive: true });
  for (const name of ['relentless', 'tune', 'sprint-prompt']) {
    await fs.mkdir(path.join(repo, 'skills', name), { recursive: true });
    await fs.writeFile(path.join(repo, 'skills', name, 'SKILL.md'), `# ${name}\nFixture source.\n`);
  }
  await fs.mkdir(path.join(repo, 'bin'), { recursive: true });
  await fs.writeFile(path.join(repo, 'bin/relentless.mjs'), '#!/usr/bin/env node\n');
  return { root, repo, home };
}

async function existingDirectory(home, key, text = 'Original private skill\n') {
  const target = path.join(home, key);
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(target, 'SKILL.md'), text);
  return target;
}

test('fresh installation uses direct resolved links and repeat verifies hashes', async t => {
  const options = await fixture(t);
  const first = await install(options);
  assert.equal(first.ok, true);
  assert.equal(first.results.length, 8);
  for (const result of first.results) {
    assert.equal(await fs.readlink(result.path), result.source);
    assert.equal(await fs.realpath(result.path), result.source);
    assert.equal(await hashTree(result.path), result.hash);
  }
  const second = await install(options);
  assert.ok(second.results.every(result => result.action === 'verified'));
  const diagnostics = await install({ ...options, diagnostics: true });
  assert.ok(diagnostics.results.every(result => result.matches));
  const undo = await install({ ...options, uninstall: true });
  assert.equal(undo.ok, true);
  for (const result of first.results) await assert.rejects(fs.lstat(result.path), { code: 'ENOENT' });
});

test('dry run leaves home, sources and existing directories unchanged', async t => {
  const options = await fixture(t);
  await existingDirectory(options.home, '.claude/skills/sprint-prompt');
  const beforeHome = await hashTree(options.home);
  const beforeRepo = await hashTree(options.repo);
  const result = await install({ ...options, dryRun: true });
  assert.equal(result.ok, false);
  assert.equal(await hashTree(options.home), beforeHome);
  assert.equal(await hashTree(options.repo), beforeRepo);
});

test('substantive copies require exact inspected hash and restore their complete directory', async t => {
  const options = await fixture(t);
  const key = '.claude/skills/sprint-prompt';
  const target = await existingDirectory(options.home, key);
  await fs.writeFile(path.join(target, 'private-note.txt'), 'Do not track this backup.');
  const originalHash = await hashTree(target);
  const denied = await install({ ...options, adopt: { [key]: 'wrong' } });
  assert.equal(denied.ok, false);
  assert.equal(await hashTree(target), originalHash);
  const approved = await install({ ...options, adopt: { [key]: originalHash } });
  assert.equal(approved.ok, true);
  const manifest = JSON.parse(await fs.readFile(approved.manifest, 'utf8'));
  assert.equal(await hashTree(manifest.entries[key].backup), originalHash);
  assert.equal((await install({ ...options, uninstall: true })).ok, true);
  assert.equal((await fs.lstat(target)).isDirectory(), true);
  assert.equal(await hashTree(target), originalHash);
});

test('identical copies deduplicate without losing their previous directory', async t => {
  const options = await fixture(t);
  const key = '.agents/skills/relentless';
  const target = path.join(options.home, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(path.join(options.repo, 'skills/relentless'), target, { recursive: true });
  const result = await install(options);
  assert.equal(result.results.find(entry => entry.path === target).action, 'deduplicate');
  await install({ ...options, uninstall: true });
  assert.equal((await fs.lstat(target)).isDirectory(), true);
});

test('relocation repairs only previously managed links including stale source paths', async t => {
  const options = await fixture(t);
  await install(options);
  const relocated = path.join(options.root, 'new source location');
  await fs.rename(options.repo, relocated);
  const result = await install({ ...options, repo: relocated });
  assert.equal(result.ok, true);
  assert.ok(result.results.every(entry => entry.action === 'relink'));
  assert.ok((await install({ ...options, repo: relocated, diagnostics: true })).results.every(entry => entry.matches));
  assert.equal((await install({ ...options, repo: relocated, uninstall: true })).ok, true);
});

test('uninstall and repeat install preserve a destination replaced by the user', async t => {
  const options = await fixture(t);
  const key = '.claude/skills/tune';
  const target = await existingDirectory(options.home, key);
  const originalHash = await hashTree(target);
  const installed = await install({ ...options, adopt: { [key]: originalHash } });
  await fs.unlink(target);
  await existingDirectory(options.home, key, 'User replacement');
  const replacementHash = await hashTree(target);
  assert.equal((await install(options)).ok, false);
  assert.equal((await install({ ...options, uninstall: true })).ok, false);
  assert.equal(await hashTree(target), replacementHash);
  const manifest = JSON.parse(await fs.readFile(installed.manifest, 'utf8'));
  assert.equal(await hashTree(manifest.entries[key].backup), originalHash);
});

test('relative and stale pre-existing links are preserved exactly on rollback', async t => {
  const options = await fixture(t);
  const key = '.claude/skills/tune';
  const target = path.join(options.home, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.mkdir(path.join(options.home, '.claude/other'), { recursive: true });
  await fs.writeFile(path.join(options.home, '.claude/other/SKILL.md'), 'Other skill');
  await fs.symlink('../other', target);
  assert.equal((await install({ ...options, adopt: { [key]: await hashTree(target) } })).ok, true);
  assert.equal((await install({ ...options, uninstall: true })).ok, true);
  assert.equal(await fs.readlink(target), '../other');
  await fs.unlink(target);
  await fs.symlink('../missing', target);
  const dryRun = await install({ ...options, dryRun: true });
  const staleHash = dryRun.results.find(entry => entry.path === target).hash;
  assert.equal((await install({ ...options, adopt: { [key]: staleHash } })).ok, true);
  assert.equal((await install({ ...options, uninstall: true })).ok, true);
  assert.equal(await fs.readlink(target), '../missing');
});

test('changed backup blocks rollback and preserves installed link', async t => {
  const options = await fixture(t);
  const key = '.claude/skills/sprint-prompt';
  const target = await existingDirectory(options.home, key);
  const result = await install({ ...options, adopt: { [key]: await hashTree(target) } });
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  await fs.writeFile(path.join(manifest.entries[key].backup, 'SKILL.md'), 'Changed backup');
  assert.equal((await install({ ...options, uninstall: true })).ok, false);
  assert.equal((await fs.lstat(target)).isSymbolicLink(), true);
});

test('installer rejects parent symlinks escaping home and unsafe manifest paths', async t => {
  const options = await fixture(t);
  await fs.symlink(options.repo, path.join(options.home, '.agents'));
  await assert.rejects(install(options), /outside the selected home/);
  await fs.unlink(path.join(options.home, '.agents'));
  const result = await install(options);
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  manifest.entries['.claude/skills/tune'].backup = path.join(options.home, '.local/share/relentless/install/backups') + '/../../outside';
  await fs.writeFile(result.manifest, JSON.stringify(manifest));
  await assert.rejects(install({ ...options, uninstall: true }), /Unsafe backup/);
});

test('launcher previous regular file is recoverable after hash-approved adoption', async t => {
  const options = await fixture(t);
  const key = '.local/bin/relentless';
  const target = path.join(options.home, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, '#!/bin/sh\noriginal launcher\n', { mode: 0o700 });
  const originalHash = await hashTree(target);
  assert.equal((await install({ ...options, adopt: { [key]: originalHash } })).ok, true);
  await install({ ...options, uninstall: true });
  assert.equal(await hashTree(target), originalHash);
  assert.equal((await fs.stat(target)).mode & 0o777, 0o700);
});

test('interrupted installation before its first move can be rolled back safely', async t => {
  const options = await fixture(t);
  const key = '.claude/skills/tune';
  const target = await existingDirectory(options.home, key);
  const originalHash = await hashTree(target);
  const result = await install({ ...options, adopt: { [key]: originalHash } });
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  await fs.unlink(target);
  await fs.rename(manifest.entries[key].backup, target);
  manifest.entries[key].pending = true;
  await fs.writeFile(result.manifest, JSON.stringify(manifest));
  assert.equal((await install({ ...options, uninstall: true })).ok, true);
  assert.equal(await hashTree(target), originalHash);
});

test('interrupted installation after backup but before linking restores its original', async t => {
  const options = await fixture(t);
  const key = '.claude/skills/tune';
  const target = await existingDirectory(options.home, key);
  const originalHash = await hashTree(target);
  const result = await install({ ...options, adopt: { [key]: originalHash } });
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  await fs.unlink(target);
  manifest.entries[key].pending = true;
  await fs.writeFile(result.manifest, JSON.stringify(manifest));
  assert.equal((await install({ ...options, uninstall: true })).ok, true);
  assert.equal(await hashTree(target), originalHash);
});
