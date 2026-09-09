# Evidence

Build started 2026-09-08. Synthetic fixtures only. No personal transcripts imported.
Initial inventory: Node 25.2.1, npm 11.19.0, Codex CLI 0.153.4,
Claude Code 2.1.265, gh 2.96.0. Codex uses ChatGPT login; Claude uses
claude.ai Max login. No provider or billing changes authorized or made.

## Implemented

The installed CLI opens a loopback-only live workspace with canonical editable
Markdown, external rename-save detection, explicit conflict review, local recovery,
read-only interviews, pure Print, bounded Build, approvals, Pause, Tune, a reorderable
worklist, display preferences, and canonical-protocol ChatGPT exports. No actual
personal worklist has been supplied or imported. The default worklist is empty.

Canonical protocol metadata is 1.0.0. The Relentless source SHA256 used in final
live sessions is `088d1f95164bcadfb39f884b1acc1ede17b5e0c01761410565eb823e5b8e54e9`.
Provider IDs, full synthetic exchanges and raw transport records stay in local
fixture storage and are deliberately not committed.

## Deterministic verification

`npm test`: 35 tests covering installer and rollback, exact control recognition,
Unicode/fences/long answers, invalid Markdown preservation, external save by rename,
revision conflicts, pure Print and private-context exclusion, stale scope and
project identity, request deduplication, pause/recovery, eleven isolated items,
Tune rejection and version checks, scoped preference updates, parallel question
serialization and cancellation, execution questions preserving scope, path traversal,
symlink guards, host/origin/capability enforcement, subprocess restrictions, stable
restart origin, exclusive server ownership, and readable streamed-message boundaries.

`npm run check`: JavaScript syntax, skill metadata and whitespace. These are
structural checks, not a behavioral-quality score. `npm audit --omit=dev` reported
zero vulnerabilities. `git diff --check` passed.

`node scripts/tune-regression.mjs`: in an isolated source copy and synthetic Git
repository, an approved version-matched method patch ran regressions, committed only
the method, preserved an unrelated edit, and was reversed with an inverse commit.
The original source hash was restored. No personal rule was changed by this test.

`node scripts/verify-schema.mjs`: generated schemas from installed Codex 0.153.4
and checked all consumed contract fields. It reports reproducible schema hashes.

## Authenticated live verification

| Path | Actual result |
| --- | --- |
| Codex `live-smoke` | Question, synthetic answer, follow-up, saved provider-ID resume after constructing a fresh host, summary and pure Print passed. Exact model `gpt-6-astra`, effort xhigh. |
| Claude `live-smoke` | Question, synthetic answer, follow-up, saved provider-ID resume, summary and pure Print passed through installed CLI authentication. Exact model `claude-fable-5`. |
| Both `live-build` runs | Action-language interview answer did not create a file. Explicit Build created only the agreed `hello.txt`, checked exact 17 bytes, and preserved README. Tune review completed. Claude approvals were actual application callbacks. |
| Codex browser dogfood | Real interview, external Markdown save by replacement, visible answer refresh with no model call, reload and resume, accepted scope, readiness, pure Print, authorized fixture Build, Tune and real Pause passed. |
| Claude browser questions | Real `AskUserQuestion` callback, ordinary external Markdown draft, explicit copy into card, unrestricted Unicode free-text answer, meaningful follow-up and real cancellation passed. |
| Native skill invocation | Codex `$relentless` and `$tune`, Claude `/relentless` and `/tune`, all invoked successfully in terminal-only synthetic checks. Both read canonical protocol 1.0.0. |

Native Codex `skills/list` also resolved relentless, tune and sprint-prompt to the
repository source with no discovery errors. Claude initialization listed the same
personal skills and invocations. Eight installed skill/launcher links resolved
directly to their expected source and matched content hashes. No global client or
shell configuration was changed. Existing sprint-prompt originals remain backed up.

`scripts/launcher-smoke.mjs` used the installed `relentless` command from a fresh
zsh login shell at `/tmp`: launch, new, path, pure Print, portable export, resume,
stop and restart all passed. The restart retained its origin and rotated capability.

## Browser inspection and behavioral observations

