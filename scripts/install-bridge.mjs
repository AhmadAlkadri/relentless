#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse as parseToml } from 'smol-toml';

export const BRIDGE_TOOLS = ['open_interview', 'publish_interview', 'await_interview', 'attachment_status'];
const BEGIN = '# BEGIN Relentless managed MCP bridge';
const END = '# END Relentless managed MCP bridge';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const missing = error => error?.code === 'ENOENT';
const within = (root, target) => target === root || target.startsWith(root + path.sep);

export function bridgeConfiguration(repo, client, node = process.execPath) {
  const common = { command: node, args: [path.join(repo, 'bin/relentless-mcp.mjs'), '--client', client] };
  if (client === 'claude') return { type: 'stdio', ...common, timeout: 1800000 };
  if (client !== 'codex') throw new Error('Unknown bridge client.');
  return { ...common, env_vars: ['WEZTERM_PANE', 'WEZTERM_UNIX_SOCKET'], tool_timeout_sec: 1800,
    enabled_tools: BRIDGE_TOOLS, default_tools_approval_mode: 'prompt',
    tools: Object.fromEntries(BRIDGE_TOOLS.map(name => [name, { approval_mode: 'approve' }])) };
}

function tomlBlock(config) {
  const fields = Object.entries(config).filter(([name]) => name !== 'tools').map(([name, value]) => `${name} = ${JSON.stringify(value)}`);
  const tools = BRIDGE_TOOLS.map(name => `[mcp_servers.relentless.tools.${name}]\napproval_mode = "approve"`);
  return `${BEGIN}\n[mcp_servers.relentless]\n${fields.join('\n')}\n\n${tools.join('\n\n')}\n${END}\n`;
}

// Locate JSON members without serializing the surrounding user configuration.
// Reject duplicate keys instead of silently choosing one of two configurations.
function jsonTree(text) {
  let index = 0;
  const whitespace = () => { while (/\s/.test(text[index] || '') && index < text.length) index++; };
  function string() {
    const start = index++;
    while (index < text.length) {
      if (text[index] === '\\') { index += 2; continue; }
      if (text[index++] === '"') return JSON.parse(text.slice(start, index));
    }
    throw new Error('Unterminated JSON string.');
  }
  function value() {
    whitespace(); const start = index;
    if (text[index] === '{') {
      index++; whitespace(); const members = [];
      while (text[index] !== '}') {
        if (text[index] !== '"') throw new Error('Expected JSON object key.');
        const keyStart = index, key = string();
        if (members.some(member => member.key === key)) throw new Error(`Duplicate JSON key: ${key}`);
        whitespace(); if (text[index++] !== ':') throw new Error('Expected JSON colon.');
        const node = value(); whitespace();
        const comma = text[index] === ',' ? index++ : null;
        members.push({ key, keyStart, node, comma }); whitespace();
        if (comma === null) break;
      }
      if (text[index++] !== '}') throw new Error('Expected JSON object end.');
      return { start, end: index, members };
    }
    if (text[index] === '[') {
      index++; whitespace();
      while (text[index] !== ']') { value(); whitespace(); if (text[index] !== ',') break; index++; whitespace(); }
      if (text[index++] !== ']') throw new Error('Expected JSON array end.');
    } else if (text[index] === '"') string();
    else { const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(index)); if (!match) throw new Error('Invalid JSON value.'); index += match[0].length; }
    return { start, end: index };
  }
  const root = value(); whitespace();
  if (index !== text.length) throw new Error('Unexpected JSON suffix.');
  JSON.parse(text);
  if (!root.members) throw new Error('Client configuration must be a JSON object.');
  return root;
}

function jsonMember(text, keys, replacement) {
  const root = jsonTree(text);
  function patch(node, remaining) {
    if (!node.members) throw new Error(`Expected an object at ${keys.join('.')}.`);
    const [key, ...tail] = remaining;
    const position = node.members.findIndex(member => member.key === key);
    const member = node.members[position];
    if (tail.length && member) return patch(member.node, tail);
    if (!member) {
      if (replacement === undefined) return text;
      const nested = tail.reduceRight((next, name) => ({ [name]: next }), replacement);
      const insertion = `\n  ${JSON.stringify(key)}: ${JSON.stringify(nested, null, 2).replaceAll('\n', '\n  ')}${node.members.length ? ',' : ''}`;
      return text.slice(0, node.start + 1) + insertion + text.slice(node.start + 1);
    }
    if (replacement !== undefined) return text.slice(0, member.node.start) + JSON.stringify(replacement, null, 2) + text.slice(member.node.end);
    const start = member.comma !== null || position === 0 ? member.keyStart : node.members[position - 1].comma;
    const end = member.comma !== null ? member.comma + 1 : member.node.end;
    return text.slice(0, start) + text.slice(end);
  }
  const updated = patch(root, keys);
  jsonTree(updated);
  return updated;
}

function parseConfig(client, text) {
  if (client === 'codex') return parseToml(text || '');
  jsonTree(text || '{}'); return JSON.parse(text || '{}');
}
const ownValue = (client, parsed) => client === 'codex' ? parsed.mcp_servers?.relentless : parsed.mcpServers?.relentless;

