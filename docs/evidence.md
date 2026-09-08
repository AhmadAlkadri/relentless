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
