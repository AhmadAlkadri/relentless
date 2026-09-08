// Exercise real version-checked method commits and rollback in an isolated copy.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { repo } from '../src/protocol.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'relentless-tune-regression-'));
const copy = path.join(root, 'source');
fs.cpSync(repo, copy, { recursive: true, filter: source => !['.git', 'node_modules', '.cache', 'output', '.playwright-cli'].includes(path.relative(repo, source).split(path.sep)[0]) });
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(copy, 'node_modules'), 'dir');
const git = args => execFileSync('git', args, { cwd: copy, encoding: 'utf8' });
git(['init', '-b', 'main']); git(['config', 'user.name', 'Synthetic Relentless Test']); git(['config', 'user.email', 'synthetic@example.invalid']);
fs.writeFileSync(path.join(copy, 'unrelated.txt'), 'Original unrelated file\n'); git(['add', '.']); git(['commit', '-m', 'Synthetic baseline']); fs.writeFileSync(path.join(copy, 'unrelated.txt'), 'Unrelated user edit preserved\n');
const script = `
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import {execFileSync} from 'node:child_process';
import {Store,hash} from './src/storage.mjs'; import {Workspace} from './src/service.mjs'; import {protocol,repo} from './src/protocol.mjs';
const store=new Store(process.argv[1],repo), app=new Workspace(store), s=store.create(), p=protocol();
const before='Write readable prose without em dashes.', after='Write readable prose without em dashes. Keep examples concrete.';
const encoded=JSON.stringify([{observed:'Synthetic fixture',evidence:'Synthetic feedback',change:'Synthetic narrow patch',scope:'method',benefit:'Test scoped commit',downside:'Synthetic only',before,after}]);
store.append(s.id,'Tune review','\x60\x60\x60relentless-tune\\n'+encoded+'\\n\x60\x60\x60');
const m=store.meta(s.id);m.tune={version:p.version,sourceHash:hash(encoded),preferenceVersion:app.preferences().version,proposals:[{id:'synthetic-patch',status:'proposed'}]};store.setMeta(s.id,m);
const result=app.tuneDecision(s.id,{proposalId:'synthetic-patch',decision:'accept',version:p.version});assert.ok(result.commit);assert.notEqual(protocol().version,p.version);
assert.match(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}),/unrelated.txt/);assert.ok(!execFileSync('git',['status','--porcelain','--','skills/relentless/SKILL.md'],{encoding:'utf8'}).trim());
execFileSync('git',['revert','--no-edit',result.commit]);assert.equal(protocol().version,p.version);assert.equal(fs.readFileSync('unrelated.txt','utf8'),'Unrelated user edit preserved\\n');
console.log('PASS approved method patch: version matched, regressions ran, only method committed, unrelated edit preserved, inverse commit restored original hash.');
`;
execFileSync(process.execPath, ['--input-type=module', '-e', script, path.join(root, 'private')], { cwd: copy, stdio: 'inherit' });
console.log(`Synthetic source and evidence retained: ${root}`);