Isolated headless Chrome profiles only. Inspected desktop and mobile screenshots,
light/dark appearance, readable line width, focus mode and save-state indicators.
Synthetic browser checks covered eleven-item paste, reorder, editing, conflict
comparison, draft/cursor preservation during streaming, reload recovery, unsafe
Markdown sanitization, unrestricted questions and Tune review controls. Final runs
reported no page errors. Mobile inspection found no horizontal overflow.
Screenshots are local ignored artifacts in `output/playwright/` and temporary
UI test files, not private material published with the source.

The real Codex exchange inspected its fixture README, proposed a concrete small
step, accepted a corrected scope without reopening it, and waited for Build.
The Claude free-form answer test developed the user's uncertainty with a concrete
reading-list example and separated its file-based recommendation as a suggestion.
Review concerns remain: Claude once used "Accepted unless corrected" for an
assumption, overconfident subjective phrasing, and em dashes despite prose guidance.
These are probabilistic behavior findings, not deterministic security failures.

Sanitized evaluation cases cover context-first inference, meaningful defaults,
premature hypotheticals, corrections preserving decisions, helping formulate an
answer, manuscript edit boundaries and handoff fidelity. They are cases to evaluate,
not falsely claimed automated behavioral passes. This synthetic dogfood does not
establish the user's subjective satisfaction or prove behavior on the eleven real
items. No optimization for question count, speed or agreement was used.

## Failed attempts, fixes and honest limits

- Initial Codex custom-profile attempts failed at turn reload; process-scoped
  definitions fixed the installed-version contract. Partial MCP overrides also
  required explicit disabled definitions. Final authenticated tests passed.
- Claude native invocation with `--restricted` suppressed personal skills and
  returned `Unknown command`. Native discovery tests use documented user skill
  loading without that flag, while preserving plan permissions and narrow tools.
  App-owned SDK sessions remain restricted and load the canonical source explicitly.
- Claude's restricted writer left newly created empty staging directories. Cleanup
  now removes only those newly created empty runtime directories, preserving all
  pre-existing or nonempty data. The exact-directory Build retest passed.
- Final review found ownership-before-recovery, preference preservation, project
  identity and concurrent-question defects. Each received a targeted fix and
  regression. A launcher test caught flags-before-command handling, now fixed.
- App Server and custom permission profiles remain experimental/beta. The app's
  conservative `.git` restriction means target commits require an explicitly
  authorized native session. Broader permission requests are declined, not bypassed.
- External editors do not share a true filesystem compare-and-swap transaction.
  Revision checks and recovery limit conflicts but cannot guarantee safety against
  arbitrary writers racing the final atomic rename or against power loss.
- Interrupted requests are never blindly replayed. Codex offers provider-state
  inspection; Claude uncertainty is exposed for manual review and a fresh-thread
  boundary. Completed sessions on both providers resume normally.
- There is no account-side ChatGPT installation or cloud synchronization. Generated
  copy/paste and explicit Markdown upload are implemented. No external blocker
  remains for the supported local workflow.

Before publication, the tracked-file inventory and credential-pattern scan were
reviewed. Real sessions, preferences, auth material, raw logs, screenshots and
transcripts are excluded. The intended origin is the private personal repository
`AhmadAlkadri/relentless`; final publication verification is recorded in the handoff.

## Attached upgrade (2026-09-09)

The preceding sections describe the 0.1 standalone implementation and its historical
Print semantics. They are not evidence for attachment. The upgrade replaces the
fixed-field `executionPrompt()` template with a canonical private Markdown prompt
and synthesis by the interviewer. Print may retain that prompt; Print never grants
execution authority. Attached Build returns its exact revision/body to the original
native conversation, while explicit standalone execution remains available.

Inventory: clean local `main` at `1134dad`; expected HTTPS origin confirmed private
through `gh repo view`. Installed Codex 0.153.4, Claude Code 2.1.266, Node 25.2.1.
No scientific target, remote host, WSL environment or real compute job was accessed.

The first attachment/installer checkpoint passed 54 tests and `npm run check`. New tests exercise
per-connection ownership, duplicate launches, Git worktree/subdirectory/symlink
context, authenticated bridge isolation, acknowledged answers/controls, late
finish requests, uncertain Build revocation, prompt source revisions and exact
Print/Build body identity, manual/candidate preservation, and bounded MCP config
installation/rollback. Existing standalone/storage/worklist/Tune tests remain.
These tests establish state transitions and permissions, not synthesis judgment.

