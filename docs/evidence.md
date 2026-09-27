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

## 2026-09-09: explicit project selection from one native conversation

The root dogfood orchestrator reported a live native `open_interview` launched from
a portfolio directory: the sidecar used that parent target despite an intent/title
naming a child project. It then inspected the browser and confirmed the parent path
under the child-project title. No private title, path, transcript or session content
is reproduced here. Source inspection confirmed the old canonical skill and MCP
description required actual native cwd, although the bridge already keyed separate
attachments by selected worktree, project inode, owner and known native session ID.
This evidence identifies a selection/protocol mismatch, not a loss of Build isolation.

Three new deterministic regression cases failed before the fix: snapshots omitted
the selected target and directory provenance, and explicit resume of A with B's
directory silently returned an already open B instead of rejecting the mismatch.
The runtime now exposes target and honest caller-supplied selection, retains legacy
supplied-path fields, and honors exact saved-session selection before automatic
reuse. The existing `cwd` MCP schema and Build authorization checks are unchanged.
The canonical skill (2.0.1), MCP description and compatibility guidance explain the
selected operating directory without claiming that the native process cwd changed.
An existing private coordination session can hold the portfolio ledger; it has no
execution prompt or authority and is not copied automatically into project contexts.

Verification performed by the implementation worker:

- `node --test test/attachment.test.mjs`: **15/15 passed**, exit 0.
- `npm test`: **85/85 passed**, exit 0.
- `npm run check`: passed JavaScript syntax, canonical skill metadata and whitespace,
  exit 0.
- The new A, B, A fixture used one owner and one explicitly supplied synthetic
  native ID, preserving each session, submitted exchanges and canonical prompt.
  Snapshots excluded the other project's context and private scratchpad/draft
  sentinels; process cwd stayed unchanged. Cross-target and cross-revision Build
  requests were rejected. Exact A Build was delivered once with its unchanged body,
  target and revision; B gained no control or authority. No app-owned provider ran.
- Subdirectory/symlink reselection retained legacy path provenance, and old notes
  without the new selection field remained readable. Explicit resume selected the
  requested saved notes even with another interview open for the same target; notes
  resumed by a new owner had no restored ready prompt or pending Build control.

These are synthetic state-machine tests, not live native switching, browser rendering,
worker execution, process supervision or a portfolio-wide Build certification. The
root will verify the interrupted native operation separately after integration. The
worker did not access or mutate live sessions, install configuration, start a provider,
or restart any service. The shared UI service must reload `src/attachment.mjs`; a safe
idle service restart suffices. Existing MCP processes call `connection()` for each
request and retain their owner, so no native conversation restart or reinstall is
needed. An already loaded MCP tool description may remain old until the client's
next ordinary restart; its parameter schema is compatible and the canonical skill
is read from the updated source.

Root integration verified `c26c4b2` in the original native conversation. The root
independently inspected the routing/authority diff and reran the attachment suite:
**15/15 passed**, exit 0. Read-only live metadata showed no active provider or
helper, so only the shared UI service was restarted. The native MCP connection
and its owner remained in use; an unrelated paused session remained paused.
Through the installed native tools, the root selected project A, resumed the
private portfolio coordination session, and resumed A. The returned canonical
targets were correct; A retained the same session, attachment and context revision,
and its public context excluded the portfolio ledger. Both sessions had no prompt.
The root published the first substantive project question and inspected Safari's
accessibility tree and rendered question/answer area. The browser displayed the
correct project path and original-conversation ownership explanation. Duplicate
tabs created by the switching check were closed, leaving one active sidecar tab.
No native client reinstall/restart, project Build, helper, or implementation worker
launch was part of this live check. The real answer/Build round trip and concurrent
execution remain to be dogfooded; the synthetic authority tests are not a claim
that those portfolio operations have already completed.

## 2026-09-09: idle attached HTTP wait exceeds the fetch header budget

The root dogfood orchestrator reported a real installed native `await_interview`
failing after several minutes with `isError: true` and `fetch failed`. Its immediate
native status check retained the same attached session and unanswered question,
with no prompt or pending control. No private session contents or identifiers are
reproduced here. The error itself did not expose its underlying timeout cause.

