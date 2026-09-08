// Opt-in real Claude question callback, or a deterministic synthetic UI check.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.mjs';
import { providers } from '../src/providers.mjs';
import { replaceSection } from '../src/storage.mjs';
const backend = process.argv[2] || 'mock';
if (!['mock', 'claude'].includes(backend)) throw new Error('Choose mock or claude explicitly.');
process.env.RELENTLESS_TEST = '1';
const original = providers[backend];
providers[backend] = backend === 'claude' ? opts => original({ ...opts, prompt: opts.prompt + '\nSynthetic integration check: use the available AskUserQuestion tool for one consequential question about reading-list intent before concluding this turn. Provide two example options but welcome free-form answers. After the tool answer, respond to its actual content and finish. Do not ask a second tool question.' }) : async opts => {
  await opts.saveId('synthetic-question-provider', { model: 'mock' });
  const question = 'What would make this reading list useful?';
  const reply = await opts.interact({ kind: 'question', questions: [{ id: question, question, options: [{ label: 'Find next book' }, { label: 'Remember what I read' }] }] });
  const text = `Your answer: ${reply.answers[question]}`; opts.emit({ type: 'delta', text }); return { text };
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), `relentless-question-${backend}-`));
const project = path.join(root, 'project'); fs.mkdirSync(project); fs.writeFileSync(path.join(project, 'README.md'), '# SYNTHETIC reading list\nA personal reading list idea. No implementation exists.\n');
const server = await startServer({ root: path.join(root, 'private') });
const session = server.store.create({ backend, project, title: 'SYNTHETIC question card', context: 'Help me think through a small personal reading list. I have not decided what matters most.' });
const browser = await chromium.launch({ channel: 'chrome', headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } }); const errors = []; page.on('pageerror', e => errors.push(e.message));
const timer = setTimeout(() => server.app.pause(session.id), 180000);
try {
  console.log(`Fixture ${root}`);
  await page.goto(`${server.origin}/#token=${server.token}&session=${session.id}`);
  await page.locator('#interview-button').click();
  await page.getByRole('button', { name: 'Use saved Markdown draft' }).waitFor({ timeout: 150000 });
  const answer = 'Help me think through this. I forget why a book interested me, but I do not want a productivity tracker. 日本語 🪴';
  const s = server.store.read(session.id), replacement = s.path + '.editor'; fs.writeFileSync(replacement, replaceSection(s.raw, 'draft', answer)); fs.renameSync(replacement, s.path);
  await page.waitForFunction(expected => document.getElementById('editor-draft').value === expected, answer);
  await page.getByRole('button', { name: 'Use saved Markdown draft' }).click();
  assert.equal(await page.locator('#pending textarea').inputValue(), answer);
  const done = server.app.active.done; await page.getByRole('button', { name: 'Send answer', exact: true }).click(); await done;
  assert.equal(server.store.meta(session.id).status, 'idle', server.store.meta(session.id).error);
  assert.ok(server.store.read(session.id).values.conversation.includes(answer));
  await page.waitForTimeout(1200); fs.mkdirSync('output/playwright', { recursive: true }); await page.screenshot({ path: `output/playwright/${backend}-question.png`, fullPage: true });
  console.log(`PASS ${backend} structured question, external Markdown answer, unrestricted free-form callback, and follow-up`);
  if (backend === 'claude') {
    await page.locator('#editor-draft').fill('Synthetic cancellation check: help me think through the tradeoff in more detail.');
    await page.locator('#continue-button').click(); await page.locator('#pause-button').waitFor({ state: 'visible' });
    const active = server.app.active; await page.locator('#pause-button').click(); if (active) await active.done;
    assert.equal(server.store.meta(session.id).status, 'paused'); console.log('PASS live Claude cancellation');
  }
  assert.deepEqual(errors, []); assert.deepEqual(fs.readdirSync(project), ['README.md']);
} finally { clearTimeout(timer); providers[backend] = original; await browser.close(); await server.close(); }
