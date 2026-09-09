#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { connection, api, openBrowser } from '../src/connection.mjs';

const owner = randomUUID(), args = process.argv.slice(2), client = args[args.indexOf('--client') + 1];
const string = { type: 'string' }, schema = (properties, required) => ({ type: 'object', properties, required, additionalProperties: false });
const tools = [
  { name: 'open_interview', description: 'Open/resume Relentless as the sidecar of THIS native conversation. You remain the interviewer. Supply YOUR current cwd, never the server cwd. Publish discussion/questions then await_interview. No provider session is started.', inputSchema: schema({ cwd: string, title: string, intent: string, nativeSessionId: string, resume: string }, ['cwd']) },
  { name: 'publish_interview', description: 'Publish substantive interviewer prose and optional 1-3 questions into the browser. May publish the ONE synthesized execution prompt using sourceRevision/exchanges from the latest context snapshot. Publish it BEFORE declaring readiness. Assistant text is never execution authority.', inputSchema: schema({ session: string, publicationId: string, discussion: string, questions: { type: 'array', maxItems: 3, items: { type: 'object', properties: { id: string, question: string, options: { type: 'array', items: { type: 'object', properties: { label: string, description: string }, required: ['label'] } } }, required: ['id', 'question'] } }, prompt: string, sourceRevision: string, promptBaseRevision: { type: ['string', 'null'] }, ready: { type: 'boolean' }, blockers: { type: 'array', items: string }, exchanges: { type: 'array', items: string } }, ['session', 'publicationId']) },
  { name: 'await_interview', description: 'Wait up to 25 minutes for an explicit sidecar answer/control, acknowledging the previous event ID when supplied. A backgrounded or cancelled call remains PENDING; do not implement or duplicate questions. Await its task completion; use another long wait only after a pending result. Only a structured build operation with authorized=true returns deliberate authority for its exact prompt/target. Acknowledge finish, then act in THIS original conversation.', inputSchema: schema({ session: string, acknowledge: string, waitMs: { type: 'integer', minimum: 1, maximum: 1500000 } }, ['session']) },
  { name: 'attachment_status', description: 'Read current public context, revisions and pending controls at a native inspection boundary. No private drafts or scratchpad. Does not consume control events or grant execution authority.', inputSchema: schema({ session: string }, ['session']) }
];
const server = new Server({ name: 'relentless', version: '0.2.0' }, { capabilities: { tools: {} } });
let state;
server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: tools.map(t => ({ ...t, annotations: { readOnlyHint: t.name === 'attachment_status', destructiveHint: false, openWorldHint: false } })) }));
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  try {
    state = await connection();
    if (!state.bridgeToken) throw new Error('The old Relentless server is still running. Stop and restart it once before attachment. No standalone fallback was started.');
    const name = request.params.name, input = request.params.arguments || {};
    if (!tools.some(t => t.name === name)) throw new Error('Unknown interaction tool.');
    const definition = tools.find(t => t.name === name);
    if (Object.keys(input).some(key => !(key in definition.inputSchema.properties))) throw new Error('Unknown argument. Transport identity cannot be supplied by model content.');
    const result = await api(state, `bridge/${name}`, { ...input, owner, client, pane: process.env.WEZTERM_PANE || null, socket: process.env.WEZTERM_UNIX_SOCKET || null }, { bridge: true, signal: extra.signal });
    if (name === 'open_interview') openBrowser(state, result.session);
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
});
let ending = false;
async function disconnect() { if (ending) return; ending = true; if (state) await api(state, 'bridge/disconnect', { owner }, { bridge: true, signal: AbortSignal.timeout(2000) }).catch(() => {}); process.exit(0); }
process.stdin.on('end', disconnect); process.on('SIGINT', disconnect); process.on('SIGTERM', disconnect);
await server.connect(new StdioServerTransport());
