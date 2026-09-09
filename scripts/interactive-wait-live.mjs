// Opt-in Claude interactive PTY test, with no keystroke injection or transcript access.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { startServer } from '../src/server.mjs';
import { repo } from '../src/protocol.mjs';
import { bridgeConfiguration, BRIDGE_TOOLS } from './install-bridge.mjs';
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-interactive-'))), project = path.join(root, 'project'); fs.mkdirSync(project);
const host = await startServer({ root: path.join(root, 'private') });
const nativeId = randomUUID(), permissionTools = BRIDGE_TOOLS.map(t => `mcp__relentless__${t}`);
const mcp = { mcpServers: { relentless: { ...bridgeConfiguration(repo, 'claude'), env: { RELENTLESS_HOME: host.store.root, RELENTLESS_NO_OPEN: '1' } } } };
const args = ['--model', 'claude-fable-5', '--restricted', '--setting-sources', '', '--strict-mcp-config', '--mcp-config', JSON.stringify(mcp), '--tools', '', '--allowedTools', ...permissionTools, '--permission-mode', 'dontAsk', '--settings', '{"disableAllHooks":true,"autoMemoryEnabled":false}'];
async function until(check, ms=180000) { const start=Date.now(); while(Date.now()-start<ms) { const v=await check(); if(v)return v; await new Promise(r=>setTimeout(r,200)); } throw new Error('Interactive fixture boundary timed out'); }
const baseline=spawn('claude',['-p','--session-id',nativeId,...args,'--output-format','stream-json','--verbose'],{cwd:project,stdio:['pipe','pipe','pipe']});
let before='';baseline.stdout.on('data',b=>before+=b);baseline.stderr.on('data',()=>{});baseline.stdin.end('Synthetic test. Remember: AMBER-842; no accounts or network. Do not use tools yet. Repeat the constraint.');
let terminal,browser, output='';
console.log(JSON.stringify({root,nativeId,phase:'baseline'}));
try {
 assert.equal(await new Promise(r=>baseline.on('exit',r)),0);fs.writeFileSync(path.join(root,'before.json'),before);assert.match(before,/AMBER-842/);
 const instruction=`Continue this exact original conversation. Use Relentless MCP open_interview with cwd ${JSON.stringify(project)}, nativeSessionId ${nativeId}, title Synthetic interactive wait. Publish substantive discussion recalling the earlier constraint and a question asking what to preserve. Call await_interview with the default long wait. The user will think for more than 2 minutes. If Claude backgrounds the call, that question is STILL PENDING. Await the native background task notification; do not duplicate questions or interpret it as completion. When the answer arrives, acknowledge its event with one waitMs 1 acknowledgment. Publish the remembered constraint and user answer into the sidecar, then another long wait. On Return, acknowledge and end this interview without implementation. Stay in this original session. Never run a provider or another interviewer.`;
 terminal=spawn('/usr/bin/script',['-qF',path.join(root,'terminal-output.txt'),'claude','--resume',nativeId,...args,instruction],{cwd:project,stdio:['pipe','pipe','pipe'],detached:true,env:{...process.env,TERM:'xterm-256color'}});
 terminal.stdout.on('data',b=>{output=(output+b).slice(-400000);});terminal.stderr.on('data',b=>{output=(output+b).slice(-400000);});
 const id=await until(()=>host.store.list().find(m=>m.attachment)?.id);
 await until(()=>host.app.attachments.waiters.has(id));
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(`${host.origin}/#token=${host.token}&session=${id}`);
 const start=Date.now();console.log(JSON.stringify({phase:'interactive-wait',seconds:150}));await new Promise(r=>setTimeout(r,150000));
 assert.equal(host.store.meta(id).attachment.events.length,0);
 await page.getByRole('textbox',{name:/^Answer:/}).fill('Preserve local-only storage and the AMBER-842 constraint. No implementation.');await page.getByRole('button',{name:'Send answer',exact:true}).click();
 await until(()=>host.store.meta(id).attachment.events.some(e=>e.kind==='answer'&&e.ack));
 await until(()=>host.app.attachments.waiters.has(id));
 await page.getByRole('button',{name:'Return to terminal',exact:true}).click();await until(()=>host.store.meta(id).attachment.state==='returned');
 await page.screenshot({path:path.join(root,'returned.png'),fullPage:true});
 const evidence={nativeId,root,waitMilliseconds:Date.now()-start,questionPublications:host.store.meta(id).attachment.publications.length,events:host.store.meta(id).attachment.events.map(e=>({kind:e.kind,ack:!!e.ack})),hasConstraint:host.store.read(id).values.conversation.includes('AMBER-842'),backgroundMention:/background/i.test(output),sessionState:host.store.meta(id).attachment.state,transport:'real Claude interactive CLI in a fresh PTY; initial prompt argument, no keystroke injection'};
 fs.writeFileSync(path.join(root,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
} finally { fs.writeFileSync(path.join(root,'captured-output.txt'),output); if(terminal?.pid) try{process.kill(-terminal.pid,'SIGTERM');}catch{} await browser?.close();await host.close(); }