Native CLI parsers accepted isolated registrations: Codex `mcp get --json` and
Claude `mcp add-json --scope user` / `mcp get`. The installer adds only one managed
server; it preserves unrelated configuration bytes and rejects conflicts. Codex
approvals name four interaction tools, with no tool to authorize Build. Claude
registration carries a 30-minute timeout; existing tool approval policy remains.

Initial live attempts found two harness issues: restricted Codex environment
forwarding omitted fixture storage settings, and the repository's Playwright browser
build was missing. The first synthetic session reached the normal local server;
its own files were moved to a private temporary archive and the newly started idle
server stopped. That launch also requested a system-browser opening; no personal
browser content or profile data was read or automated. No real session was edited. The harness now explicitly supplies
fixture-only MCP environment values including `RELENTLESS_NO_OPEN=1`. Chromium
153.0.8010.12 was installed in the Playwright cache, and subsequent tests use fresh
browser contexts. These failed attempts are not counted as acceptance passes.


### Native continuity and deliberate execution

The opt-in `attached-live.mjs` harness establishes a constraint in a real native
conversation first, resumes that exact captured session, then drives two answers,
Print and Return/Build through a fresh Chromium context. Raw native JSONL, Markdown,
process evidence and screenshots stay in private OS temporary directories. The
original constraint is keyboard-only/local-only with synthetic word `INDIGO-731`.
Both providers retained it and the two submitted decisions afterward. Every run
reported an empty app-owned `providers` map; optional helpers are recorded separately.
These are native CLI programmatic sessions with a real browser, not an interactive
terminal-emulation claim.

| Run | Native session before and after | Private fixture directory basename |
| --- | --- | --- |
| Codex, 135-second unanswered question, Return | `01a0851c-d790-7bd1-aded-a24bce7d5683` | `relentless-attached-live-codex-HNXdFD` |
| Claude, 135-second unanswered question, Return | `5824407a-121a-4930-9f9c-f1d7de481a79` | `relentless-attached-live-claude-57sM7Q` |
| Codex, explicit fixture Build | `01a08522-1840-7ad3-9b44-0458444144c6` | `relentless-attached-live-codex-mHSimy` |
| Claude, explicit fixture Build | `d572c044-c568-442f-9d95-0b1f04a8524d` | `relentless-attached-live-claude-2fXGyW` |
| Claude, 150-second wait with native backgrounding enabled | `84ec1b53-9847-453a-b98c-6a17d512d3f1` | `relentless-attached-live-claude-pQtdgw` |
| Codex installed `$relentless` attached invocation | `01a08535-8a16-7153-99e2-2023711f9328` | `relentless-attached-live-codex-aixbf0` |
| Claude installed `/relentless` attached invocation | `dd486120-7ffa-411d-b861-f0e813e2f06b` | `relentless-attached-live-claude-lHqkKB` |

Both Build runs wrote only disposable `result.txt`, checked exact `INDIGO-731\n`,
and retained README. Return runs wrote nothing in their fixture project. Each
printed body was reused unchanged; the deterministic browser suite additionally
compares the actual delivered Build body byte-for-byte against Print and disk.
The two Build prompt hashes are
`398498da2b762d3f96ed91d2c2d4efe3cd6fefb5347cc26f5c41d74547ed514a`
and `6b4b4bfda994cb0493030aa584dd735e0f7f788da034e0606a59d3ca493c6abe`.
These tests used explicit synthetic instructions and bounded provider permissions;
they do not prove universal native-agent obedience.

Claude background evidence is stronger than a short headless wait: the fixture
explicitly sets documented `CLAUDE_AUTO_BACKGROUND_TASKS=1` for its own `-p` process.
The native log records MCP wait task `kp5ceoccl` moving to the background at 120
seconds, a blocking `TaskOutput` call, then task completion/notification at the
150-second reply. The same session acknowledges the answer and continues normally.
There was no second pending question or app-owned synthesis. This verifies the
installed background-task mechanism, not the interactive terminal launch itself.
Codex's 135-second wait exceeds its unconfigured 60-second MCP timeout; the managed
30-minute server timeout permits the pending call to survive.

### Helpers and browser behavior

