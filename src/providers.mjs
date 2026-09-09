import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse as parseToml } from 'smol-toml';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { contained, Fault } from './storage.mjs';

function tomlValue(v) { if (Array.isArray(v)) return `[${v.map(tomlValue).join(',')}]`; if (v && typeof v === 'object') return `{${Object.entries(v).map(([k,x]) => `${JSON.stringify(k)}=${tomlValue(x)}`).join(',')}}`; return JSON.stringify(v); }
export function codexTextChunk(stream, itemId, delta) {
  const chunk = (stream.text && stream.lastItem !== itemId ? '\n\n' : '') + delta;
  stream.lastItem = itemId; stream.text += chunk; return chunk;
}
export function codexCompletedText(messages) {
  const completed = [...messages].filter(item => item.type === 'agentMessage');
  const final = completed.filter(item => item.phase === 'final_answer').at(-1);
  const text = final?.text ?? completed.map(item => item.text).join('\n\n');
  if (!text) throw new Error('Codex completed without a final message. Streamed output remains in recovery.');
  return text;
}
export class CodexRPC {
  constructor(cwd, config = {}) {
    this.sequence = 0; this.pending = new Map(); this.onEvent = () => {}; this.onRequest = async () => ({ decision: 'decline' });
    this.child = spawn('codex', ['app-server', '--stdio', '-c', 'features.apps=false', '-c', 'features.multi_agent=false', ...Object.entries(config).flatMap(([k,v]) => ['-c', `${k}=${tomlValue(v)}`])], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    this.stderr = ''; this.child.stderr.on('data', b => { this.stderr = (this.stderr + b).slice(-4000); });
    createInterface({ input: this.child.stdout }).on('line', line => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.method && m.id !== undefined) {
        Promise.resolve(this.onRequest(m)).then(result => this.send({ id: m.id, result })).catch(() => this.send({ id: m.id, error: { code: -32603, message: 'Host declined request' } }));
      } else if (m.id !== undefined) {
        const pending = this.pending.get(m.id); if (!pending) return; this.pending.delete(m.id); clearTimeout(pending.timer);
        m.error ? pending.reject(new Error(m.error.message)) : pending.resolve(m.result);
      } else this.onEvent(m);
    });
    const ended = e => { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error(e?.message || 'Codex App Server exited. Request state may be uncertain.')); } this.pending.clear(); this.onExit?.(); };
    this.child.on('error', ended); this.child.on('exit', ended);
    this.ready = this.request('initialize', { clientInfo: { name: 'relentless', version: '0.2.0' }, capabilities: { experimentalApi: true, requestAttestation: false } }).then(() => this.send({ method: 'initialized', params: {} }));
  }
  send(m) { if (!this.child.stdin.destroyed) this.child.stdin.write(JSON.stringify(m) + '\n'); }
  request(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.sequence; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Codex ${method} timed out; do not blindly retry a turn.`)); }, 60000); this.pending.set(id, { resolve, reject, timer }); this.send({ id, method, params }); }); }
  close() { this.child.kill('SIGTERM'); }
}

export function codexConfig(project, mode) {
  const homeConfig = path.join(os.homedir(), '.codex/config.toml'); let existing = {};
  if (fs.existsSync(homeConfig)) existing = parseToml(fs.readFileSync(homeConfig, 'utf8'));
  const config = { 'features.apps': false, 'features.plugins': false, 'features.hooks': false, 'features.multi_agent': false, 'web_search': 'disabled', 'model_reasoning_effort': 'xhigh', 'approval_policy': 'on-request', 'shell_environment_policy.inherit': 'core', default_permissions: 'relentless' };
  for (const key of Object.keys(existing.mcp_servers || {})) {
    if (!/^[A-Za-z0-9_-]+$/.test(key)) throw new Error('An MCP server name cannot be safely disabled in this client version. Start from a client configuration without that server.');
    config[`mcp_servers.${key}`] = { command: '/usr/bin/false', enabled: false };
  }
  // Explicit thread selection overrides a legacy global sandbox mode. Fail closed if
  // this version does not activate the named profile, as checked in runCodex.
  config['permissions.relentless.description'] = 'Relentless selected project only';
  config['permissions.relentless.filesystem'] = { ':minimal': 'read', [project]: mode === 'build' ? 'write' : 'read', [path.join(project, '.git')]: 'read', [path.join(project, '.agents')]: 'read', [path.join(project, '.codex')]: 'read', [path.join(project, '.claude')]: 'read', [path.join(project, '.env')]: 'deny' };
  config['permissions.relentless.network.enabled'] = false;
  return config;
}

export async function runCodex(opts) {
  const { cwd, mode, prompt, system, providerId, emit, interact, signal, saveId } = opts;
  const rpc = new CodexRPC(cwd, codexConfig(cwd, mode)); let turnId, threadId, settled = false;
  const stream = { text: '', lastItem: null }, seenMessages = new Set(), completedMessages = new Map();
  try {
    await rpc.ready;
    const servers = await rpc.request('mcpServerStatus/list', {});
    if (servers.data.some(s => Object.keys(s.tools || {}).length)) throw new Error('Unexpected external MCP tools remain enabled. Turn refused to preserve isolation.');
    const models = await rpc.request('model/list', { includeHidden: false });
    const selected = models.data.find(m => m.model === 'gpt-6-astra');
    if (!selected) throw new Error('Installed Codex catalog does not expose gpt-6-astra. No model was substituted.');
    const params = { cwd, model: selected.model, permissions: 'relentless', runtimeWorkspaceRoots: [cwd], approvalPolicy: mode === 'build' ? 'on-request' : 'never', approvalsReviewer: 'user', developerInstructions: system };
    const started = await rpc.request(providerId ? 'thread/resume' : 'thread/start', providerId ? { ...params, threadId: providerId } : params);
    threadId = started.thread.id;
    if (started.activePermissionProfile?.id !== 'relentless') throw new Error('Codex did not activate the required restricted permission profile. Turn refused.');
    await saveId(threadId, { model: selected.model, permissionProfile: started.activePermissionProfile, sandbox: started.sandbox });
    emit({ type: 'capability', text: `Codex ${selected.model}, xhigh; restricted project ${mode === 'build' ? 'write' : 'read'} profile` });
    await new Promise((resolve, reject) => {
      const finish = error => { if (settled) return; settled = true; error ? reject(error) : resolve(); };
      rpc.onExit = () => finish(new Error('Codex connection closed during the turn. Inspect recovery before continuing.'));
      rpc.onEvent = m => {
        const p = m.params || {}; if (p.threadId && p.threadId !== threadId) return;
        if (m.method === 'turn/started') { turnId = p.turn.id; emit({ type: 'turn', id: turnId }); }
        if (m.method === 'item/agentMessage/delta') { seenMessages.add(p.itemId); emit({ type: 'delta', text: codexTextChunk(stream, p.itemId, p.delta) }); }
        if (m.method === 'item/completed' && p.item?.type === 'agentMessage') {
          completedMessages.set(p.item.id, p.item);
          if (!seenMessages.has(p.item.id)) { seenMessages.add(p.item.id); emit({ type: 'delta', text: codexTextChunk(stream, p.item.id, p.item.text) }); }
        }
        if (m.method === 'turn/completed') {
          for (const item of p.turn.items || []) if (item.type === 'agentMessage') completedMessages.set(item.id, item);
          finish(p.turn.status === 'failed' ? new Error(p.turn.error?.message || 'Codex turn failed') : null);
        }
        if (m.method === 'error') emit({ type: 'notice', text: p.error?.message || 'Provider error' });
      };
      rpc.onRequest = async m => {
        if (m.method === 'item/tool/requestUserInput') {
          const questions = m.params.questions;
          const answer = await interact({ kind: 'question', questions });
          return { answers: Object.fromEntries(questions.map(q => [q.id, { answers: [String(answer.answers?.[q.id] || answer.text || '')] }])) };
        }
        if (['item/commandExecution/requestApproval', 'item/fileChange/requestApproval'].includes(m.method)) {
          if (mode !== 'build') return { decision: 'decline' };
          // No sandbox escapes: the user can review ordinary in-profile operations only.
          if (m.params.additionalPermissions || m.params.networkApprovalContext || m.params.proposedExecpolicyAmendment) { emit({ type: 'notice', text: 'An operation requested broader access. Relentless declined it; use a native session for broader permissions.' }); return { decision: 'decline' }; }
          const answer = await interact({ kind: 'approval', tool: m.method, input: m.params });
          return { decision: answer.allow ? 'accept' : 'decline' };
        }
        if (m.method === 'item/permissions/requestApproval') return { permissions: {}, scope: 'turn' };
        if (m.method === 'mcpServer/elicitation/request') return { action: 'decline', content: null };
        throw new Error(`Unsupported server request ${m.method}`);
      };
      const cancel = async () => { if (turnId) { try { await rpc.request('turn/interrupt', { threadId, turnId }); } catch {} } else rpc.close(); setTimeout(() => { rpc.close(); finish(new Error('Paused')); }, 1500).unref(); };
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) { cancel(); return; }
      rpc.request('turn/start', { threadId, input: [{ type: 'text', text: prompt, text_elements: [] }], effort: 'xhigh', permissions: 'relentless', approvalPolicy: mode === 'build' ? 'on-request' : 'never' }).then(r => { turnId = r.turn.id; }).catch(finish);
    });
    // Deltas may include an abandoned/replaced draft. Only native completed
    // messages define the saved answer; the original stream stays in recovery.
    return { text: codexCompletedText(completedMessages.values()), providerId: threadId };
  } finally { rpc.close(); }
}

export function safeClaudePath(cwd, input) {
  try { cwd = fs.realpathSync(cwd); } catch { return false; }
  const requested = input.file_path || input.path || cwd;
  if (typeof requested !== 'string') return false;
  let candidate = path.resolve(cwd, requested);
  try { if (!fs.existsSync(candidate)) candidate = path.join(fs.realpathSync(path.dirname(candidate)), path.basename(candidate)); else candidate = fs.realpathSync(candidate); } catch { return false; }
  if (!contained(cwd, candidate)) return false;
  return !path.relative(cwd, candidate).split(path.sep).some(p => ['.env', '.git', '.claude', '.codex', '.agents'].includes(p));
}
export async function runClaude(opts) {
  const { cwd, mode, prompt, system, providerId, emit, interact, signal, saveId } = opts;
  const staging = path.join(cwd, '.claude', '.cc-writes'), hadStaging = fs.existsSync(staging), hadClaudeDir = fs.existsSync(path.dirname(staging));
  const read = ['Read', 'Glob', 'Grep']; const allowed = [...read, 'AskUserQuestion', ...(mode === 'build' ? ['Write', 'Edit', 'Bash'] : [])];
  let output = '', sessionId = providerId, q;
  const hook = async h => {
    const name = h.tool_name, input = h.tool_input;
    const deny = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
    if (!allowed.includes(name)) return deny('Tool is outside the current Relentless mode.');
    if (name !== 'AskUserQuestion' && name !== 'Bash' && !safeClaudePath(cwd, input)) return deny('Only the selected project is available; configuration and authentication paths are excluded.');
    if (name === 'Bash') {
      // Shell commands always require a deliberate per-call approval and CLI sandbox.
      if (mode !== 'build') return deny('Read-only interview.');
      const answer = await interact({ kind: 'approval', tool: name, input });
      return answer.allow ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } } : deny('User denied this command.');
    }
    if (['Write', 'Edit'].includes(name)) {
      const answer = await interact({ kind: 'approval', tool: name, input });
      return answer.allow ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } } : deny('User denied this edit.');
    }
    return {};
  };
  const cli = execFileSync('/usr/bin/which', ['claude'], { encoding: 'utf8' }).trim();
  q = query({ prompt, options: {
    pathToClaudeCodeExecutable: cli, cwd, resume: providerId || undefined, model: 'claude-fable-5',
    systemPrompt: { type: 'custom', prompt: system, snapshot: false },
    settingSources: [], tools: allowed, allowedTools: read, permissionMode: 'default',
    extraArgs: { restricted: null, 'strict-mcp-config': null, 'no-chrome': null },
    mcpServers: {}, includePartialMessages: true, abortController: opts.controller,
    settings: { disableAllHooks: false, autoMemoryEnabled: false, skillSyncEnabled: false, pluginSyncEnabled: false },
    sandbox: { enabled: true, autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: false, network: { allowedDomains: [] }, filesystem: { denyRead: [os.homedir()], allowRead: [cwd], allowWrite: [cwd] } },
    hooks: { PreToolUse: [{ hooks: [hook] }] },
    canUseTool: async (name, input) => {
      if (name === 'AskUserQuestion') { const answer = await interact({ kind: 'question', questions: input.questions.map((x, i) => ({ ...x, id: x.question || String(i) })) }); return { behavior: 'allow', updatedInput: { ...input, answers: answer.answers || Object.fromEntries(input.questions.map(x => [x.question, answer.text || 'Help me think through this.'])) } }; }
      return { behavior: 'deny', message: 'This operation is not approved by the Relentless host.' };
    }
  } });
  signal.addEventListener('abort', () => { q.interrupt().catch(() => {}); }, { once: true });
  try {
    for await (const m of q) {
      if (m.type === 'system' && m.subtype === 'init') { sessionId = m.session_id; await saveId(sessionId, { model: m.model, tools: m.tools }); emit({ type: 'capability', text: `Claude ${m.model}; selected project tools, ${mode}` }); }
      if (m.type === 'stream_event' && m.event.type === 'content_block_delta' && m.event.delta.type === 'text_delta') { const text = m.event.delta.text; output += text; emit({ type: 'delta', text }); }
      if (m.type === 'result') { if (m.is_error) throw new Error(m.result || m.errors?.join('; ') || m.subtype); if (m.result && !output) { output = m.result; emit({ type: 'delta', text: output }); } }
    }
    return { text: output, providerId: sessionId };
  } finally {
    q.close();
    // The installed restricted writer creates an empty private staging directory.
    // Remove only newly created, empty runtime directories, never existing data.
    if (mode === 'build') {
      for (const [dir, existed] of [[staging, hadStaging], [path.dirname(staging), hadClaudeDir]]) {
        if (!existed) try { if (fs.lstatSync(dir).isDirectory() && !fs.lstatSync(dir).isSymbolicLink() && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch {}
      }
    }
  }
}

export async function runMock(opts) {
  if (process.env.RELENTLESS_TEST !== '1') throw new Fault('Mock backend is available only with RELENTLESS_TEST=1.');
  await opts.saveId('synthetic-thread', { model: 'synthetic-test' });
  const text = opts.mode === 'build' ? 'Synthetic execution adapter completed. This is not live execution.' : 'The useful tension is between a focused first step and unnecessary machinery. What would make this useful in your next real session?';
  for (const word of text.split(' ')) { if (opts.signal.aborted) throw new Error('Paused'); opts.emit({ type: 'delta', text: word + ' ' }); await new Promise(r => setTimeout(r, 8)); }
  return { text };
}
export const providers = { codex: runCodex, claude: runClaude, mock: runMock };
