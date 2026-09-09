import path from 'node:path';
import { spawn } from 'node:child_process';
import { dataHome, json } from './storage.mjs';
import { repo } from './protocol.mjs';

export async function connection(start = true) {
  const file = path.join(dataHome(), 'server.json');
  const alive = async s => { try { return s && (await fetch(`${s.origin}/api/state`, { headers: { Authorization: `Bearer ${s.token}` }, signal: AbortSignal.timeout(1000) })).ok; } catch { return false; } };
  let state = json(file, null);
  if (await alive(state)) return state;
  if (!start) throw new Error('Relentless is not running.');
  const child = spawn(process.execPath, [path.join(repo, 'bin/relentless.mjs'), 'serve'], { cwd: repo, stdio: 'ignore', detached: true }); child.unref();
  for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 100)); state = json(file, null); if (await alive(state)) return state; }
  throw new Error('Server did not start. Run relentless serve for diagnostics.');
}
export async function api(state, route, body, { bridge = false, signal } = {}) {
  const response = await fetch(`${state.origin}/api/${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${bridge ? state.bridgeToken : state.token}`, Origin: state.origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal });
  const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
}
export function openBrowser(state, session) {
  if (process.env.RELENTLESS_NO_OPEN === '1') return;
  const child = spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [`${state.origin}/#token=${state.token}&session=${session}`], { stdio: 'ignore' }); child.on('error', () => {}); child.unref();
}