Source inspection established a concrete mismatch: `connection.api` uses built-in
fetch with no timeout dispatcher override; `server.mjs` originally sent no response
headers until `Attachments.wait` returned, whose default is 1,500,000 ms. Executable
inspection on Node v25.2.1 / Undici 7.16.0 found the bundled assignment
`this[kHeadersTimeout] = headersTimeout != null ? headersTimeout : 3e5;` in
`process.binding('natives')['internal/deps/undici/undici']`. The 25-minute idle wait
therefore exceeded that client's five-minute response-header budget. This explains
the observed failure consistently, although the original error did not retain the
inner exception and its exact elapsed time was not captured.

The authenticated HTTP await route now caps each request at 240,000 ms and returns
the existing unauthorized `pending` result on expiry. Short caller waits remain
supported; the schema's previous maximum remains compatible. A server-start fixture
option may shorten, but never raise, this cap. Attachment delivery, ownership,
acknowledgment, question state and exact prompt/target authorization are unchanged.
No retry, replay, provider, dependency or scheduler was added. The canonical skill
2.0.2 and tool description state the bounded interval and same-attachment continuation.

Verification performed by the implementation worker:

- Before the runtime fix, the new real HTTP fixture using unchanged `api()` and
  default await failed with `TimeoutError` at its shortened two-second client
  deadline, exit 1. The cancellation fixture already passed. This is a scaled
  regression of header withholding, not a second five-minute production run.
- After the fix, `node --test test/bridge-wait.test.mjs`: **2/2 passed**, exit 0.
  Short server intervals exercised default and maximum requested waits, idle
  `pending` with an identical session/question snapshot, continuation into the
  original answer, explicit acknowledgment, and no redelivery of that answer.
  A wrong-target Build was rejected; the exact prompt/revision/target was delivered
  as authority once, an unacknowledged repeat was `handback-uncertain` without
  authority, and acknowledgment finished without replay or an app-owned provider.
- Real HTTP cancellation released the server's waiter without ending the session
  or consuming an event. The identical question then received an answer through
  a fresh wait on the same attachment and acknowledged it successfully.
- `npm test`: **87/87 passed**, exit 0. `npm run check`: JavaScript syntax, skill
  metadata and whitespace passed, exit 0.

No live session was mutated, no installed MCP process was restarted and no service
was reloaded by the worker. Only the shared server needs a safe idle reload; already
loaded MCP clients call `connection()` afresh and use the unchanged route/schema.
Existing recovery rules still apply: a service restart disconnects unfinished
attachments and revokes unacknowledged Build; the root must inspect and deliberately
reopen the same owned session before waiting again. No automatic authority recovery
was introduced. Native four-minute idle continuation after integration is a separate
live acceptance check, not claimed by the shortened HTTP fixtures.

Root accepted `0f913fb` after inspecting the HTTP cap and rerunning both real HTTP
regressions (**2/2 passed**, exit 0). At a supported boundary the root cancelled
only its pending transport, confirmed the original project attachment had no
submitted answers, prompt or pending control, and restarted the idle UI service.
The same installed MCP owner deliberately reopened the exact session; its
attachment and original question IDs were unchanged. An unchanged native default
`await_interview` then returned `operation: pending, authorized: false` after
**240,021 ms**, without a fetch error. A following status read confirmed the same
session, target, attachment and question, no exchanges, no prompt and no pending
control. This is live acceptance of one full-duration idle transport interval;
human answer/Build and concurrent project execution remain separate dogfood cases.

One host-wrapper limitation was observed during later tab cleanup: terminating the
outer JavaScript orchestration cell did not immediately cancel its nested native
MCP wait. A replacement wait was correctly rejected because the first still owned
the attachment. No question or authority changed. The root allowed the bounded
HTTP interval to expire before resuming. The earlier HTTP AbortSignal fixture
certifies cancellation at that transport layer, not cancellation propagation by
every hosting wrapper. Prefer the normal pending-result boundary for maintenance;
do not treat an outer task termination as proof that the MCP request ended.

## 2026-09-09: formatted answer composition and local equations

