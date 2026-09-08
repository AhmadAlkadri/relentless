# Relentless

A local Markdown space for thinking through projects with an agent, then deliberately
handing work over. Personal software, served only on your computer.

```sh
relentless
```

Open **Paste a worklist** to add your plain-text or Markdown list. Nothing is invented
or sent to a provider on import. Each item can have an optional project directory,
a simple status, and its own interview. Reorder or rename items whenever useful.
Ideas without repositories work too. The repository's demo list is synthetic.

## Everyday use

Choose a thought or create one. Select Codex or Claude and add a working brief.
**Start interview** connects a separate app-owned provider conversation. Local-first
storage does not mean offline inference: saved public context and explicitly
submitted answers go to the selected provider. Read-only project tools may inspect
the selected project. Private scratchpad and unsent drafts do not go automatically.

Write freely in the answer space. **Save** writes to the real Markdown document;
**Continue** deliberately submits the answer. Saving or typing never calls a model.
You can instead open the path shown under **Session document** in any text editor,
edit it, save, then Continue in the app. External saves appear without restarting.

The side panel separates working brief, accepted decisions, verified facts,
assumptions and current questions. Agent state suggestions are proposals: review
them, put them in the relevant editor, and Save to accept them. The transcript and
proposal text live in the Markdown file, not in a hidden conversation database.

**Where are we?** requests a readiness summary. **Print** immediately renders a
self-contained execution prompt from the saved brief, decisions, facts, assumptions
and questions. It excludes the transcript, scratchpad, unsent draft and unsaved
context edits. Review those saved fields before Print. Copy and Save .md are separate
actions; Print itself saves nothing and does not grant execution permission.

The **Build** panel shows the current agreed scope, target and permissions. Clicking
Build authorizes exactly that saved scope for one execution turn. Approvals for
specific tools remain separate. Every turn returns to interview mode; changing scope
revokes active execution. No deployment, publishing, spending, destructive operations
or pushes are implied. Pause stops active work and preserves text and recovery.

**Tune** reviews the session only when invoked. It proposes method, personal
preference, project or interface changes. Accept, edit, reject or defer each one.
Method patches require the reviewed source version, pass checks and receive a
focused local Git commit. They are never pushed automatically. Preferences remain
local with history and are sent only when you check their inclusion control.
Interface code proposals produce explicit implementation work, not hidden code edits.

Use the appearance controls for light/dark mode, text size and reading width.
Focus mode keeps the exchange and answer space primary. Cmd/Ctrl+Enter continues,
Cmd/Ctrl+S saves the focused editor, and Escape closes a dialog.

## Commands and skills

```sh
relentless new --project /absolute/project --backend codex
relentless new --title "An idea without a repository" --backend claude
relentless resume SESSION_ID
relentless path SESSION_ID
relentless print SESSION_ID
relentless tune SESSION_ID
relentless portable SESSION_ID
relentless doctor
relentless stop
```

`--no-open` prints the local launch URL for manual opening. That URL contains a local
capability: do not share it. `new --context-stdin` accepts a compact native-session
handoff. It opens a separate workspace; it does not attach to the native conversation.

Explicit native skills are `$relentless` and `$tune` in Codex, and `/relentless` and
`/tune` in Claude Code. Ask for **terminal-only** when you want to stay in the native
conversation. The skill normally opens the corresponding workspace and hands over
ownership. Native skills preserve existing client permissions; prose is not a sandbox.
The existing `sprint-prompt` invocation remains available for deliberately saved
execution briefs, as distinct from Relentless's unsaved Print.

ChatGPT portability is copy/paste or explicit Markdown upload through the export
button or `relentless portable`. Exports derive from the canonical protocol. Local
symlinks do not synchronize with ChatGPT web.

## Files, recovery and privacy

Default private storage is `~/.local/share/relentless/`:

- `sessions/UUID.md`: canonical editable session content.
- `sessions/UUID.json`: provider IDs, request IDs, protocol hashes and review state.
- `history/`: prior Markdown revisions and personal preference versions.
- `recovery/`: incremental response text retained through interruption or conflict.
- `preferences.json`: deliberately accepted personal collaboration preferences.
- `install/`: installation manifest and original skill backups.

The app uses atomic writes, serialized mutations, revision checks and preserved
versions. If an external edit conflicts with a dirty browser editor, neither is
silently chosen. Compare and merge explicitly. Malformed section markers or an
unfinished fence disable writes until repaired, while the original file stays readable.
Keep the `<!-- relentless:... -->` markers intact. Code fences can contain examples
of those markers without redirecting an edit.

Ordinary editors do not participate in a shared compare-and-swap protocol. An
external process can still race the tiny interval between a final revision check
and filesystem rename. Avoid intentionally saving the same section at exactly the
same moment in two editors. Prior app versions and recovery text are retained; this
is not a guarantee against arbitrary concurrent filesystem writers or power loss.

After an interrupted provider request, the app exposes uncertainty and does not
replay it. Inspect recovery, provider state where available, and any executed target
changes before acknowledging. The next turn then starts a fresh provider thread
from current public context. A normal completed session resumes its provider ID.

Browser access requires a random capability with strict host/origin checks. Markdown
is sanitized and remote images are not loaded. This protects against arbitrary
websites and unauthenticated local requests, not malicious software running as your
own OS user that can read your private files. Browser recovery buffers are local to
that browser origin and are not encrypted by this application.

## Install, update and undo

Requires Node 22+ and installed, authenticated Codex and/or Claude clients. From this
repository, install locked project dependencies with `npm ci`, then:

```sh
node scripts/install.mjs --dry-run --adopt-reviewed
node scripts/install.mjs --adopt-reviewed
relentless doctor
```

Individual skill links point directly to `skills/`. The installer backs up inspected
originals and refuses unknown conflicts. No sudo, global dependency upgrades or
shell configuration edits. After moving the repository, rerun its installer.

To undo: stop the app with `relentless stop`, then run `relentless uninstall`.
This removes managed links and restores previous installations. Sessions, preferences,
manifest and recovery remain on disk. See [skill provenance](docs/skill-provenance.md)
for dry-run rollback and interrupted-installer recovery.

## Verification and current limits

Run `npm test` and `npm run check`. Live opt-in scripts use disposable synthetic
projects: `node scripts/live-smoke.mjs codex|claude` and
`node scripts/live-build.mjs codex|claude`. They use real authenticated inference.
See [evidence](docs/evidence.md) for actual runs and [compatibility](docs/compatibility.md)
for protocol versions, supported APIs and platform limits.

The Codex App Server is experimental and its custom permission profiles are beta.
The conservative app profile keeps `.git` and client configuration read-only; target
commits or broader permissions need an explicitly authorized native execution session.
Claude uses per-tool approvals for edits and sandboxed commands. Ordinary conversational
questions are always supported; native structured cards depend on provider behavior.
No behavioral test establishes your subjective satisfaction. Use Tune after real use.
