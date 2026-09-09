// Test-owned native terminal launcher. No keystroke injection or transcript access.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const recipe=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const child=spawn(recipe.command,recipe.args,{cwd:recipe.cwd,stdio:'inherit',env:process.env});
fs.writeFileSync(recipe.pidFile,JSON.stringify({pid:child.pid,pane:process.env.WEZTERM_PANE,socket:process.env.WEZTERM_UNIX_SOCKET}));
child.on('exit',code=>{fs.writeFileSync(recipe.doneFile,JSON.stringify({code}));process.exitCode=code||0;});
