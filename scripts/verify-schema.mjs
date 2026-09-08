import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-codex-schema-'));
execFileSync('codex', ['app-server', 'generate-json-schema', '--experimental', '--out', folder]);
const selected = ['ThreadStartParams', 'ThreadStartResponse', 'ThreadResumeParams', 'TurnStartParams', 'ToolRequestUserInputResponse', 'CommandExecutionRequestApprovalResponse', 'FileChangeRequestApprovalResponse'];
const contract = {};
for (const name of selected) {
  const file = [path.join(folder, 'v2', `${name}.json`), path.join(folder, `${name}.json`)].find(fs.existsSync); if (!file) throw new Error(`Missing schema ${name}`);
  const raw = fs.readFileSync(file, 'utf8'); const schema = JSON.parse(raw); contract[name] = { sha256: createHash('sha256').update(raw).digest('hex'), fields: Object.keys(schema.properties || schema.definitions?.[name]?.properties || {}) };
}
for (const [schema, field] of [['ThreadStartParams', 'permissions'], ['TurnStartParams', 'effort'], ['ThreadStartResponse', 'activePermissionProfile']]) if (!contract[schema].fields.includes(field)) throw new Error(`Installed client lacks ${schema}.${field}. Reverify integration.`);
console.log(JSON.stringify({ version: execFileSync('codex', ['--version'], { encoding: 'utf8' }).trim(), experimental: true, contract }, null, 2));
