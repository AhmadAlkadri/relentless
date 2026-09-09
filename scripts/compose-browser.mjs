// Synthetic composing regression: isolated Chromium and disposable attached sessions.
// No native client, real helper, installed service or private session is used.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startServer } from '../src/server.mjs';
import { Helpers } from '../src/helpers.mjs';
import { providers } from '../src/providers.mjs';

const baseline = process.argv.includes('--baseline');
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-compose-browser-')));
fs.chmodSync(root, 0o700);
const screenshots = path.join(root, 'screenshots'); fs.mkdirSync(screenshots);
const results = [], errors = [], external = [], mutations = [], localFailures = [];
let helperCalls = 0;
let server, browser, page, providerCalls = 0;
const originalProviders = { ...providers };
for (const key of Object.keys(providers)) providers[key] = async () => { providerCalls++; throw new Error('No provider is allowed in this synthetic fixture.'); };
async function bridge(operation, body) {
  const response = await fetch(`${server.origin}/api/bridge/${operation}`, { method: 'POST', headers: { Authorization: `Bearer ${server.bridgeToken}`, Origin: server.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json(); assert.ok(response.ok, JSON.stringify(value)); return value;
}
async function publish(f, body) { return bridge('publish_interview', { owner: f.owner, session: f.id, publicationId: randomUUID(), ...body }); }
async function fixture(title, questions = [{ id: 'scope', question: 'How should this synthetic equation be interpreted?', options: [{ label: 'Keep the boundary explicit' }] }]) {
  const project = path.join(root, randomUUID()); fs.mkdirSync(project); fs.writeFileSync(path.join(project, 'README.md'), '# Synthetic composing fixture\n');
  const owner = randomUUID();
  const opened = await bridge('open_interview', { owner, client: 'codex', nativeSessionId: `synthetic-${randomUUID()}`, cwd: project, title, intent: 'Review a synthetic equation. No implementation is authorized.' });
  const f = { id: opened.session, owner, project, title };
  await publish(f, { discussion: 'Compare **the boundary condition** with the proposed equation.', ...(questions.length ? { questions } : {}) });
  return f;
}
async function visit(f) {
  await page.goto(`${server.origin}/?fixture=${randomUUID()}#token=${server.token}&session=${f.id}`);
  await expect(page.locator('#session-title')).toHaveText(f.title);
  await expect(page.locator('#connection')).toHaveText('Connected locally');
}
async function shot(name) { await page.evaluate(() => scrollTo(0, 0)); const file = path.join(screenshots, `${name}.png`); await page.screenshot({ path: file, fullPage: true }); return file; }
async function check(name, fn) {
  try { await fn(); results.push({ name, status: 'pass' }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'fail', error: error.stack, screenshot: await shot('failure-' + results.length).catch(() => null) }); throw error; }
}
const source = String.raw`**Boundary condition** · 日本語 🪴

Use $u_i = \\alpha_i + \\beta$ and \\(\\lVert A_x v\\rVert_2\\).

$$
A_x = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}
$$

\\[\\int_0^1 u_x\\,dx = 0\\]

- Keep the exact source.
- Review before sending.`.replaceAll('\\\\', '\\');
try {
  server = await startServer({ root: path.join(root, 'private') });
  server.app.helpers = new Helpers(server.app, { runner: async () => { helperCalls++; return { text: source, providerId: 'synthetic-helper', model: 'synthetic-model' }; }, spawnTerminal: () => { throw new Error('No native terminal is allowed.'); } });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, colorScheme: 'light' });
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin !== server.origin && !['data:', 'about:'].includes(url.protocol)) { external.push(url.href); return route.abort(); } return route.continue(); });
  page = await context.newPage(); page.setDefaultTimeout(10000);
  await context.addInitScript(() => { window.composeCSP = []; document.addEventListener('securitypolicyviolation', e => window.composeCSP.push({ directive: e.violatedDirective, blocked: e.blockedURI })); });
  page.on('response', response => { if (response.status() >= 400 && !response.url().includes('/api/')) localFailures.push({ url: response.url(), status: response.status() }); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss());
  page.on('request', request => { if (request.method() === 'POST') mutations.push({ url: new URL(request.url()).pathname, body: request.postDataJSON() }); });
  console.log(`Synthetic fixture and screenshots: ${root}`);
  const a = await fixture('SYNTHETIC equation composition'); await visit(a);
  if (baseline) {
    await page.locator('#editor-draft').fill(source); await page.locator('#pending textarea').fill(source);
    await check('baseline has no draft preview or composition width control', async () => {
      assert.equal(await page.getByRole('button', { name: 'Split', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Expand', exact: true }).count(), 0);
      assert.equal(await page.locator('#composer .katex, #pending .katex').count(), 0);
      const width = await page.locator('.writing-column').evaluate(n => n.getBoundingClientRect().width);
      assert.equal(width, 760); console.log(`Baseline writing column: ${width}px at 1600px viewport`);
      await shot('baseline-no-preview-760px');
    });
  }
  else {
    const unchanged = server.store.read(a.id);
    const originalQuestion = structuredClone(server.store.meta(a.id).attachment.question);
    const main = page.locator('#composer .compose-view'), pending = page.locator('#pending .compose-view');
    await check('both answer surfaces render exact inline and display TeX before Markdown parsing', async () => {
      await page.locator('#editor-draft').fill(source); await page.locator('#pending textarea').fill(source);
      await main.getByRole('button', { name: 'Split', exact: true }).click(); await pending.getByRole('button', { name: 'Split', exact: true }).click();
      await expect(main.locator('.katex')).toHaveCount(4); await expect(pending.locator('.katex')).toHaveCount(4);
      const formulas = await main.locator('annotation').allTextContents();
      assert.deepEqual(formulas, [String.raw`u_i = \alpha_i + \beta`, String.raw`\lVert A_x v\rVert_2`, String.raw`
A_x = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}
`, String.raw`\int_0^1 u_x\,dx = 0`]);
      assert.equal(await main.locator('.compose-preview strong').textContent(), 'Boundary condition');
      assert.equal(await page.locator('#editor-draft').inputValue(), source); assert.equal(await page.locator('#pending textarea').inputValue(), source);
      await shot('split-before-expand');
      await main.getByRole('button', { name: 'Expand', exact: true }).click();
      assert.ok(await page.locator('.writing-column').evaluate(n => n.getBoundingClientRect().width > 1100));
      await shot('split-expanded');
    });
    await check('mode and width controls preserve source, caret, undo and authority', async () => {
      await page.locator('#editor-draft').evaluate(n => { n.focus(); n.setSelectionRange(9, 22, 'backward'); });
      await main.getByRole('button', { name: 'Preview', exact: true }).click();
      await expect(page.locator('#editor-draft')).toBeHidden();
      await main.locator('.compose-preview').focus(); await page.keyboard.press('Control+Enter');
      assert.equal(mutations.length, 0);
      await main.getByRole('button', { name: 'Write', exact: true }).click();
      assert.deepEqual(await page.locator('#editor-draft').evaluate(n => [n.selectionStart, n.selectionEnd, n.selectionDirection, document.activeElement === n]), [9, 22, 'backward', true]);
      await page.locator('#editor-draft').evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
      await page.keyboard.insertText(' undo marker');
      await main.getByRole('button', { name: 'Preview', exact: true }).click(); await main.getByRole('button', { name: 'Write', exact: true }).click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
      await expect(page.locator('#editor-draft')).toHaveValue(source);
      const longSource = source.repeat(15); await page.locator('#editor-draft').fill(longSource);
      const scroll = await page.locator('#editor-draft').evaluate(n => { n.scrollTop = 150; return n.scrollTop; }); assert.ok(scroll > 0);
      await main.getByRole('button', { name: 'Preview', exact: true }).click(); await main.getByRole('button', { name: 'Write', exact: true }).click();
      assert.equal(await page.locator('#editor-draft').evaluate(n => n.scrollTop), scroll);
      assert.equal(await page.locator('#editor-draft').inputValue(), longSource); await page.locator('#editor-draft').fill(source);
      for (const view of [main, pending]) {
        for (const mode of ['Preview', 'Split', 'Write', 'Split']) await view.getByRole('button', { name: mode, exact: true }).click();
        await view.getByRole('button', { name: 'Collapse', exact: true }).click(); await view.getByRole('button', { name: 'Expand', exact: true }).click();
      }
      assert.equal(mutations.length, 0); assert.equal(server.store.read(a.id).raw, unchanged.raw);
      assert.deepEqual(server.store.meta(a.id).attachment.question, originalQuestion);
      assert.deepEqual(server.store.meta(a.id).attachment.events, []); assert.equal(server.app.prompts.view(a.id), null);
    });
    await check('reload and actual polling retain both unsent buffers and local modes', async () => {
      await page.reload(); await expect(page.locator('#session-title')).toHaveText(a.title);
      for (const view of [main, pending]) { await expect(view).toHaveAttribute('data-mode', 'split'); await expect(view.locator('.katex')).toHaveCount(4); }
      await expect(page.locator('body')).toHaveClass(/compose-expanded/);
      const nextPoll = page.waitForResponse(r => r.url().endsWith(`/api/sessions/${a.id}`)); await nextPoll;
      assert.equal(await page.locator('#editor-draft').inputValue(), source); assert.equal(await page.locator('#pending textarea').inputValue(), source);
      assert.equal(mutations.length, 0); assert.equal(server.store.read(a.id).raw, unchanged.raw);
    });
    await check('composition events defer preview, survive polling, and do not submit', async () => {
      const before = await main.locator('.compose-preview').innerHTML();
      await page.locator('#editor-draft').evaluate(n => {
        n.focus(); n.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        n.value += '\n変換中 🪴'; n.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: '変換中 🪴' }));
        n.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', ctrlKey: true, isComposing: true }));
      });
      await page.waitForResponse(r => r.url().endsWith(`/api/sessions/${a.id}`));
      assert.equal(await main.locator('.compose-preview').innerHTML(), before);
      assert.equal(await page.locator('#editor-draft').inputValue(), source + '\n変換中 🪴');
      await page.locator('#editor-draft').evaluate(n => n.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '変換中 🪴' })));
      await expect(main.locator('.compose-preview')).toContainText('変換中 🪴'); assert.equal(mutations.length, 0);
      await page.locator('#editor-draft').fill(source);
    });
    await check('Markdown math delimiters, escapes, code, parser failures and restricted DOM', async () => {
      const details = await page.evaluate(async () => {
        const { cleanMarkdown } = await import('/markdown.js');
        function render(text) {
          const node = document.createElement('article'); node.className = 'markdown'; node.append(cleanMarkdown(text)); document.body.append(node);
          const result = { html: node.innerHTML, text: node.textContent, formulas: [...node.querySelectorAll('annotation')].map(n => n.textContent), errors: [...node.querySelectorAll('.math-source')].map(n => n.textContent), unsafe: node.querySelectorAll('script,img,iframe,object,style,[onerror],[onclick],[data-spoof]').length, links: [...node.querySelectorAll('a')].map(n => [n.getAttribute('href'), n.rel, n.target]), styled: [...node.querySelectorAll('.katex [style]')].some(n => n.style.height || n.style.top) };
          node.remove(); return result;
        }
        const tricky = render(String.raw`$\|A_{ij}\|_2$ and \(x_i^2\)

\[\begin{bmatrix}a&b\\c&d\end{bmatrix}\]

**Strong with $a_b + c_d$ intact**

$$
\frac{a_b}{c_d}

+ x
$$`);
        const literal = render('`$x_i$` and `\\(x_i\\)`\n\n```tex\n$$x_i$$\n\\[x_i\\]\n```\n\n~~~tex\n$x_i$\n~~~\n\n    $indented_i$\n\n\\$escaped\\$ and \\\\(escaped\\\\)\n\n<code>$raw_i$</code> and <pre>\\(raw\\)</pre>');
        const hostile = render(String.raw`<script>window.composeInjected = true</script><img src="https://preview-attack.invalid/image" onerror="window.composeInjected=true"><iframe src="https://preview-attack.invalid/frame"></iframe><span class="katex" data-spoof="yes" style="background:url(https://preview-attack.invalid/style)">RELENTLESSMATH0END</span>

![remote](https://preview-attack.invalid/md.png) [bad](javascript:window.composeInjected=true) [relative](/api/stop) [safe](https://example.com) [mail](mailto:synthetic@example.com)

$\href{javascript:window.composeInjected=true}{bad}$ $\href{https://preview-attack.invalid/link}{bad}$ $\url{https://preview-attack.invalid/url}$ $\includegraphics{https://preview-attack.invalid/tex.png}$ $\htmlStyle{background:url(https://preview-attack.invalid/x)}{x}$ $\htmlClass{spoof}{x}$ $\htmlData{spoof=yes}{x}$
` + '\n\n```relentless-question\n{"id":"protocol-canary","questions":[]}\n```');
        const invalid = render(String.raw`$\unknown{x}$ and $\frac{a$ and $\gdef\sessionmacro{x}\sessionmacro$ then $\sessionmacro$ and $\def\loop{\loop}\loop$`);
        const huge = render('$' + 'x'.repeat(12001) + '$');
        return { tricky, literal, hostile, invalid, huge: { errors: huge.errors.length, length: huge.errors[0].length }, injected: Boolean(window.composeInjected), csp: window.composeCSP };
      });
      assert.deepEqual(details.tricky.formulas, [String.raw`\|A_{ij}\|_2`, String.raw`x_i^2`, String.raw`\begin{bmatrix}a&b\\c&d\end{bmatrix}`, String.raw`a_b + c_d`, '\n\\frac{a_b}{c_d}\n\n+ x\n']);
      assert.equal(details.tricky.errors.length, 0); assert.equal(details.tricky.styled, true, 'KaTeX style properties work under unchanged CSP');
      assert.deepEqual(details.literal.formulas, []); assert.ok(details.literal.text.includes('$x_i$')); assert.ok(details.literal.text.includes('\\(x_i\\)'));
      assert.equal(details.hostile.unsafe, 0); assert.equal(details.injected, false); assert.ok(!details.hostile.text.includes('protocol-canary'));
      assert.deepEqual(details.hostile.links, [[null, 'noopener noreferrer', '_blank'], [null, 'noopener noreferrer', '_blank'], ['https://example.com', 'noopener noreferrer', '_blank'], ['mailto:synthetic@example.com', 'noopener noreferrer', '_blank']]);
      assert.ok(details.invalid.errors.includes(String.raw`$\unknown{x}$`)); assert.ok(details.invalid.errors.includes(String.raw`$\sessionmacro$`)); assert.ok(details.invalid.errors.includes(String.raw`$\def\loop{\loop}\loop$`));
      assert.deepEqual(details.huge, { errors: 1, length: 12003 }); assert.deepEqual(details.csp, []);
      fs.writeFileSync(path.join(root, 'render-security.json'), JSON.stringify(details, null, 2) + '\n');
      assert.deepEqual(external, []); assert.deepEqual(localFailures, []);
    });
    await check('session switches clear previews during loading and restore isolated drafts', async () => {
      const b = await fixture('SYNTHETIC separate session');
      await page.waitForResponse(r => r.url().endsWith('/api/state'));
      let release, intercepted;
      const paused = new Promise(resolve => { intercepted = resolve; });
      const gate = new Promise(resolve => { release = resolve; });
      const url = `${server.origin}/api/sessions/${b.id}`;
      await page.route(url, async route => { intercepted(); await gate; await route.continue(); });
      await page.locator('#sessions').getByRole('button', { name: b.title }).click(); await paused;
      await expect(page.locator('#session-view')).toBeHidden();
      for (const text of await page.locator('.compose-preview').allTextContents()) assert.equal(text, '');
      release(); await expect(page.locator('#session-title')).toHaveText(b.title); await page.unroute(url);
      assert.equal(await page.locator('#editor-draft').inputValue(), ''); assert.equal(await page.locator('#pending textarea').inputValue(), '');
      assert.equal(await page.locator('.compose-preview .katex').count(), 0);
      await page.locator('#pending textarea').fill('B only $b_i$');
      await page.locator('#sessions').getByRole('button', { name: a.title }).click(); await expect(page.locator('#session-title')).toHaveText(a.title);
      assert.equal(await page.locator('#editor-draft').inputValue(), source); assert.equal(await page.locator('#pending textarea').inputValue(), source);
      await expect(pending.locator('.katex')).toHaveCount(4); assert.ok(!(await pending.textContent()).includes('B only'));
      assert.equal(mutations.length, 0);
    });
    await check('question text refresh preserves pending source and updates preview safely', async () => {
      const s = server.store.read(a.id); fs.writeFileSync(s.path, s.raw.replace('How should this synthetic equation be interpreted?', 'Which synthetic boundary should be retained?'));
      await expect(page.locator('#pending legend')).toHaveText('Which synthetic boundary should be retained?');
      assert.equal(await page.locator('#pending textarea').inputValue(), source); await expect(pending.locator('.katex')).toHaveCount(4);
      assert.equal(mutations.length, 0);
    });
    await check('structured answer submits exact source only after Send, and next question starts empty', async () => {
      const exact = '\n \t' + source + ' \n\n'; await page.locator('#pending textarea').fill(exact);
      await pending.getByRole('button', { name: 'Preview', exact: true }).click();
      assert.equal(mutations.length, 0);
      await page.getByRole('button', { name: 'Send answer', exact: true }).click(); await expect(page.locator('#pending')).toBeHidden();
      assert.equal(mutations.length, 1); assert.ok(mutations[0].url.endsWith('/answer')); assert.equal(mutations[0].body.answers.scope, exact);
      assert.ok(!JSON.stringify(mutations[0].body).includes('<span')); assert.equal(server.store.meta(a.id).attachment.events.length, 1);
      assert.equal(server.store.meta(a.id).attachment.events[0].kind, 'answer'); assert.equal(server.store.meta(a.id).mode, 'interview');
      const event = await bridge('await_interview', { owner: a.owner, session: a.id, waitMs: 1 }); assert.equal(event.authorized, false);
      await bridge('await_interview', { owner: a.owner, session: a.id, acknowledge: event.eventId, waitMs: 1 });
      await publish(a, { discussion: 'The synthetic answer was received.', questions: [{ id: 'scope', question: 'A new synthetic question?' }] });
      await expect(page.locator('#pending legend')).toHaveText('A new synthetic question?');
      assert.equal(await page.locator('#pending textarea').inputValue(), ''); assert.equal(await pending.locator('.katex').count(), 0);
      await expect(page.locator('#conversation .katex')).toHaveCount(4);
    });
    await check('main Continue submits exact source and clears its formatted view', async () => {
      const exact = '\n \t' + source + ' \n\n'; await page.locator('#editor-draft').fill(exact);
      await main.getByRole('button', { name: 'Preview', exact: true }).click(); assert.equal(mutations.length, 1);
      await page.locator('#continue-button').click(); await expect(page.locator('#editor-draft')).toHaveValue('');
      await expect(main.locator('.katex')).toHaveCount(0);
      assert.equal(mutations.length, 2); assert.ok(mutations[1].url.endsWith('/turn')); assert.equal(mutations[1].body.action, 'continue'); assert.equal(mutations[1].body.text, exact);
      assert.equal(server.store.meta(a.id).attachment.events.length, 2); assert.equal(server.store.meta(a.id).mode, 'interview');
      await expect(page.locator('#conversation .katex')).toHaveCount(8);
    });
    await check('batched question answers retain independent source and deliberate submission', async () => {
      const f = await fixture('SYNTHETIC two question answers', [{ id: 'first', question: 'First synthetic equation?' }, { id: 'second', question: 'Second synthetic equation?' }]); await visit(f);
      const fields = page.locator('#pending .compose-view'), start = mutations.length;
      await fields.nth(0).getByRole('button', { name: 'Write', exact: true }).click(); await fields.nth(1).getByRole('button', { name: 'Write', exact: true }).click();
      await fields.nth(0).locator('textarea').fill(source); await fields.nth(1).locator('textarea').fill('Independent $b_j$ · 日本語');
      await fields.nth(0).getByRole('button', { name: 'Preview', exact: true }).click(); await fields.nth(1).getByRole('button', { name: 'Split', exact: true }).click();
      await expect(fields.nth(0).locator('.katex')).toHaveCount(4); await expect(fields.nth(1).locator('.katex')).toHaveCount(1);
      assert.equal(mutations.length, start); await page.reload(); await expect(page.locator('#pending .compose-view')).toHaveCount(2);
      assert.equal(await fields.nth(0).locator('textarea').inputValue(), source); assert.equal(await fields.nth(1).locator('textarea').inputValue(), 'Independent $b_j$ · 日本語');
      await page.getByRole('button', { name: 'Send answer', exact: true }).click(); await expect(page.locator('#pending')).toBeHidden();
      assert.equal(mutations.length, start + 1); assert.deepEqual(mutations.at(-1).body.answers, { first: source, second: 'Independent $b_j$ · 日本語' });
      assert.equal(server.store.meta(f.id).attachment.events.length, 1); assert.equal(server.store.meta(f.id).mode, 'interview');
    });
    await check('returned synthetic helper draft has local preview without implicit insertion or submission', async () => {
      const f = await fixture('SYNTHETIC helper preview', []); await visit(f);
      const start = mutations.length; await page.locator('#helper-start').click();
      await expect(page.locator('.helper-card textarea')).toHaveValue(source); assert.equal(helperCalls, 1);
      const helper = page.locator('.helper-card .compose-view'); await helper.getByRole('button', { name: 'Split', exact: true }).click();
      await expect(helper.locator('.katex')).toHaveCount(4); assert.equal(mutations.length, start + 1);
      assert.ok(mutations.at(-1).url.endsWith('/helper-start')); assert.equal(server.store.meta(f.id).attachment.events.length, 0);
      assert.equal(await page.locator('#editor-draft').inputValue(), '');
      await page.getByRole('button', { name: 'Use this draft', exact: true }).click();
      await expect(page.locator('#editor-draft')).toHaveValue(source); assert.equal(mutations.length, start + 1);
      await expect(main).toHaveAttribute('data-mode', 'write');
    });
    await check('narrow layouts stack Split with long math, tables and source contained', async () => {
      const f = await fixture('SYNTHETIC narrow equations'); await visit(f);
      await publish(f, { discussion: 'A long inline equation: $' + 'x_i+'.repeat(150) + '0$. One indivisible expression: $\\text{' + 'W'.repeat(180) + '}$. Its exact source stays in Markdown.' });
      await expect(page.locator('#conversation .katex')).toHaveCount(2);
      const long = source + '\n\n$$' + 'x_i+'.repeat(150) + '0$$\n\n| Heading | Value |\n|---|---|\n| ' + 'wide'.repeat(100) + ' | bounded |';
      await main.getByRole('button', { name: 'Write', exact: true }).click(); await pending.getByRole('button', { name: 'Write', exact: true }).click();
      await page.locator('#editor-draft').fill(long); await page.locator('#pending textarea').fill(long);
      await main.getByRole('button', { name: 'Split', exact: true }).click(); await pending.getByRole('button', { name: 'Split', exact: true }).click();
      for (const width of [820, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        for (const view of [main, pending]) {
          const rectangles = await view.evaluate(n => { const area = n.querySelector('textarea').getBoundingClientRect(), preview = n.querySelector('.compose-preview').getBoundingClientRect(); return { areaBottom: area.bottom, previewTop: preview.top }; });
          assert.ok(rectangles.previewTop >= rectangles.areaBottom, `Split stacks at ${width}px`);
        }
        const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, nodes: [...document.querySelectorAll('body *')].filter(n => (n.getBoundingClientRect().right > innerWidth || n.scrollWidth > n.clientWidth + 1) && !n.closest('.compose-preview')).slice(0, 15).map(n => [n.tagName, n.id, n.className, n.getBoundingClientRect().right, n.scrollWidth, n.clientWidth]) }));
        assert.ok(overflow.scroll <= width, `No page overflow at ${width}px: ${JSON.stringify(overflow)}`);
        assert.equal(await page.locator('#editor-draft').inputValue(), long); assert.equal(await page.locator('#pending textarea').inputValue(), long);
        if (width === 390) await shot('narrow-stacked-390px');
      }
      await page.setViewportSize({ width: 1600, height: 1100 });
      await page.locator('#editor-draft').fill(source); await page.locator('#pending textarea').fill(source);
      await main.getByRole('button', { name: 'Preview', exact: true }).click(); await pending.getByRole('button', { name: 'Preview', exact: true }).click();
      await shot('single-pane-preview');
      await main.getByRole('button', { name: 'Split', exact: true }).click(); await pending.getByRole('button', { name: 'Split', exact: true }).click(); await shot('final-expanded-split');
    });
    assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(localFailures, []); assert.equal(providerCalls, 0);
    assert.deepEqual(await page.evaluate(() => window.composeCSP), []);
  }

} finally {
  const report = { baseline, root, node: process.version, browser: browser?.version(), results, errors, external, mutations, providerCalls, helperCalls, localFailures };
  fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  Object.assign(providers, originalProviders); await browser?.close(); await server?.close();
  console.log(`Report: ${path.join(root, 'report.json')}`);
}