The user requested readable Markdown and equations while composing, with more
horizontal room. A synthetic pre-fix browser fixture reproduced the limitation:
at a 1600 px viewport the writing column measured exactly 760 px, neither the
main draft nor the structured question answer had a formatted view, and no
Split or Expand controls existed. `node scripts/compose-browser.mjs --baseline`
passed those baseline assertions before the runtime edits, exit 0; retained report
`relentless-compose-browser-WbMwF5/report.json` and screenshot
`screenshots/baseline-no-preview-760px.png`. The root separately reproduced Marked
consuming TeX backslashes, norm delimiters and matrix row separators.

Write / Split / Preview now wrap the existing main, structured-answer and returned
helper-draft textareas. Preview is read only, Write returns to the source and its
caret/scroll position, and Expand uses the available workspace width. Narrow panes
stack Split; long math and tables remain contained. The pre-existing unbroken
project path overflow was reproduced at 390 px during regression and fixed with
wrapping. These display preferences use browser storage only. Textareas and their
existing recovery, explicit save, helper-insertion and submission paths remain
the source of truth. The shared renderer also formats submitted conversation math.

KaTeX 0.18.7 is pinned with its locally served module, stylesheet and shipped font
allowlist. Its dependency engine requires Node 22.12+, now stated in package
metadata and README. Formula tokens are recognized before Markdown consumes TeX;
random per-render text placeholders pass through the unchanged DOMPurify Markdown
allowlist, then are replaced with KaTeX-generated DOM. User HTML cannot opt into
that richer DOM. Rendering uses fresh macros per formula, `trust: false`,
`strict: 'error'`, `maxSize: 20`, `maxExpand: 1000`, and a 12,000-character formula
limit. Unrenderable formulas retain exact source through textContent; raw error
messages are never inserted as HTML. The existing script/style CSP remains intact.
These choices follow the [KaTeX options](https://katex.org/docs/options) and
[security guidance](https://katex.org/docs/security); no general Markdown tag or
attribute permission was expanded.

Verification performed by the implementation worker:

- `node scripts/compose-browser.mjs`: **12/12 passed**, exit 0. Final report
  `relentless-compose-browser-Xj4l1r/report.json`, with detailed sanitized-render
  observations in `render-security.json`. Reports and screenshots are retained
  under the macOS temporary directory
  `/private/var/folders/gp/3clyhj4s45x6bqgx6ym6978c0000gn/T/`.
- Browser assertions cover exact norm/subscript/matrix/integral TeX annotations
  for all four delimiter styles; ordinary Markdown; escaped delimiters, inline,
  fenced, indented and raw HTML code; invalid formulas; isolated macros and bounded
  recursion; oversized source; malicious HTML, spoofed marker/class attributes,
  JavaScript/relative Markdown links and TeX URL/image/HTML commands; protocol
  fence hiding; working generated style properties under the unchanged CSP.
  There were **zero page errors, CSP violations, external requests, failed local
  assets or native/app-owned provider calls**. One deliberately selected answer
  helper used only an injected synthetic runner.
- UI checks cover both primary answer surfaces and a two-question batch, local
  mode/width switches, caret, textarea scroll, undo, Unicode recovery after reload,
  actual polling, composition-event deferral, ignored composing Enter shortcuts,
  delayed session switching with empty previews while loading, isolated session
  drafts, same-question Markdown revision changes, and empty subsequent questions.
  Mode/width/render operations made **no POST requests** and left canonical content,
  prompts and authority unchanged. Only deliberate Send/Continue produced answer
  payloads; those payloads matched the textarea strings including surrounding
  whitespace, Unicode and TeX. Legacy server conversation formatting/trimming is
  unchanged and is not an exact-file-byte claim.
- Helper draft preview and deliberate insertion retained the unsubmitted boundary.
  At 820, 390 and 320 px, both Split surfaces stacked without horizontal page
  overflow, including long display math, tables, and submitted inline math with
  both line-break opportunities and a single indivisible expression.
- `node scripts/attached-browser.mjs`: **12/12 passed**, exit 0; report
  `relentless-attached-browser-5P9qio/report.json`. Existing helper, Print, Build,
  draft recovery and attachment-control behavior remained green.
- `node scripts/browser-questions.mjs mock`: passed the structured question,
  external Markdown draft copy, free-form callback and follow-up, exit 0; fixture
  `relentless-question-mock-yDwuTW`, screenshot `output/playwright/mock-question.png`.
- `npm test`: **88/88 passed**, exit 0, including new local module/font route,
  traversal and unchanged-CSP checks. `npm run check`: JavaScript syntax, canonical
  skill metadata and whitespace passed, exit 0.
- The worker visually inspected expanded Split, single-pane Preview and 390 px
  stacked output, including correctly formed matrices, norms and integrals. Useful
  final fixture screenshots: `split-expanded.png`, `single-pane-preview.png`,
  `narrow-stacked-390px.png`, `final-expanded-split.png`.

The final browser report records Node v25.2.1 and the isolated Chromium version.
Node 22.12 itself was not exercised. Physical IME interaction, screen-reader behavior,
Safari and live native-provider/helper sessions are not certified by this fixture.
Synthetic event dispatch verifies composition handling, not every operating-system
IME. KaTeX supports a TeX subset; malformed, unsupported and oversized formulas stay
readable as source. The worker used no real session, transcript, preference or
helper data, controlled no user browser, and did not restart services or alter the
installed native clients. The root must review and arrange any idle shared-service
reload and browser refresh separately; no reinstall of native MCP configuration or
automatic authority recovery is part of this change.

Root acceptance of `6b12aeb`: independently reviewed the renderer, composer,
integration, static routes and unchanged authorization paths; inspected expanded
Split, single-pane Preview and 390 px stacked screenshots. A fresh independent
`node scripts/compose-browser.mjs` run passed **12/12**, exit 0, with report
`relentless-compose-browser-xz6cLs/report.json`; `npm run check` also passed.
The root then verified that the installed UI service had no active provider or
running/terminal helper, restarted only that service, and verified HTTP 200 for
both new modules, local KaTeX JS/CSS and a shipped font. Its loopback origin stayed
unchanged and all six existing session/helper Markdown files remained byte-identical.
The returned project session remained returned; its helper draft remained a draft.
The private coordination attachment was deliberately reopened on its same ID;
no project interview or Build was resumed. No native client reinstall was needed.

The normal browser-open call was issued for the returned project notes. Direct
Safari inspection remained unavailable: both the existing app handle and a fresh
app selection returned `cgWindowNotFound`. Thus live service activation and
synthetic Chromium rendering are verified; visibility in the user's Safari window
is not claimed. No user drafts were edited or submitted during live activation.

## Public release audit (2026-09-27)

The repository was reviewed again before changing GitHub visibility from private
to public. History has 18 commits on one branch, and no path was ever tracked outside
HEAD. Secret values, if any had been found, would not be reproduced here.

- gitleaks 8.30.1 (`git --log-opts=--all`, tracked-file `dir`, full working tree):
  zero findings in each scan.
- trufflehog 3.97.9 (`git`, tracked-file `filesystem`, no verification): zero
  verified or unverified findings.
- Manual review of `git log -p --all` and HEAD for key/token prefixes,
  Authorization headers, cookies, passwords, private keys, emails, IP addresses,
  UUIDs, absolute paths and personal content. Header code uses runtime values only;
  test credentials are named sentinels. No binaries, screenshots, browser state,
  transcripts or raw sessions are tracked now or in history.
- Accepted as non-sensitive: commit author email; provider session identifiers
  from synthetic live runs recorded above (unusable without the account); tool
  versions and login types; a macOS per-user temporary directory; names of two
  other personal skills in skill provenance.
- Dependencies: none are vendored. Installed packages are MIT, ISC, BSD, Apache-2.0,
  Unlicense or MPL-2.0/Apache-2.0, except `@anthropic-ai/claude-agent-sdk`, which is
  proprietary to Anthropic and installed from npm under its own terms. KaTeX is
  served at runtime from `node_modules`.
- `.gitignore` now also excludes `*.pem`, `*.key` and `*.p12`.

`docs/images/relentless-workflow.png` is a real capture of the attached browser UI
for a synthetic `tidy-notes` project. `scripts/readme-screenshot.mjs` isolates
`HOME` and `RELENTLESS_HOME` in a temporary directory, replaces provider, helper and
terminal functions with throwing stubs (zero calls asserted), blocks non-local
browser requests, and refuses to capture if visible text contains the real user
name, home path, store path or capabilities. The committed PNG was losslessly
recompressed with zopflipng. It was inspected on its own and inside the rendered
README before acceptance.
