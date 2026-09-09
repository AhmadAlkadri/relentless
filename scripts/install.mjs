#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { installBridge } from './install-bridge.mjs';
import { fileURLToPath } from 'node:url';

const SKILLS = ['relentless', 'tune', 'sprint-prompt'];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const absent = error => error?.code === 'ENOENT';
const under = (base, target) => target === base || target.startsWith(base + path.sep);

/** Stable content hash: sorted relative names, entry types, bytes and internal links. */
export async function hashTree(input) {
  const root = await fs.realpath(input);
  const hash = crypto.createHash('sha256');
  async function walk(current, relative) {
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) {
      hash.update(JSON.stringify(['link', relative, await fs.readlink(current)]));
    } else if (stat.isDirectory()) {
      hash.update(JSON.stringify(['directory', relative]));
      for (const name of (await fs.readdir(current)).sort()) {
        await walk(path.join(current, name), path.join(relative, name));
      }
    } else if (stat.isFile()) {
      hash.update(JSON.stringify(['file', relative, stat.size]));
      hash.update(await fs.readFile(current));
    } else {
      throw new Error(`Unsupported special file: ${current}`);
    }
  }
  await walk(root, '');
  return hash.digest('hex');
}

async function snapshot(target) {
  let stat;
  try { stat = await fs.lstat(target); } catch (error) {
    if (absent(error)) return { kind: 'absent' };
    throw error;
  }
  if (stat.isSymbolicLink()) {
    const link = await fs.readlink(target);
    try {
      return { kind: 'link', link, resolved: await fs.realpath(target), hash: await hashTree(target) };
    } catch (error) {
      if (absent(error) || error.code === 'ELOOP') return { kind: 'link', link, stale: true, hash: sha(`stale:${link}`) };
      throw error;
    }
  }
  if (stat.isDirectory()) return { kind: 'directory', hash: await hashTree(target) };
  if (stat.isFile()) return { kind: 'file', hash: await hashTree(target) };
  throw new Error(`Unsupported installation target: ${target}`);
}

function entries(repo) {
  return [
    ...SKILLS.flatMap(name => ['.agents/skills', '.claude/skills'].map(directory => ({
      key: `${directory}/${name}`, source: path.join(repo, 'skills', name), type: 'directory'
    }))),
    { key: '.codex/skills/sprint-prompt', source: path.join(repo, 'skills/sprint-prompt'), type: 'directory' },
    { key: '.local/bin/relentless', source: path.join(repo, 'bin/relentless.mjs'), type: 'file' }
  ];
}

async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) {
    if (absent(error)) return fallback;
    throw new Error(`Cannot read installation metadata ${file}: ${error.message}`);
  }
}

