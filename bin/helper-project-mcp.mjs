#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const denied = name => /^(?:\.git|\.claude|\.codex|\.agents|\.ssh|\.aws|\.azure|\.config|node_modules|\.env(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|auth(?:\..*)?|tokens?(?:\..*)?)$/i.test(name) || /\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(name);
const inside = (root, target) => target === root || target.startsWith(root + path.sep);

export function projectReader(input) {
  const root = fs.realpathSync(input), identity = fs.statSync(root);
  if (!identity.isDirectory()) throw new Error('Helper root must be a directory.');
  function resolve(requested = '.') {
    if (typeof requested !== 'string' || requested.length > 4096) throw new Error('Supply a bounded project-relative path.');
    const stat = fs.statSync(root);
    if (fs.realpathSync(root) !== root || stat.dev !== identity.dev || stat.ino !== identity.ino) throw new Error('Helper project identity changed.');
    const target = path.resolve(root, requested);
    if (!inside(root, target) || path.relative(root, target).split(path.sep).some(denied)) throw new Error('Only ordinary files in the selected project are available.');
    let cursor = root;
    for (const segment of path.relative(root, target).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, segment); if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Helper reads do not follow project symlinks.'); }
    if (!inside(root, fs.realpathSync(target))) throw new Error('Path escaped the helper project.');
    return target;
  }
  function content(file) {
    const descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
      const stat = fs.fstatSync(descriptor);
      if (!stat.isFile() || stat.size > 500000) throw new Error('Read an ordinary text file under 500 KB.');
      const bytes = fs.readFileSync(descriptor);
      if (bytes.includes(0)) throw new Error('Binary files are not available to answer helpers.');
      return bytes.toString('utf8');
    } finally { fs.closeSync(descriptor); }
  }
  function entries(directory) { return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => !denied(entry.name) && !entry.isSymbolicLink()).sort((a, b) => a.name.localeCompare(b.name)); }
  return {
    list_project({ path: requested = '.' } = {}) {
      const target = resolve(requested);
      if (!fs.statSync(target).isDirectory()) throw new Error('List requires a project directory.');
      const all = entries(target);
      return { entries: all.slice(0, 300).map(entry => ({ name: entry.name, kind: entry.isDirectory() ? 'directory' : 'file' })), truncated: all.length > 300 };
    },
    read_project({ path: requested, startLine = 1, lines = 200 } = {}) {
      if (!Number.isSafeInteger(startLine) || startLine < 1 || !Number.isSafeInteger(lines) || lines < 1 || lines > 2000) throw new Error('Use positive line numbers and at most 2000 lines.');
      const all = content(resolve(requested)).split('\n');
      const text = all.slice(startLine - 1, startLine - 1 + lines).map((line, index) => `${startLine + index}: ${line}`).join('\n');
      return { text: text.slice(0, 120000), totalLines: all.length, truncated: text.length > 120000 || startLine - 1 + lines < all.length };
    },
    search_project({ query, path: requested = '.' } = {}) {
      if (typeof query !== 'string' || !query || query.length > 200) throw new Error('Use a literal query of 1 to 200 characters.');
      const matches = []; let files = 0, bytes = 0, truncated = false;
      function walk(target, depth = 0) {
        if (depth > 15 || files >= 1000 || bytes >= 5000000 || matches.length >= 80) { truncated = true; return; }
        if (fs.statSync(target).isDirectory()) { for (const entry of entries(target)) { walk(resolve(path.relative(root, path.join(target, entry.name))), depth + 1); if (truncated) break; } return; }
        files++; let text; try { text = content(target); } catch { return; } bytes += Buffer.byteLength(text);
        for (const [index, line] of text.split('\n').entries()) if (line.includes(query)) { matches.push({ path: path.relative(root, target), line: index + 1, text: line.slice(0, 1500) }); if (matches.length >= 80) { truncated = true; break; } }
      }
      walk(resolve(requested)); return { matches, filesInspected: files, truncated };
    }
  };
}

async function main() {
  const args = process.argv.slice(2), root = args[args.indexOf('--root') + 1];
  if (!args.includes('--root') || !root || !path.isAbsolute(root)) throw new Error('An absolute helper project root is required.');
  const reader = projectReader(root), server = new Server({ name: 'relentless-helper-project', version: '0.2.0' }, { capabilities: { tools: {} } });
  const tools = [
    { name: 'list_project', description: 'List ordinary entries inside the selected read-only project. No configuration, secrets or symlinks.', properties: { path: { type: 'string' } } },
    { name: 'read_project', description: 'Read a bounded excerpt of an ordinary project text file. Cannot modify files or leave the project.', properties: { path: { type: 'string' }, startLine: { type: 'integer', minimum: 1 }, lines: { type: 'integer', minimum: 1, maximum: 2000 } }, required: ['path'] },
    { name: 'search_project', description: 'Bounded literal-text search inside ordinary project files. No shell, regular expressions or network.', properties: { query: { type: 'string', minLength: 1, maxLength: 200 }, path: { type: 'string' } }, required: ['query'] }
  ];
  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: tools.map(tool => ({ name: tool.name, description: tool.description, inputSchema: { type: 'object', properties: tool.properties, required: tool.required || [], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } })) }));
  server.setRequestHandler(CallToolRequestSchema, request => {
    try {
      if (!tools.some(tool => tool.name === request.params.name)) throw new Error('This helper has no such capability.');
      const result = reader[request.params.name](request.params.arguments || {});
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
  });
  await server.connect(new StdioServerTransport());
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
