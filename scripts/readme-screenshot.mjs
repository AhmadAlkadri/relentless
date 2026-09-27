// README screenshot: isolated Chromium, disposable storage and a synthetic attached interview.
// No provider, native client, helper, installed service or private session is used.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const repo = path.resolve(import.meta.dirname, '..');
const output = path.join(repo, 'docs/images/relentless-workflow.png');
const width = Number(process.argv.find(a => a.startsWith('--width='))?.slice(8) || 1280);
const theme = process.argv.includes('--dark') ? 'dark' : 'light';
const realHome = os.homedir(), realUser = os.userInfo().username;
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-readme-')));
fs.chmodSync(root, 0o700);
// Isolate every default location before importing modules that may read them.
process.env.HOME = path.join(root, 'home'); fs.mkdirSync(process.env.HOME);
process.env.RELENTLESS_HOME = path.join(root, 'private');
const { startServer } = await import('../src/server.mjs');
const { Helpers } = await import('../src/helpers.mjs');
const { providers } = await import('../src/providers.mjs');
let providerCalls = 0;
for (const key of Object.keys(providers)) providers[key] = async () => { providerCalls++; throw new Error('No provider is allowed in the README fixture.'); };

// A short public path keeps the visible target generic.
const project = '/tmp/tidy-notes';
assert.ok(!fs.existsSync(project), `${project} already exists; remove it or choose another synthetic path.`);
fs.mkdirSync(project);
fs.writeFileSync(path.join(project, 'README.md'), '# tidy-notes\n\nA small synthetic CLI for tidying Markdown notes.\n');

const brief = 'Add an `archive` command to tidy-notes that moves finished notes out of the inbox without losing links. It must be safe to run on a real notes folder and easy to undo.';
const decisions = '- Archive into `notes/archive/YYYY/`.\n- Never delete a note; moves are reversible.\n- Keep the command offline and dependency-free.';
const facts = '- Notes are plain Markdown files.\n- Finished notes carry `status: done` in front matter.';
const firstQuestion = 'I read the README and the `notes/` layout: finished notes are marked `status: done`. Where should archived notes live?';
const firstAnswer = 'By year under `notes/archive/`. Never delete anything.';
const discussion = 'Settled. I printed a **provisional working prompt** below for your review.\n\nOne risk remains: other notes link to finished notes by relative path, so a move silently breaks those links. Should `archive` rewrite them, leave a stub behind, or only report them?';
const answer = 'Rewrite them, but show a dry-run diff first and only apply with `--yes`. Never touch files outside `notes/`.';
const workingPrompt = '# Add `tidy-notes archive`\n\nMove notes marked `status: done` into `notes/archive/YYYY/`. Never delete a note.\n\n1. Dry run: list planned moves. Verify with fixture notes.\n2. Apply with `--yes`. Verify each file moved once.\n\nOffline, no new dependencies.';

let server, browser;
async function bridge(operation, body) {
  const response = await fetch(`${server.origin}/api/bridge/${operation}`, { method: 'POST', headers: { Authorization: `Bearer ${server.bridgeToken}`, Origin: server.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json(); assert.ok(response.ok, JSON.stringify(value)); return value;
}
try {
  server = await startServer({ root: process.env.RELENTLESS_HOME });
  assert.ok(server.store.root.startsWith(root), 'storage must be the disposable directory');
  server.app.helpers = new Helpers(server.app, { runner: async () => { throw new Error('No helper is allowed.'); }, spawnTerminal: () => { throw new Error('No terminal is allowed.'); } });
  const owner = randomUUID();
  const opened = await bridge('open_interview', { owner, client: 'claude', nativeSessionId: `synthetic-${randomUUID()}`, cwd: project, title: 'tidy-notes: archive finished notes', intent: brief });
  const id = opened.session, publish = body => bridge('publish_interview', { owner, session: id, publicationId: randomUUID(), ...body });
  for (const [key, value] of Object.entries({ brief, decisions, facts })) server.store.update(id, key, value, server.store.read(id).revision);
  await publish({ discussion: firstQuestion });
  // The user's first reply travels through the same sidecar event the browser creates.
  server.app.attachments.user(id, { action: 'continue', text: firstAnswer, requestId: randomUUID() });
  const event = await bridge('await_interview', { owner, session: id, waitMs: 1 });
  await bridge('await_interview', { owner, session: id, acknowledge: event.eventId, waitMs: 1 });
  // Print: the interviewer publishes a provisional prompt with its explanation in one publication.
  const source = server.app.attachments.snapshot(server.store.read(id));
  await publish({ discussion, prompt: workingPrompt, sourceRevision: source.contextRevision, exchanges: source.exchanges, ready: false, blockers: ['Link handling is undecided.'] });

  // The answer being composed is an ordinary saved local draft; nothing is sent.
  server.store.update(id, 'draft', answer, server.store.read(id).revision);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  await context.route('**/*', route => new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort());
  await context.addInitScript(([theme]) => { localStorage.setItem('relentless-display', JSON.stringify({ theme, size: 16, width: 640, focus: false })); }, [theme]);
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  await page.goto(`${server.origin}/#token=${server.token}&session=${id}`);
  await expect(page.locator('#connection')).toHaveText('Connected locally');
  await expect(page.locator('#prompt-status')).toContainText('Provisional');
  await page.locator('#context-button').click();
  await page.locator('#editor-decisions').evaluate(n => { n.closest('details').open = true; });
  await page.locator('#build-details').evaluate(n => { n.open = true; });
  const visible = await page.locator('body').innerText();
  for (const secret of [realUser, realHome, root, server.token, server.bridgeToken]) assert.ok(!visible.includes(secret), 'visible text must stay synthetic');
  // One frame ending just below the explicit Build control; the sidebar fills the viewport.
  const bottom = await page.locator('#build-button').evaluate(n => n.getBoundingClientRect().bottom + scrollY);
  await page.setViewportSize({ width, height: Math.ceil(bottom + 28) });
  await page.evaluate(() => scrollTo(0, 0));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output });
  assert.equal(providerCalls, 0);
  console.log(`Wrote ${path.relative(repo, output)} (${theme}); disposable storage ${root}`);
} finally {
  await browser?.close(); await server?.close();
  fs.rmSync(project, { recursive: true, force: true }); fs.rmSync(root, { recursive: true, force: true });
}