Real helper tests run each provider independently of the synthetic interviewer's
provider label. `helpers-live.mjs codex` used `gpt-6-astra` with xhigh effort and
helper session `01a08525-4084-70d3-8f3d-ba093ddb60a3` (directory
`relentless-helper-live-codex-OrO5a7`). Claude discovered actual model
`claude-opus-5[1m]`, helper session `de4765c0-a4f3-4001-88ea-941d045016e2`
(directory `relentless-helper-live-claude-cvz40O`). Both private follow-ups resumed
those exact IDs. Neither overwrote the user's existing answer, submitted an event,
changed the working prompt, copied private scratchpad/secret canaries into output,
or wrote project files. Insertion required the user's append choice. Zero browser
page errors were recorded. Private discussions stayed out of the public conversation.

The dedicated helper read tools and native restrictions are tested separately from
answer quality. Deterministic tests cover malicious control-shaped output, scoped
reads, symlink/config/secret exclusions, one helper lease, cancellation including
TERM-resistant owned processes, session substitution refusal, private mailbox
ownership and stale/manual draft preservation. A terminal helper cannot overwrite
newer main-session metadata: its lease-bound private return is integrated by the
server once. Native terminal resumption uses exact IDs and never `latest`.

`attached-browser.mjs` passed 9/9 scenarios in fresh Chromium 153.0.8010.12, with zero
page errors and zero standalone calls. Its report and screenshots are in
`relentless-attached-browser-PaMELC`. It uses a synthetic bridge and injected helper
runner, so this is UI/state evidence, not another native-continuity claim. Coverage:
keyboard selection by native typeahead, long Unicode answers, dark appearance,
reload/draft recovery, ordinary Save versus Continue, external question revision
conflicts, Print preparation/reuse, manual prompt comparison, both malicious helper
drafts, edited-draft private discussion, insertion race protection across contexts
and sessions, acknowledged Return, exact Build identity and Pause/restart recovery.
Desktop screenshots of the question, prompt, long-answer layout and helper insertion
were inspected. Existing dropdowns, reading width and Build presentation remain.
A Chromium ArrowDown-only select test also failed on a plain native select; the
harness uses native typeahead instead of mislabeling that browser limitation an app bug.

### Synthesis evaluations

`test/fixtures/reconnaissance.mjs` is sanitized, synthetic evidence. It contains no
real hardware inventory, addresses or scientific-project state. `synthesis-live.mjs`
ran the original Codex interviewer through MCP plus Chromium for both variants.
Full generated prompts were read and assessed semantically as well as checked for
readiness, exclusions and provenance. No helper or app-owned synthesizer was used.

- Provisional (`relentless-synthesis-provisional-x9dGUw`, prompt
  `28093dac0a5f436d64a56efda6c6cee306aa1d3518737f081038361e27eaaa2a`):
  exposed unsettled environment, workload, resource policy and access; labeled the
  old simulated 1.2 GiB measurement historical; proposed bounded investigation and
  conditional later trial/recovery; remained not ready for implementation.
- Settled (`relentless-synthesis-settled-u3a7XE`, prompt
  `c054f36f9270f6dfd658fdf38554671ff5012e493174afd801a5b6dd5c5a5ef9`):
  incorporated later answers despite blank original fields: existing Linux, one
  worker, 2 GiB, 60 seconds, user-run manual trial and returned evidence, no SSH or
  configuration/service/process changes. Concrete slices cover local harness
  preparation, one manual trial with result/resource recovery, then numerical and
  resource comparison with fresh measurements and meaningful tolerance. It is ready
  for bounded local preparation, not autonomous access to another host. It explicitly
  investigates whether hard resource limits can coexist with the no-process-killing
  constraint before offering a trial command.

The prompts no longer wrap an unreconciled packet with claims of "no decisions",
"no facts" and "no questions". These two successful behavioral samples do not
certify all future synthesis or turn historical observations into current facts.

### Installation, compatibility and remaining live limits

Before installation, private sessions/history/recovery were copied to
`~/.local/share/relentless/upgrade-backups/2026-09-09T07-51-21.852Z`.
No batch inference or automatic attached conversion was performed. Existing Markdown
and provider identifiers remain readable. The canonical prompt is the designated
`sessions/<id>.prompt.md` companion; metadata and candidate/history files preserve
revision, readiness, context and manual-edit recovery without another authoritative
prompt. No old Build is resurrected.