function replaceEntry(client, text, desired, saved) {
  const parsed = parseConfig(client, text);
  const current = ownValue(client, parsed);
  if (saved && !equal(current, saved.value)) throw new Error('Relentless configuration changed outside the installer; preserving it.');
  if (!saved && current !== undefined) throw new Error('An unmanaged Relentless MCP registration already exists; preserving it.');
  let updated;
  if (client === 'codex') {
    if (saved) {
      const start = text.indexOf(saved.block);
      if (start < 0 || text.indexOf(saved.block, start + saved.block.length) >= 0) throw new Error('Managed TOML block changed or is ambiguous; preserving it.');
      updated = text.slice(0, start) + (desired ? tomlBlock(desired) : '') + text.slice(start + saved.block.length);
    } else {
      if (text.includes(BEGIN) || text.includes(END)) throw new Error('Unmanaged Relentless markers already exist; preserving the file.');
      updated = text + (text.endsWith('\n') || !text ? '' : '\n') + tomlBlock(desired);
    }
  } else {
    if (saved && equal(current, desired)) return text;
    updated = jsonMember(text || '{}\n', ['mcpServers', 'relentless'], desired);
    if (!desired && Object.keys(JSON.parse(updated).mcpServers || {}).length === 0 && !saved.hadParent) updated = jsonMember(updated, ['mcpServers'], undefined);
  }
  const after = parseConfig(client, updated);
  if (!equal(ownValue(client, after), desired)) throw new Error('Client configuration did not validate after the bounded edit.');
  // Validate every unrelated semantic value as well as preserving its source bytes.
  const strip = (value, key) => { const copy = structuredClone(value); if (copy[key]) { delete copy[key].relentless; if (!Object.keys(copy[key]).length) delete copy[key]; } return copy; };
  const key = client === 'codex' ? 'mcp_servers' : 'mcpServers';
  if (!equal(strip(parsed, key), strip(after, key))) throw new Error('Bounded edit would change unrelated client configuration.');
  return updated;
}

