# Relentless

A temporary interview sidecar for the native Claude Code or Codex conversation you
already have open. Your original agent remains the interviewer and executor.

Start the client normally inside a project, then invoke **`$relentless` in Codex**
or **`/relentless` in Claude Code**. The browser opens directly into that project’s
interview. No title/path/backend form is required. The agent publishes explanations
and questions there; you can answer freely, choose an option, or ask it to help you
think through a question. Double-click the interview title to rename it.

## From discussion to execution

**Continue / Send answer** submits your reviewed answer to the original conversation.
Saving Markdown or a draft never submits it. The context panel retains editable
brief, decisions, facts, assumptions and questions; explicit answers in the
conversation also inform synthesis without copying them into those fields.
Agent recommendations remain proposals until accepted.

**Print** displays the one working execution prompt. If it does not exist or public
context changed, Print asks the interviewer to synthesize it. The result is retained
in private session storage. Repeated Print reuses the same body. The prompt records
its source revision and incorporated exchanges, distinguishes evidence from
assumptions, and contains task-specific thin slices and verification. It may be a
provisional or investigation-only brief while decisions remain unsettled.

**Review / edit working prompt** opens that same artifact, with Copy and explicit
export. Your manual edits are preserved; later synthesis produces a proposed
replacement for review. Changes to public context or submitted answers make the
prompt potentially outdated. Private scratchpad and appearance changes do not.

**Build agreed scope** authorizes that exact displayed prompt revision and target.
The bridge returns the unchanged body to your original CLI conversation, receives
its acknowledgment, and selects the captured WezTerm pane when available. The
original agent executes under its existing model, effort, authentication and normal
permissions. Build does not create an in-app execution session in attached mode.
If no ready prompt exists, the click prepares one for review; it does not execute
unseen scope. Once ready, Build itself is the authorization, with no duplicate
confirmation of the same decision.

**Where are we?** asks the interviewer for a useful status summary. **Return to
terminal** finishes without authorizing implementation. **Pause** preserves the
interview for deliberate reopening from the native conversation. Finishing during
native computation is recorded for the next supported tool boundary; the interface
does not claim to have cancelled that computation. A browser tab may stay open in
its completed state. Disconnection or closing a tab never grants authority.

## Optional answer helpers

Choose **Codex** or **Claude** in the answer-helper dropdown and click **Draft with…**.
The selected installed client starts a separately identified, restricted helper
session. It can read bounded project files and advise; it has no shell, network,
main-interview bridge, answer-submission or Build tools. It receives the question
and public context. Current drafts and saved preferences are included only through
their explicit inclusion controls. Scratchpad and the native transcript are excluded.

Results appear as **Drafted by … · Not sent**, with the actual reported model.
**Use this draft** inserts into an empty answer or offers append/replace choices
when you have written text. Only your subsequent Send/Continue submits it. Older
suggestions remain available to copy, without insertion into a changed question.
One helper owns an interview at a time; errors or cancellation preserve writing.

**Discuss this draft** continues the exact helper privately in the sidecar, including
the draft you are viewing/editing. **Discuss in WezTerm** resumes that exact helper
session in a separate tab. Exit that helper when ready; a final exact-session
request returns its proposed draft to the browser. Use this draft is still separate
from submission. The original interviewer never receives the private discussion.
Provider failures are shown without switching provider, auth route or billing.

## Standalone, storage and recovery

`relentless` still opens the worklist. **New thought** or
`relentless new --project /absolute/project --backend codex|claude` explicitly starts
a standalone workspace; Start interview creates an app-owned interviewer. Its
Build executes in the existing standalone host with restricted tool approvals.
Attachment failure never falls back to standalone. Native **terminal-only** use is
also retained. Existing sessions stay in their original mode until deliberately
resumed as notes by a native connection; this is labeled as new attachment context.

Default private storage is `~/.local/share/relentless/`:

- `sessions/UUID.md`: authoritative editable interview, including submitted exchanges.
- `sessions/UUID.prompt.md`: the one working execution prompt.
- `sessions/UUID.candidate-*.md`: proposed replacements, never automatic authority.
- `sessions/UUID.helper-*.md`: private helper drafts and discussion.
- `sessions/UUID.json`: identifiers, revisions, provenance and transport/review state.
- `history/`, `recovery/`: prior revisions and interrupted output.
- `preferences.json`: explicitly reviewed personal preferences.
- `install/`, `install-bridge/`, `upgrade-backups/`: private rollback material.

Markdown is editable externally; keep the section markers intact. Conflicts retain
both versions. Browser refresh retains unsent writing. As with ordinary editors,
an external writer can race the final check-to-rename interval; this is not a
transactional filesystem or power-loss guarantee. A crash never automatically
replays Build. Inspect uncertain execution in the native client and deliberately
resume notes. Two projects, worktrees or native connections do not share ownership.

The service binds loopback and checks authenticated capabilities, Host and Origin.
Markdown is sanitized and remote images are disabled. The browser cannot impersonate
the native transport. This does not protect against malicious software running as
your OS user. Session/browser storage is private, not application-encrypted.

**Tune** is invoked deliberately. It presents versioned, evidence-backed proposals
for acceptance, editing, rejection or deferral. Personal preferences, project
decisions, shared methods and interface code remain distinct. No silent self-rewrite.
The canonical skills are shared symlinks; `sprint-prompt` remains the explicit
project-file handoff workflow. Relentless Print does not invoke it implicitly.

## Install, update and rollback

Requires Node 22+, WezTerm for terminal tab/focus controls, and installed authenticated
native clients. From this existing checkout:

```sh
npm ci
node scripts/install.mjs --dry-run
node scripts/install.mjs
relentless doctor
```

The installer verifies canonical skill links and adds one **user-scope** MCP server
to each client. It preserves unrelated servers, permissions and configuration.
Backups, dry-run, diagnostics, repeat installation, relocation and rollback are
supported. It refuses unmanaged name collisions or conflicting edits. Codex approves
only four scoped interaction tools; none can originate Build. Claude's explicitly invoked skill allows only those same interaction tools;
other native approvals remain unchanged.
Restart already-running clients once after installation so they discover the server.
Future interviews need no wrapper or startup flags. Rerun the installer after moving
the checkout or changing the Node installation.

To undo only MCP registration, run
`node scripts/install-bridge.mjs --dry-run --rollback`, then repeat without
`--dry-run`. To undo the complete installation, use `relentless uninstall` (or
`node scripts/install.mjs --rollback`). It restores managed prior installations
while retaining notes, prompts, preferences and backups. Restart clients afterward.
Stop an idle local UI server with `relentless stop`; do not interrupt other active
interviews just to undo links.

## Verification

`npm test` and `npm run check` cover deterministic state, permission, storage and
installation contracts. Opt-in scripts use real authenticated clients and fresh
browser contexts with disposable projects:

```sh
node scripts/attached-live.mjs codex 135
node scripts/attached-live.mjs claude 135
node scripts/attached-live.mjs claude 150 --background
node scripts/attached-browser.mjs
node scripts/attached-live.mjs codex 0 --build
node scripts/attached-live.mjs claude 0 --build
node scripts/helpers-live.mjs codex
node scripts/helpers-live.mjs claude
```

See [evidence](docs/evidence.md) for exact observed results and limitations,
[compatibility](docs/compatibility.md) for native contracts, and
[installation provenance](docs/skill-provenance.md) for original skill rollback.
Native tools outside the bridge retain their normal permissions: interview-only
behavior there is skill guidance, not a bridge-imposed sandbox. Behavioral evaluations
and synthetic fixtures do not establish subjective satisfaction or universal model
judgment. Use Tune after real use.

The live native CLI/browser loops, both answer helpers, and Claude's enabled native
background-task mechanism passed. Full human-operated WezTerm discussion/return
remains unverified: unattended interactive attempts did not reach the bridge within
their test limit. Exact pane activation and deterministic terminal ownership/return
checks passed; private helper discussion in the sidecar is live-tested. See the
evidence record before treating interactive terminal behavior as certified.
