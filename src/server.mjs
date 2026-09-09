import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Store, dataHome, Fault, hash, atomic, scopeHash, json } from './storage.mjs';
import { Workspace, checkProject } from './service.mjs';
import { repo, protocol } from './protocol.mjs';

export async function startServer({ root = dataHome(), port = 0, bridgeWaitMs = 240000 } = {}) {
  // Node fetch's default response-header budget is 300 seconds. Bound each HTTP
  // wait below that deadline; the native caller continues on an idle pending
  // result. Fixtures may shorten this interval, never increase it.
  const bridgeWaitLimit = Math.max(1, Math.min(Number(bridgeWaitMs) || 240000, 240000));
  const store = new Store(root, repo), token = randomBytes(32).toString('hex'), bridgeToken = randomBytes(32).toString('hex');
  const lock = path.join(store.root, 'server.lock');
  try { const fd = fs.openSync(lock, 'wx', 0o600); fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd); }
  catch (e) { const pid = Number(fs.readFileSync(lock, 'utf8')); let alive = false; try { process.kill(pid, 0); alive = true; } catch {} if (alive) throw new Error('A Relentless server already owns this storage directory.'); fs.unlinkSync(lock); const fd = fs.openSync(lock, 'wx', 0o600); fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd); }
  const app = new Workspace(store);
  let origin;
  const staticFiles = {
    '/': ['public/index.html', 'text/html'], '/markdown.js': ['public/markdown.js', 'text/javascript'], '/compose.js': ['public/compose.js', 'text/javascript'], '/app.js': ['public/app.js', 'text/javascript'], '/style.css': ['public/style.css', 'text/css'],
    '/vendor/katex.js': ['node_modules/katex/dist/katex.mjs', 'text/javascript'], '/vendor/katex.css': ['node_modules/katex/dist/katex.min.css', 'text/css'],
    '/vendor/marked.js': ['node_modules/marked/lib/marked.esm.js', 'text/javascript'], '/vendor/purify.js': ['node_modules/dompurify/dist/purify.es.mjs', 'text/javascript']
  };
  // Serve only shipped KaTeX font names; no request path is joined to disk.
  for (const font of fs.readdirSync(path.join(repo, 'node_modules/katex/dist/fonts'))) {
    if (/^KaTeX_[A-Za-z0-9-]+\.(?:woff2?|ttf)$/.test(font)) staticFiles[`/vendor/fonts/${font}`] = [`node_modules/katex/dist/fonts/${font}`, font.endsWith('.woff2') ? 'font/woff2' : font.endsWith('.woff') ? 'font/woff' : 'font/ttf'];
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cache-Control', 'no-store');
    const respond = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      if (req.headers.host !== new URL(origin).host) throw new Fault('Invalid local host.', 403);
      if (req.headers.origin && req.headers.origin !== origin) throw new Fault('Cross-origin access is not allowed.', 403);
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) throw new Fault('Cross-site access is not allowed.', 403);
      const url = new URL(req.url, origin);
      if (req.method === 'GET' && staticFiles[url.pathname]) { const [file, type] = staticFiles[url.pathname]; res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); res.end(fs.readFileSync(path.join(repo, file))); return; }
      const supplied = req.headers.authorization?.replace(/^Bearer /, '') || '';
      const bridgeRoute = url.pathname.startsWith('/api/bridge/'), expected = bridgeRoute ? bridgeToken : token;
      if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new Fault('Open this workspace through the local relentless command.', 401);
      if (req.method !== 'GET' && req.headers.origin !== origin) throw new Fault('A matching local Origin is required.', 403);
      let body = {};
      if (req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) throw new Fault('JSON required.', 415);
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 2_100_000) throw new Fault('Request too large.', 413); }
        try { body = JSON.parse(raw || '{}'); } catch { throw new Fault('Invalid JSON.'); }
      }
      if (bridgeRoute && req.method === 'POST') {
        const name = url.pathname.slice('/api/bridge/'.length); let result;
        if (!/^[a-f0-9-]{36}$/.test(body.owner || '')) throw new Fault('Native connection ownership is required.');
        if (name === 'open_interview') result = app.attachments.open(body.owner, body);
        else if (name === 'publish_interview') result = app.attachments.publish(body.owner, body);
        else if (name === 'attachment_status') result = app.attachments.snapshot(app.attachments.state(body.session, body.owner));
        else if (name === 'await_interview') {
          const controller = new AbortController(); res.on('close', () => controller.abort());
          result = await app.attachments.wait(body.owner, { ...body, waitMs: Math.min(Number(body.waitMs) || bridgeWaitLimit, bridgeWaitLimit) }, controller.signal);
        }
        else if (name === 'disconnect') { app.attachments.disconnect(body.owner); result = { disconnected: true, authorized: false }; }
        else throw new Fault('Unknown bridge operation.', 404);
        respond(200, result); return;
      }
      if (url.pathname === '/api/state' && req.method === 'GET') { const items = store.worklist(); respond(200, { sessions: store.list().map(m => { if (!m.attachment) return m; const { owner, ...attachment } = m.attachment; return { ...m, attachment }; }), worklist: items, worklistRevision: hash(JSON.stringify(items)), root: store.root, protocol: protocol().version, active: app.active?.id, testMode: process.env.RELENTLESS_TEST === '1', preferences: app.preferences() }); return; }
      if (url.pathname === '/api/new' && req.method === 'POST') { if (body.backend === 'mock' && process.env.RELENTLESS_TEST !== '1') throw new Fault('Synthetic backend is disabled.'); respond(200, store.create(body)); return; }
      if (url.pathname === '/api/worklist' && req.method === 'POST') { respond(200, store.saveWorklist(body.items, body.revision)); return; }
      if (url.pathname === '/api/stop' && req.method === 'POST') { if (app.active) app.pause(app.active.id); respond(200, { stopping: true }); setTimeout(() => close(), 2000).unref(); return; }
      const match = url.pathname.match(/^\/api\/sessions\/([a-f0-9-]{36})(?:\/([a-z-]+))?$/);
      if (!match) throw new Fault('Route not found.', 404);
      const [, id, operation] = match;
      if (req.method === 'GET' && !operation) { const view = app.view(id); respond(200, { ...view, scope: view.values ? scopeHash(view.values, view.meta.project) : null }); return; }
      if (req.method === 'GET' && operation === 'recovery') {
        store.meta(id); const prefix = `${id}-`;
        const files = fs.readdirSync(path.join(store.root, 'recovery')).filter(f => f.startsWith(prefix) && f.endsWith('.md'));
        respond(200, { files: files.map(f => ({ name: f, text: fs.readFileSync(path.join(store.root, 'recovery', f), 'utf8') })) }); return;
      }
      if (req.method !== 'POST') throw new Fault('Unsupported method.', 405);
      let result;
      if (operation === 'save') { result = body.section ? store.update(id, body.section, body.text, body.revision) : store.save(id, body.raw, body.revision); if (app.buildChanged(result)) app.pause(id); }
      else if (operation === 'turn') result = await app.begin(id, body);
      else if (operation === 'answer') result = app.answer(id, body);
      else if (operation === 'pause') result = app.pause(id);
      else if (operation === 'print') result = await app.print(id, body.revision);
      else if (operation === 'prompt-edit') result = app.prompts.edit(id, body);
      else if (operation === 'return') result = app.attachments.user(id, { action: 'return', requestId: body.requestId });
      else if (operation === 'helper-start') result = await app.helpers.start(id, body);
      else if (operation === 'helper-cancel') result = app.helpers.cancel(id);
      else if (operation === 'helper-discuss') result = await app.helpers.discuss(id, body);
      else if (operation === 'export') result = app.export(id);
      else if (operation === 'acknowledge') result = app.acknowledge(id);
      else if (operation === 'reconcile') result = await app.reconcile(id);
      else if (operation === 'tune-decision') result = app.tuneDecision(id, body);
      else if (operation === 'rename') { const m = store.meta(id); if (app.active?.id === id) throw new Fault('Pause before changing the session title.', 409); if (typeof body.title !== 'string' || body.title.length > 250 || !body.title.trim()) throw new Fault('Invalid title.'); m.title = body.title; store.setMeta(id, m); result = m; }
      else throw new Fault('Operation not found.', 404);
      respond(200, result);
    } catch (e) { if (!res.headersSent) respond(e.status || 500, { error: e.message }); else res.end(); }
  });
  const listenerFile = path.join(store.root, 'listener.json');
  const preferredPort = port || json(listenerFile, {}).port || 0;
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(preferredPort, '127.0.0.1', resolve); }); }
  catch (e) { fs.unlinkSync(lock); throw new Error(`Cannot bind the saved local port ${preferredPort}: ${e.code}. Stop the conflicting process or deliberately select a different port with relentless serve --port PORT.`); }
  origin = `http://127.0.0.1:${server.address().port}`;
  atomic(listenerFile, JSON.stringify({ port: server.address().port }));
  const stateFile = path.join(store.root, 'server.json'); atomic(stateFile, JSON.stringify({ pid: process.pid, origin, token, bridgeToken, root: store.root }));
  // Poll the actual Markdown inode, including replace/rename saves, to revoke a
  // running Build if its agreed scope is edited outside the browser.
  const watcher = setInterval(() => { if (app.active?.mode === 'build') { try { const s = store.read(app.active.id); checkProject(s.meta); if (app.buildChanged(s)) app.pause(s.id); } catch { app.pause(app.active.id); } } }, 500);
  let closed = false;
  async function close() { if (closed) return; closed = true; clearInterval(watcher); const helperTasks = [...app.helpers.running.entries()].map(([id, active]) => { app.helpers.cancel(id); return active.task; }); await Promise.allSettled(helperTasks); if (app.active) { app.pause(app.active.id); await Promise.race([app.active.done, new Promise(r => setTimeout(r, 5000))]); } server.closeAllConnections(); await new Promise(r => server.close(r)); if (Number(fs.readFileSync(lock, 'utf8')) === process.pid) fs.unlinkSync(lock); if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile); }
  return { server, app, store, origin, token, bridgeToken, close };
}