async function fileState(file) {
  try {
    const info = await fs.lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Expected a regular configuration file: ${file}`);
    const text = await fs.readFile(file, 'utf8');
    return { present: true, text, hash: digest(text), mode: info.mode & 0o777 };
  } catch (error) { if (missing(error)) return { present: false, text: '', hash: null, mode: 0o600 }; throw error; }
}
async function safeParents(file, home) {
  let parent = path.dirname(file);
  while (within(home, parent) && parent !== home) {
    try { if (!within(home, await fs.realpath(parent))) throw new Error(`Configuration parent resolves outside the selected home: ${parent}`); }
    catch (error) { if (!missing(error)) throw error; }
    parent = path.dirname(parent);
  }
}
async function atomicWrite(file, text, mode = 0o600) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  const handle = await fs.open(temporary, 'wx', mode);
  try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
  try { await fs.rename(temporary, file); } catch (error) { await fs.unlink(temporary).catch(() => {}); throw error; }
}

/** User-scoped registration only. No client launches, transcript reads or auth changes. */
export async function installBridge(options = {}) {
  const home = await fs.realpath(path.resolve(options.home || os.homedir()));
  const dryRun = Boolean(options.dryRun), diagnostics = Boolean(options.diagnostics), uninstall = Boolean(options.uninstall || options.rollback);
  let repo = path.resolve(options.repo || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  if (!uninstall) repo = await fs.realpath(repo);
  const node = path.resolve(options.node || process.execPath);
  if (!uninstall && !diagnostics && !(await fs.stat(path.join(repo, 'bin/relentless-mcp.mjs'))).isFile()) throw new Error('Canonical MCP bridge entrypoint is missing.');
  // Explicit --home isolates tests and installations from the invoking shell's account overrides.
  const descriptors = [
    { client: 'codex', file: path.join(path.resolve(options.codexHome || (!options.home && process.env.CODEX_HOME) || path.join(home, '.codex')), 'config.toml') },
    { client: 'claude', file: path.resolve(options.claudeConfigFile || path.join((!options.home && process.env.CLAUDE_CONFIG_DIR) || home, '.claude.json')) }
  ];
  const directory = path.join(home, '.local/share/relentless/install-bridge');
  const manifestFile = path.join(directory, 'manifest.json');
  await safeParents(manifestFile, home);
  let lock;
  if (!dryRun && !diagnostics) {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    lock = path.join(directory, 'operation.lock');
    try { await fs.mkdir(lock, { mode: 0o700 }); }
    catch (error) { if (error.code === 'EEXIST') throw new Error(`A bridge installer operation is active or interrupted. Inspect ${lock} before removing its empty lock directory.`); throw error; }
  }
  try {
    const manifestState = await fileState(manifestFile);
    const manifest = manifestState.present ? JSON.parse(manifestState.text) : { version: 1, entries: {} };
    if (manifest.version !== 1 || !manifest.entries || Array.isArray(manifest.entries)) throw new Error('Unrecognized bridge installation manifest; nothing changed.');
    for (const [client, entry] of Object.entries(manifest.entries)) {
      const descriptor = descriptors.find(value => value.client === client);
      if (!descriptor || descriptor.file !== entry.file || !entry.previous || !entry.value || typeof entry.installedHash !== 'string') throw new Error('Unsafe or unrecognized bridge installation manifest entry; nothing changed.');
      if (entry.backup && (!within(path.join(directory, 'backups'), entry.backup) || path.resolve(entry.backup) !== entry.backup)) throw new Error('Unsafe bridge backup path; nothing changed.');
      if (client === 'codex' && typeof entry.block !== 'string') throw new Error('Missing managed TOML block; nothing changed.');
    }
    const persist = () => atomicWrite(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    const results = [];
    for (const { client, file } of descriptors) {
      await safeParents(file, home);
      const before = await fileState(file), saved = manifest.entries[client], desired = bridgeConfiguration(repo, client, node);
      try {
        const parsed = parseConfig(client, before.text);
        if (diagnostics) {
          results.push({ client, path: file, managed: Boolean(saved), matches: equal(ownValue(client, parsed), desired), pending: Boolean(saved?.pending) }); continue;
        }
        let after, remove = false, action;
        if (uninstall) {
          if (!saved) { results.push({ client, path: file, action: 'unmanaged', unchanged: true }); continue; }
          let backup;
          if (saved.previous.present) {
            if (!saved.backup) throw new Error('Recorded configuration backup is missing.');
            await safeParents(saved.backup, home); backup = await fileState(saved.backup);
            if (!backup.present || backup.hash !== saved.previous.hash) throw new Error('Configuration backup changed or is missing; preserving current configuration.');
          }
          if (before.hash === saved.previous.hash && before.present === saved.previous.present) { after = before.text; remove = !before.present; }
          else if (before.hash === saved.installedHash) { after = backup?.text || ''; remove = !saved.previous.present; }
          else if (ownValue(client, parsed) === undefined) { after = before.text; remove = !before.present; }
          else {
            after = replaceEntry(client, before.text, undefined, saved);
            remove = !saved.previous.present && (client === 'codex' ? !after.trim() : !Object.keys(JSON.parse(after)).length);
          }
          action = 'restore';
        } else {
          if (saved?.pending) throw new Error('An interrupted bridge install needs rollback before reinstalling.');
          after = replaceEntry(client, before.text, desired, saved);
          action = saved ? (after === before.text ? 'verified' : 'relink') : 'install';
        }
        if (!dryRun && (uninstall || after !== before.text)) {
          const rechecked = await fileState(file);
          if (rechecked.hash !== before.hash || rechecked.present !== before.present) throw new Error('Client configuration changed during installation; retry after inspecting it.');
          if (!uninstall) {
            const backup = saved?.backup || (before.present ? path.join(directory, 'backups', `${crypto.randomUUID()}-${client}`) : null);
            if (!saved && backup) await atomicWrite(backup, before.text);
            manifest.entries[client] = { ...(saved || {}), file, previous: saved?.previous || { present: before.present, hash: before.hash, mode: before.mode }, backup,
              hadParent: saved?.hadParent ?? Boolean(parsed.mcpServers), value: desired, installedHash: digest(after),
              ...(client === 'codex' ? { block: tomlBlock(desired) } : {}), pending: true };
            await persist();
          }
          // Persisted intent plus original backup lets rollback recover a crash on either side of this write.
          const finalCheck = await fileState(file);
          if (finalCheck.hash !== before.hash || finalCheck.present !== before.present) throw new Error('Client configuration changed before mutation; its current content was preserved.');
          if (remove) { if (before.present) await fs.unlink(file); }
          else if (after !== before.text) await atomicWrite(file, after, uninstall && before.hash === saved.installedHash ? saved.previous.mode : before.mode);
          if (uninstall) delete manifest.entries[client]; else delete manifest.entries[client].pending;
          await persist();
        }
        results.push({ client, path: file, action, dryRun, ...(uninstall ? {} : { command: node, args: desired.args, timeoutSeconds: 1800 }) });
      } catch (error) { results.push({ client, path: file, action: 'conflict', reason: error.message }); }
    }
    return { ok: !results.some(result => result.action === 'conflict'), dryRun, manifest: manifestFile, results };
  } finally { if (lock) await fs.rmdir(lock); }
}

async function main(args) {
  const options = {};
  const fields = { '--repo': 'repo', '--home': 'home', '--codex-home': 'codexHome', '--claude-config': 'claudeConfigFile' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (fields[arg]) { if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`); options[fields[arg]] = args[++index]; }
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--diagnostics') options.diagnostics = true;
    else if (arg === '--uninstall' || arg === '--rollback') options.uninstall = true;
    else if (arg === '--help') { console.log('node scripts/install-bridge.mjs [--repo PATH] [--home PATH] [--codex-home PATH] [--claude-config PATH] [--dry-run] [--diagnostics] [--uninstall | --rollback]'); return; }
    else throw new Error(`Unknown bridge installer argument: ${arg}`);
  }
  const result = await installBridge(options); console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
