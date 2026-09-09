// Opt-in real authenticated browser workflow, using an isolated browser profile.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.mjs';
import { replaceSection } from '../src/storage.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-browser-live-'));
const project = path.join(root, 'project'); fs.mkdirSync(project); fs.writeFileSync(path.join(project, 'README.md'), '# SYNTHETIC greeting project\nNo implementation yet.\n');
const server = await startServer({ root: path.join(root, 'private') });
const browser = await chromium.launch({ channel: 'chrome', headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const screenshotDir = path.resolve('output/playwright'); fs.mkdirSync(screenshotDir, { recursive: true });
let id;
async function finish(label) {
  await page.waitForFunction(() => !document.getElementById('pause-button').hidden, { timeout: 15000 }).catch(() => {});
  const start = Date.now(); while (server.app.active) {
    if (Date.now() - start > 180000) { server.app.pause(id); throw new Error(`${label} timed out`); }
    const pending = server.app.active.pending?.display;
    if (pending) throw new Error(`Unexpected pending ${pending.kind}; inspect fixture rather than auto-approve.`);
    await new Promise(r => setTimeout(r, 300));
  }
  const s = server.store.read(id); assert.equal(s.meta.status, 'idle', s.meta.error); await page.waitForTimeout(1300); console.log(`PASS ${label}`);
}
try {
  await page.goto(`${server.origin}/#token=${server.token}`); await page.locator('#new-button').click();
  await page.locator('input[name=title]').fill('SYNTHETIC live end-to-end thought'); await page.locator('input[name=project]').fill(project); await page.locator('textarea[name=context]').fill('I want a tiny greeting artifact for a local demo. Inspect the README and help me decide the smallest useful first step.');
  await page.getByRole('button', { name: 'Open thinking space' }).click(); await page.locator('#session-view').waitFor({ state: 'visible' });
  id = server.store.list()[0].id; console.log(`Fixture ${root}\nSession ${id}`);
  await page.locator('#interview-button').click(); await finish('real Codex question in browser');
  let s = server.store.read(id);
  const answer = 'Synthetic answer: the agreed first step is exactly hello.txt containing hello relentless followed by a newline. No other files, no Git initialization or commit. Preserve README.md. Do not implement until I press Build. Keep this small scope; do not reopen conventional encoding choices.';
  const raw = replaceSection(s.raw, 'draft', answer), replacement = s.path + '.editor-save'; fs.writeFileSync(replacement, raw); fs.renameSync(replacement, s.path);
  await page.waitForFunction(expected => document.getElementById('editor-draft').value === expected, answer);
  assert.equal(server.app.active, null); console.log('PASS external rename edit reached browser without model call');
  await page.reload(); await page.locator('#continue-button').click(); await finish('external answer and same provider thread resume');
  // Deliberately accept the concrete working scope into saved context.
  await page.locator('#context-button').click(); await page.locator('#editor-brief').fill('Create exactly hello.txt containing hello relentless followed by one newline. Preserve README.md. No other files, no Git initialization, no commit. Check exact bytes.'); await page.locator('[data-save=brief]').click();
  await page.locator('#summary-button').click(); await finish('Where are we');
  s = server.store.read(id); const savedDraft = s.values.draft;
  await page.locator('#editor-draft').fill('PRIVATE UNSENT DRAFT'); await page.locator('#print-button').click(); if (server.app.active) await finish('Print synthesis by standalone interviewer'); const output = await page.getByLabel('Working execution prompt', { exact: true }).inputValue(); assert.ok(output.includes('hello.txt')); assert.ok(!output.includes('PRIVATE UNSENT')); assert.equal(server.store.read(id).values.draft, savedDraft); await page.locator('#modal-close').click(); console.log('PASS Print retained one working prompt from public conversation');
  await page.locator('#build-details > summary').click(); await page.locator('#build-button').click(); await finish('explicit fixture Build');
  assert.equal(fs.readFileSync(path.join(project, 'hello.txt'), 'utf8'), 'hello relentless\n'); assert.deepEqual(fs.readdirSync(project).sort(), ['README.md', 'hello.txt']);
  assert.equal(await page.locator('#editor-draft').inputValue(), 'PRIVATE UNSENT DRAFT');
  await page.locator('#tune-button').click(); await finish('explicit Tune review');
  await page.screenshot({ path: path.join(screenshotDir, 'live-codex-workflow.png'), fullPage: true });
  await page.locator('#editor-draft').fill('SYNTHETIC long explanation for cancellation'); await page.locator('#continue-button').click(); await page.locator('#pause-button').waitFor({ state: 'visible' }); await page.locator('#pause-button').click();
  const active = server.app.active; if (active) await active.done;
  assert.equal(server.store.meta(id).status, 'paused'); console.log('PASS real cancellation from browser');
  assert.deepEqual(errors, []); console.log(`LIVE BROWSER DOGFOOD PASSED. Fixture and Markdown retained at ${root}`);
} finally { await browser.close(); await server.close(); }
