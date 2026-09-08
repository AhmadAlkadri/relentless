#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dataHome, json } from '../src/storage.mjs';
import { protocol, portable, repo } from '../src/protocol.mjs';

const args = process.argv.slice(2), command = args[0] || 'open';
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const noOpen = args.includes('--no-open');
async function connection(start = true) {
  const file = path.join(dataHome(), 'server.json'); let state = json(file, null);
  const alive = async s => { try { return (await fetch(`${s.origin}/api/state`, { headers: { Authorization: `Bearer ${s.token}` }, signal: AbortSignal.timeout(1000) })).ok; } catch { return false; } };
  if (state && await alive(state)) return state;
  if (!start) throw new Error('Relentless is not running.');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve'], { cwd: repo, stdio: 'ignore', detached: true, env: process.env }); child.unref();
  for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 100)); state = json(file, null); if (state && await alive(state)) return state; }
  throw new Error('Server did not start. Run relentless serve in a terminal for diagnostics.');
}
async function api(state, route, body) { const r = await fetch(`${state.origin}/api/${route}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${state.token}`, Origin: state.origin, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const result = await r.json(); if (!r.ok) throw new Error(result.error); return result; }
function open(state, session = '', tune = false) { const url = `${state.origin}/#token=${state.token}&session=${session}${tune ? '&tune=1' : ''}`; if (!noOpen) spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' }).unref(); console.log(noOpen ? url : `Relentless opened at ${state.origin}${session ? ` (session ${session})` : ''}`); }
try {
  if (command === 'serve') { const { startServer } = await import('../src/server.mjs'); const s = await startServer({ port: Number(option('--port') || 0) }); console.log(`Relentless listening on ${s.origin}`); const stop = async () => { await s.close(); process.exit(0); }; process.on('SIGTERM', stop); process.on('SIGINT', stop); }
  else if (command === 'doctor') {
    const versions = {}; for (const cli of ['codex', 'claude', 'node', 'gh']) { try { versions[cli] = execFileSync(cli, ['--version'], { encoding: 'utf8' }).split('\n')[0]; } catch { versions[cli] = 'unavailable'; } }
    let codexAuth, claudeAuth; try { codexAuth = execFileSync('codex', ['login', 'status'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() || 'See codex login status'; } catch { codexAuth = 'unavailable'; }
    try { const c = JSON.parse(execFileSync('claude', ['auth', 'status'], { encoding: 'utf8' })); claudeAuth = { loggedIn: c.loggedIn, authMethod: c.authMethod, subscriptionType: c.subscriptionType }; } catch { claudeAuth = 'unavailable'; }
    console.log(JSON.stringify({ versions, codexAuth, claudeAuth, source: repo, storage: dataHome(), protocol: protocol().version }, null, 2));
    const { install } = await import('../scripts/install.mjs'); console.log(JSON.stringify(await install({ repo, diagnostics: true }), null, 2));
  }
  else if (command === 'install' || command === 'uninstall') { const { install } = await import('../scripts/install.mjs'); console.log(JSON.stringify(await install({ repo, uninstall: command === 'uninstall', dryRun: args.includes('--dry-run') }), null, 2)); }
  else if (command === 'stop') { console.log(await api(await connection(false), 'stop', {})); }
  else if (command === 'portable' && !args[1]) console.log(portable());
  else if (['open', 'new', 'resume', 'tune', 'print', 'portable', 'path'].includes(command)) {
    const state = await connection(); let id = args[1];
    if (command === 'new') {
      let context = ''; if (args.includes('--context-stdin')) for await (const chunk of process.stdin) { context += chunk; if (context.length > 100000) throw new Error('Context packet exceeds 100 KB.'); }
      const s = await api(state, 'new', { title: option('--title') || (option('--project') ? path.basename(option('--project')) : 'Untitled idea'), project: option('--project'), backend: option('--backend') || 'codex', context }); id = s.id; console.log(`Markdown: ${s.path}`);
    }
    if (['print', 'portable', 'path'].includes(command)) { const s = await api(state, `sessions/${id}`); if (command === 'path') console.log(s.path); else console.log((await api(state, `sessions/${id}/${command === 'portable' ? 'export' : 'print'}`, { revision: s.revision })).text); }
    else open(state, command === 'open' ? '' : id || '', command === 'tune');
  } else console.log('Usage: relentless [new --project PATH --backend codex|claude | resume ID | tune ID | path ID | print ID | portable [ID] | doctor | stop | uninstall]\nOptions: --no-open, --title TEXT, --context-stdin. No shell configuration changes are needed.');
} catch (e) { console.error(`Relentless: ${e.message}`); process.exitCode = 1; }
