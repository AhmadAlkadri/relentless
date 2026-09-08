# Verified integration contracts

Inventory date: 2026-09-08. Node 25.2.1, npm 11.19.0, gh 2.96.0,
Codex CLI 0.153.4, Claude Code 2.1.265, Claude Agent SDK 0.3.265.
This personal application uses the installed clients and their existing login.
It does not read, copy, migrate or persist authentication tokens. No API key,
alternate provider, model fallback or new billing route is configured.

## Codex

The installed `model/list` catalog exposes `gpt-6-astra` and xhigh reasoning.
Relentless requests that exact identifier per app-owned session. Global model
settings remain untouched. The App Server runs as a private stdio subprocess.
The browser never receives its transport, provider control messages or auth.

`generate-json-schema --experimental` and `generate-ts --experimental` were run
from this exact installed version before implementing message shapes. Reproduce
the consumed-contract check with `node scripts/verify-schema.mjs`.
Used methods include initialize, model/list, skills/list, thread/start,
thread/resume, thread/read, turn/start, turn/interrupt, agentMessage deltas,
turn completion, tool questions and per-operation approvals. Unknown server
requests fail closed. Questions use free-text answer arrays keyed by question ID.

App Server remains experimental. Named permission profiles are beta. Each private
process defines and explicitly selects a project-only profile, checks the returned
active profile, disables command network access, hooks, plugins, apps and external
MCP tools, and refuses a turn if an external MCP tool remains active. The configured
MCP servers are replaced by disabled definitions only within the child process.
Global configuration is not changed. Interview commands have read-only access.
Build commands have project write access, with project configuration and `.git`
kept read-only. Broadening permission requests are declined; use a deliberately
authorized native session when broader access or committing target changes is needed.

One version-specific edge was found: selecting a custom permission at turn/start
needs its definition in the process config, not only thread/start overrides. Another
was that overriding only a legacy MCP `enabled` leaf could lose its transport
definition. Explicit process profiles and disabled definitions resolve both.

## Claude

The adapter uses the supported Agent SDK with `pathToClaudeCodeExecutable` pointing
to the installed `claude` executable, which remains authenticated with claude.ai
Max. Real tests confirmed `claude-fable-5`, without an API key or `--bare` mode.
This is a personal local wrapper, not an offer of subscription authentication to
third-party users. Anthropic's SDK documentation restricts third-party products
offering claude.ai login; this repository does not implement such an offer.

The narrow tool list, restricted CLI mode, empty filesystem settings sources,
strict empty MCP configuration, and PreToolUse guard keep interviews read-only.
PreToolUse runs before auto-approved Read/Glob/Grep calls and validates resolved
project paths. Build edits and sandboxed shell commands require individual UI
approvals. No bypass mode is used. `AskUserQuestion` routes through `canUseTool`;
free-form answers and tool approvals remain different application events.
Ordinary prose questions are supported when the model does not request a card.
The system prompt uses the supported custom prompt with snapshot disabled so a
new turn's explicit protocol boundary is not represented as an implicit reload.

## Skills and ChatGPT

Codex `skills/list` discovered all three canonical sources without errors under
`~/.agents/skills`, resolving to repository files. The legacy sprint-prompt path
is also a direct link. `agents/openai.yaml` sets `allow_implicit_invocation: false`.
Claude personal skill directories use individual links under `~/.claude/skills`
and shared frontmatter `disable-model-invocation: true`. Native commands are
`$relentless` / `$tune` in Codex and `/relentless` / `/tune` in Claude.
These are skills, not newly registered native slash commands in Codex.

Local standalone skills do not automatically synchronize to ChatGPT web. Official
documentation also describes plugin-distributed skills across more surfaces, but
this installation does not publish or install an account-side ChatGPT plugin.
`relentless portable` and each session's ChatGPT export generate instructions from
the canonical source plus a compact accepted-context packet. Copy/paste or explicit
download/upload is the supported portable route.

## Primary documentation

- [Codex skills, redirected to Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Codex permission profiles](https://learn.chatgpt.com/docs/permissions)
- [Claude personal skills](https://code.claude.com/docs/en/skills)
- [Claude programmatic usage and authentication distinction](https://code.claude.com/docs/en/headless)
- [Claude approvals and user input](https://code.claude.com/docs/en/agent-sdk/user-input)
- [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