Actual `node scripts/install.mjs` and repeat installation passed: eight canonical
skill/launcher symlinks verified and both user-scope MCP registrations installed then
reported unchanged. `relentless doctor`, Codex `mcp get relentless --json`, and
Claude `mcp get relentless` accepted the entries; Claude reported Connected and
1800000ms timeout, Codex reported 1800 seconds. The actual full rollback dry-run
passed. Isolated tests executed rollback, exact prior-byte restoration, preservation
of unrelated edits, repeat install, conflicts, relocation and interrupted recovery.
Global registration was left installed as requested. Restart existing native clients
once; future invocations need no wrapper or flags.

Both native terminal-only skill-discovery checks read protocol 2.0.0 from the
installed canonical source. Both real standalone `live-build.mjs` regressions passed
with only `hello.txt` containing `hello relentless\n`, no action-word authorization,
and reviewed but unaccepted Tune proposals. Their temporary fixture directories are
`relentless-build-codex-0WY389` and `relentless-build-claude-Fi3Xsi`.

Known live limits are explicit:

- Two unattended interactive Claude attempts (PTY `relentless-interactive-gGWWoC`
  and actual WezTerm `relentless-interactive-vHunoQ`) established native baselines
  but reached no bridge call within their 180-second limits. The latter successfully
  spawned captured pane 1 using supported program/cwd controls. Only test-owned
  processes were stopped. No terminal scraping or keystroke injection was used,
  and the cause was not established. These are not counted as interactive passes.
- Exact original pane activation separately returned success for captured pane 0
  through `wezterm cli activate-pane`. Full interactive helper discussion/exit/return
  in WezTerm has deterministic ownership/return tests and supported argv, but has
  not been certified end-to-end with a human-operated native terminal. The sidecar's
  private discussion and exact-session resumption are live-tested for both providers.
- The bridge mechanically isolates roles and authorizations, but cannot sandbox or
  interrupt every native tool in the original conversation. Read-only interviewing
  outside its own MCP tools remains skill guidance plus native permissions. A finish
  during native computation is honored at the next supported tool boundary.
- A browser tab is left in an acknowledged completed state; core handback succeeds
  without relying on externally opened tab closure or broad Accessibility access.
- Crash/power-loss and arbitrary simultaneous filesystem writers are not universally
  certified. Notes and candidates are preserved; uncertain Build is never replayed.

No real secondary host, private transcript excerpt, token, remote scientific
environment or compute workload was used or committed. All browser automation used
fresh isolated contexts; the initial system-browser launch mistake is recorded above.

Final review additionally bound attachment reuse to known native session identity and
project inode, preserved the native ability to interview this source checkout without
opening it to the standalone provider, and revoked pending standalone Build approvals
when the canonical prompt body changes. Helper discussion revalidates the project
before spawning and again in its terminal wrapper. The edited helper draft is
deliberately included in exact-session terminal resumption, bounded to 64 KB for
native argv; longer private discussions remain available in the sidecar.

A later real standalone browser run (`relentless-browser-live-YvYMyU`) passed interview,
external editing, Print and fixture Build but failed Tune storage: streamed Codex
output contained an abandoned unfinished JSON fence before a corrected final answer.
The unchanged Markdown and raw output were preserved. Supported native `thread/read`
confirmed one completed `agentMessage` with phase `final_answer`; generated installed
schemas confirmed the field and completion events. The adapter now saves native
completed final text while retaining the raw stream in recovery. A deterministic
unfinished-fence regression passes; the full live browser retest is recorded below.

Final deterministic checks: **82/82 `npm test` cases passed** and `npm run check`
passed (JavaScript syntax, canonical skill metadata, whitespace). The final independent
browser regression passed **12/12** cases with zero page errors and zero standalone
calls, recorded in `relentless-attached-browser-KVoxEQ/report.json`. Added cases
cover automatic comparison after stale/manual generation, retaining obsolete
candidates as older proposals, reuse on repeated Print/premature Build, and keeping
pending Print tied to the correct session. Wrapped candidate text and helper borders
were visually inspected. Native final-message fields were checked against installed
generated schemas in `relentless-codex-schema-review-LlPTUJ`.

The full standalone browser retest passed after the completed-message fix: fixture
`relentless-browser-live-JHpiNJ`, session `3b010086-bdf7-4f00-ad51-5a4d6bfc7c12`.
It exercised the real Codex adapter, same provider-thread interview continuation,
external Markdown replacement and refresh, Where are we, Print, deliberate Build
of only the exact greeting file, Tune review, preserved unsent writing and browser
Pause. Zero page errors were reported. The earlier failed Tune run is retained above
as failure evidence; no personal method/preference proposal was applied.
