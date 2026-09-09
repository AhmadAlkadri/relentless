#!/usr/bin/env node
import { Store } from '../src/storage.mjs';
import { runTerminalDiscussion } from '../src/helpers.mjs';

const args = process.argv.slice(2);
const get = flag => { const index = args.indexOf(flag); if (index < 0 || !args[index + 1]) throw new Error(`Missing ${flag}`); return args[index + 1]; };
try {
  await runTerminalDiscussion(new Store(get('--store'), get('--repo')), { id: get('--session'), helperId: get('--helper'), token: get('--lease') });
} catch (error) { console.error(error.message); process.exitCode = 1; }
