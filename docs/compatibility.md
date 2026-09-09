# Compatibility and enforcement

Verified installed clients: Codex CLI 0.153.4 and Claude Code 2.1.266 on macOS;
Node 25.2.1. The existing standalone adapters remain Codex App Server and Claude
Agent SDK 0.3.265. Attached interviewing uses neither adapter.

## Native transport

Local stdio MCP exposes `open_interview`, `publish_interview`, `await_interview` and
`attachment_status`. Each MCP process owns a random connection capability. The
browser uses a different token and cannot publish interviewer messages, consume
controls or acknowledge handback. Event UUIDs, publication IDs, source hashes,
question revisions and prompt hashes bind operations. A delivered Build is never
returned a second time as authority. Crash/disconnect revokes unacknowledged Build.

The existing `cwd` argument selects an absolute project operating directory,
defaulting by skill guidance to the native agent's actual invocation directory.
An explicitly selected different project is resolved through Git's worktree root
and realpath without changing the native process cwd. The bridge verifies the
selected filesystem target, not the caller's assertion about native cwd. Snapshots
expose canonical `target` even before a prompt exists, plus `selection.directory`,
`selection.resolvedDirectory` and its caller-supplied provenance. Selection records
the latest open; legacy `invocation` and `resolvedInvocation` retain their originally
supplied paths and are not native cwd proof. Older notes remain readable without a
migration, with explicit legacy provenance in snapshots. No remote
URL or newest-session heuristic identifies a project or native owner. Claude's
`${CLAUDE_SESSION_ID}` skill substitution is supported. Codex generic MCP does not
provide a verified native thread ID here: absent one explicitly supplied by the
native client, identity is honestly connection-only. New-session note resumption
is labeled as such. A changed known native session ID or replaced project inode
cannot reuse the previous attachment. Native attachment may interview the Relentless
source checkout itself, while the standalone provider still cannot target it. No terminal scraping, transcript rewriting or token extraction.

The same owner and native identity can select A, then B, then A, retaining separate
sessions and exact-target prompts. Explicit `resume` takes precedence over automatic
reuse and rejects a mismatched target, including when that target already has an
open interview. This is routing, not a permission change: Build still checks the
session's current prompt revision, exact target and original project inode.
Portfolio notes can use an existing private coordination session's Markdown outside
the source checkout, explicitly published to the original master conversation.
They are never automatically copied to project interviews, helpers or workers.
They are neither authorization nor a worker scheduler or watchdog.

[Codex MCP](https://developers.openai.com/codex/mcp) documents user configuration
and the default 60-second tool timeout. The installer sets this server's timeout to
1800 seconds. The HTTP bridge bounds each wait to 240 seconds, including requests
using the retained 1500-second schema maximum. The installed Node 25.2.1 fetch
implementation has a 300-second default response-header timeout; the shorter
server interval avoids holding headers beyond that budget. Idle expiration returns
the existing unauthorized pending state for another long wait on the same
attachment. No connection retry or event replay is introduced. A server reload
applies this cap to already-running MCP clients; their old description may remain
until an ordinary client restart, but their parameter schema remains compatible.

[Claude MCP](https://code.claude.com/docs/en/mcp) documents a per-server hard timeout,
a 30-minute stdio idle window in these versions, and interactive main-conversation
automatic backgrounding after two minutes. Programmatic `-p` calls do not establish
that interactive behavior. An isolated `-p` test with documented
`CLAUDE_AUTO_BACKGROUND_TASKS=1` did observe native 120-second backgrounding and
successful completion after a 150-second user wait. A backgrounded call is pending; the native agent must
await its task notification. The bridge does not assume notifications can inject
arbitrary user messages. Cancellation is not completion or authorization.

## Answer helpers

Codex helpers use native `exec --json` and exact session-ID resumption, Astra
`gpt-6-astra` with xhigh effort. Existing auth/provider configuration is retained;
external MCP servers, shell, network, apps, plugins, hooks and delegation are disabled
for that helper process. A dedicated read MCP exposes only bounded list/read/search
inside the project, with symlink, config and common secret-path exclusions.

Claude helpers use the installed CLI's programmatic streaming output, `--restricted`,
no built-in tools, explicit read MCP configuration and exact `--resume` ID. Actual
model identity is captured from initialization; no fallback model is configured.
The helper is terminated on unexpected tool exposure or session substitution.
Authentication remains the installed native route. No full native transcript,
private scratchpad or unsent answer is copied automatically.

The read bridge enforces its own filesystem operations. No finite filename filter
can identify every secret placed in an otherwise ordinary project document; users
must choose appropriate public project context. Tool restriction does not make model
recommendations independently verified facts. See
[Codex non-interactive mode](https://developers.openai.com/codex/noninteractive),
[Claude programmatic use](https://code.claude.com/docs/en/headless), and
[Claude CLI](https://code.claude.com/docs/en/cli-reference).

## Terminal and resource ownership

[WezTerm spawn](https://wezterm.org/cli/cli/spawn.html) provides cwd, program argv and
a returned pane ID; [activate-pane](https://wezterm.org/cli/cli/activate-pane.html)
selects that exact pane. The bridge forwards documented `WEZTERM_PANE` and
`WEZTERM_UNIX_SOCKET`. Missing identity yields an explicit limitation, never a
most-recent pane guess. Helper discussion holds a lease until the native helper
exits and its exact-session draft return completes. No concurrent CLI processes own
that helper. Return does not submit the draft. Other helper terminals and the shared
standalone UI server are not terminated on attached handback.

The bridge cannot sandbox, cancel or change every native tool in the original
conversation. Its own operations are mechanically bounded; read-only investigation
and respecting pending waits in the original agent are skill-level requirements,
with normal native permissions intact. Browser/host disconnection preserves notes
without execution authority. No broad Accessibility permission is needed.

The unattended interactive Claude PTY and WezTerm tests did not reach a bridge call
within 180 seconds. Their cause was not established. The native programmatic
continuity, enabled background-task mechanism, and both sidecar helper discussions
passed live tests. Full human-operated interactive terminal resumption/return is a
remaining validation limit, not a claimed pass. Details and fixture identities are
in [evidence.md](evidence.md).