async function writeJSON(file, value) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`); await handle.sync(); }
  finally { await handle.close(); }
  try { await fs.rename(temporary, file); }
  catch (error) { await fs.unlink(temporary).catch(() => {}); throw error; }
}

async function validateParents(home, destination) {
  let parent = path.dirname(destination);
  while (under(home, parent) && parent !== home) {
    try {
      const actual = await fs.realpath(parent);
      if (!under(home, actual)) throw new Error(`Installation parent resolves outside the selected home: ${parent}`);
    } catch (error) { if (!absent(error)) throw error; }
    parent = path.dirname(parent);
  }
}

function isManagedLink(current, destination, expected) {
  return current.kind === 'link' && path.resolve(path.dirname(destination), current.link) === expected;
}

function sameSnapshot(left, right) {
  return left.kind === right.kind && left.hash === right.hash && left.link === right.link;
}

function sameBackup(left, right) {
  // A moved relative symlink can resolve differently in the backup directory.
  return left.kind === 'link' && right.kind === 'link' ? left.link === right.link : sameSnapshot(left, right);
}

/**
 * Install only individual reviewed paths. Conflicts are reported and preserved.
 * adopt maps relative destination (or absolute destination) to its inspected hash.
 * Uninstall restores the first installation's prior state, even after relocation.
 */
export async function install({
  repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  home = os.homedir(), dryRun = false, uninstall = false, adopt = {}, diagnostics = false, bridge = true
} = {}) {
  if (!adopt || typeof adopt !== 'object' || Array.isArray(adopt)) throw new Error('Adoption approvals must be a destination-to-hash object.');
  repo = path.resolve(repo);
  home = await fs.realpath(path.resolve(home));
  if (!uninstall) repo = await fs.realpath(repo);
  const stateDirectory = path.join(home, '.local/share/relentless/install');
  const manifestFile = path.join(stateDirectory, 'manifest.json');
  await validateParents(home, manifestFile);
  const descriptors = entries(repo);
  const allowedKeys = new Set(descriptors.map(entry => entry.key));
  let manifest = await readJSON(manifestFile, { version: 1, entries: {} });
  function validateManifest() {
    if (manifest.version !== 1 || !manifest.entries || Array.isArray(manifest.entries)) {
      throw new Error('Unrecognized installation manifest; nothing changed.');
    }
    for (const [key, entry] of Object.entries(manifest.entries)) {
      if (!allowedKeys.has(key) || typeof entry.target !== 'string' || !path.isAbsolute(entry.target) || !entry.previous) {
        throw new Error('Unsafe or unrecognized installation manifest entry; nothing changed.');
      }
      if (entry.backup && (!under(path.join(stateDirectory, 'backups'), entry.backup) || path.resolve(entry.backup) !== entry.backup)) {
        throw new Error('Unsafe backup path in manifest; nothing changed.');
      }
    }
  }
  validateManifest();
  const results = [];
  const persist = async () => { if (!dryRun && !diagnostics) await writeJSON(manifestFile, manifest); };
  let lock;
  if (!dryRun && !diagnostics) {
    await fs.mkdir(stateDirectory, { recursive: true, mode: 0o700 });
    lock = path.join(stateDirectory, 'operation.lock');
    try { await fs.mkdir(lock, { mode: 0o700 }); }
    catch (error) {
      if (error.code === 'EEXIST') throw new Error(`An installer operation is active or was interrupted. Inspect ${lock} before removing its empty lock directory.`);
      throw error;
    }
  }
  try {
    if (lock) {
      // A prior process may have finished between our initial read and lock.
      manifest = await readJSON(manifestFile, { version: 1, entries: {} });
      validateManifest();
    }
    for (const descriptor of descriptors) {
      const { key, source, type } = descriptor;
      const destination = path.join(home, key);
      await validateParents(home, destination);
      const current = await snapshot(destination);
      const saved = manifest.entries[key];
      if (diagnostics) {
        let expectedHash;
        try { expectedHash = await hashTree(source); } catch (error) { if (!absent(error)) throw error; }
        results.push({ path: destination, source, managed: Boolean(saved), ...current,
          matches: Boolean(expectedHash && current.resolved === source && current.hash === expectedHash), expectedHash });
        continue;
      }
      if (uninstall) {
        if (!saved) { results.push({ path: destination, action: 'unmanaged', unchanged: true }); continue; }
        if (saved.pending && sameSnapshot(current, saved.previous)) {
          if (!dryRun) { delete manifest.entries[key]; await persist(); }
          results.push({ path: destination, action: 'restore', restored: current.kind, dryRun });
          continue;
        }
        if (current.kind !== 'absent' && !isManagedLink(current, destination, saved.target)) {
          results.push({ path: destination, action: 'conflict', reason: 'Installed target changed; preserving it and its backup.' }); continue;
        }
        if (saved.backup) {
          await validateParents(home, saved.backup);
          const backup = await snapshot(saved.backup);
          if (!sameBackup(backup, saved.previous)) {
            results.push({ path: destination, action: 'conflict', reason: 'Backup is missing or changed; preserving all current state.' }); continue;
          }
        }
        if (!dryRun) {
          if (current.kind === 'link') await fs.unlink(destination);
          if (saved.backup) await fs.rename(saved.backup, destination);
          delete manifest.entries[key];
          await persist();
        }
        results.push({ path: destination, action: 'restore', restored: saved.previous.kind, dryRun });
        continue;
      }
      const sourceState = await snapshot(source);
      if (sourceState.kind !== type) {
        results.push({ path: destination, action: 'conflict', reason: `Canonical source must be a real ${type}: ${source}` }); continue;
      }
      const resolvedSource = await fs.realpath(source);
      if (!under(repo, resolvedSource)) throw new Error(`Canonical source resolves outside repository: ${source}`);
      if (saved) {
        if (current.kind !== 'absent' && !isManagedLink(current, destination, saved.target)) {
          results.push({ path: destination, action: 'conflict', reason: 'Managed destination was changed outside the installer.' }); continue;
        }
        if (saved.pending) {
          results.push({ path: destination, action: 'conflict', reason: 'An earlier installation was interrupted. Uninstall to recover its recorded backup before reinstalling.' }); continue;
        }
        const correctLink = isManagedLink(current, destination, resolvedSource);
        if (!dryRun) {
          if (!correctLink) {
            if (current.kind === 'link') await fs.unlink(destination);
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.symlink(resolvedSource, destination, type === 'directory' ? 'dir' : 'file');
          }
          Object.assign(saved, { target: resolvedSource, sourceHash: sourceState.hash });
          await persist();
        }
        results.push({ path: destination, action: correctLink ? 'verified' : 'relink', source: resolvedSource, hash: sourceState.hash, dryRun });
        continue;
      }
      const identical = current.hash === sourceState.hash && current.kind === type;
      const alreadyDirect = isManagedLink(current, destination, resolvedSource);
      const approvedHash = adopt[key] ?? adopt[destination];
      if (current.kind !== 'absent' && !identical && !alreadyDirect && approvedHash !== current.hash) {
        results.push({ path: destination, action: 'conflict', reason: 'Existing content requires an inspected matching adoption hash.', kind: current.kind, hash: current.hash });
        continue;
      }
      const backup = current.kind === 'absent' ? null : path.join(stateDirectory, 'backups', `${crypto.randomUUID()}-${path.basename(key)}`);
      if (!dryRun) {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        if (backup) await fs.mkdir(path.dirname(backup), { recursive: true, mode: 0o700 });
        manifest.entries[key] = { target: resolvedSource, sourceHash: sourceState.hash, previous: current, backup,
          installedAt: new Date().toISOString(), pending: true };
        await persist();
        try {
          // Recheck immediately before mutation, including content and symlink identity.
          if (!sameSnapshot(await snapshot(destination), current)) throw new Error('Target changed during installation.');
          if (backup) await fs.rename(destination, backup);
          await fs.symlink(resolvedSource, destination, type === 'directory' ? 'dir' : 'file');
          delete manifest.entries[key].pending;
          await persist();
        } catch (error) {
          const after = await snapshot(destination);
          if (isManagedLink(after, destination, resolvedSource)) await fs.unlink(destination);
          if (backup && (await snapshot(backup)).kind !== 'absent' && (await snapshot(destination)).kind === 'absent') {
            await fs.rename(backup, destination);
          }
          // If no mutation escaped, forget the failed entry. Otherwise retain recovery metadata.
          if (sameSnapshot(await snapshot(destination), current)) delete manifest.entries[key];
          await persist();
          throw error;
        }
      }
      results.push({ path: destination, action: identical ? 'deduplicate' : alreadyDirect ? 'track' : 'install', source: resolvedSource,
        hash: sourceState.hash, previous: current.kind, backup, dryRun });
    }
    const linksOK = !results.some(result => result.action === 'conflict');
    const bridgeResult = bridge && linksOK ? await installBridge({ repo, home, dryRun, diagnostics, uninstall }) : null;
    return { ok: linksOK && (!bridgeResult || bridgeResult.ok), dryRun, manifest: manifestFile, results, bridge: bridgeResult };
  } finally {
    if (lock) await fs.rmdir(lock);
  }
}

async function main(args) {
  const options = {};
  let adoptReviewed = false;
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (value === '--repo' || value === '--home' || value === '--adopt-file') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${value}`);
      const next = args[++index];
      if (value === '--adopt-file') {
        options.adopt = await readJSON(next);
        if (!options.adopt) throw new Error(`Adoption map does not exist: ${next}`);
      }
      else options[value.slice(2)] = next;
    } else if (value === '--dry-run') options.dryRun = true;
    else if (value === '--uninstall' || value === '--rollback') options.uninstall = true;
    else if (value === '--diagnostics') options.diagnostics = true;
    else if (value === '--adopt-reviewed') adoptReviewed = true;
    else if (value === '--help') {
      console.log('node scripts/install.mjs [--repo PATH] [--home PATH] [--dry-run] [--diagnostics] [--adopt-reviewed | --adopt-file JSON] [--uninstall | --rollback]');
      return;
    } else throw new Error(`Unknown installer argument: ${value}`);
  }
  if (adoptReviewed) {
    const repo = options.repo || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const reviewed = await readJSON(path.join(repo, 'skills/adoption-hashes.json'));
    if (!reviewed || typeof reviewed !== 'object') throw new Error('Reviewed adoption map is missing.');
    options.adopt = { ...reviewed, ...options.adopt };
  }
  const result = await install(options);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
