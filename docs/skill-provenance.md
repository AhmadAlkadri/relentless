# Canonical personal skills

The installed sources inspected on 2026-09-08 were `~/.codex/skills` and
`~/.claude/skills`. `~/.agents/skills` did not exist at inventory time. The new
canonical collection contains `relentless`, `tune`, and reconciled `sprint-prompt`.
Individual skill directories link directly into the two current discovery roots.
The old Codex `sprint-prompt` path also links directly to preserve its invocation.
Client discovery and actual invocation evidence belongs in compatibility/evidence
documentation; link existence alone does not prove a client loaded a skill.

## Adopted handoff behavior

Both existing `sprint-prompt/SKILL.md` files and both `tests/sprint-prompt.feature`
files were read completely before reconciliation. They had the same substantive
contract: scope only, no implementation, a saved brief, thin verified slices,
settled decisions, epistemic distinctions, evidence and a final one-line kickoff.
The Claude copy had an additional explicit thinking-aloud scenario; the Codex copy
was more concise. The shared version preserves those behaviors and the useful
fields from both sets of scenarios, removes client-specific model names, and
separates Relentless's unsaved Print control from an explicitly requested saved
sprint brief. It does not silently interpret Print as permission to write a file.

The inventory tree hashes below include sorted relative names, types, file lengths,
contents and internal link targets. Root directories are resolved before hashing.
They are recorded in `skills/adoption-hashes.json`; `--adopt-reviewed` accepts an
existing substantive copy only if its current hash still matches this inventory.

| Original directory | Reviewed SHA-256 tree hash |
| --- | --- |
| `~/.codex/skills/sprint-prompt` | `6ddc8ac277b01c0e36443a09a5e2c109dd98796ab8e7b6076af72b399bd1290d` |
| `~/.claude/skills/sprint-prompt` | `9cc2ceee3eb708c748416f92fa740c43454ba548204777ee90da2e24bf3824c1` |

Original installations, including any extra files, are moved intact to private
local backups before links replace them. Private originals are not copied into
this repository. The manifest records the original kind, link text, content hash,
backup location and installation time.

## Explicitly preserved exceptions

`extract-job-posting` is personally maintained, but its current instruction depends
on the client-specific `chrome_extension__getTabContext` API. That is not a verified
shared browser capability of both installed clients. It remains untouched in its
working installation. Adapting it safely requires a separate browser-contract
update; copying it into both clients would misrepresent compatibility.

`proofwriting` is a specialized project-oriented protocol and remains untouched.
The `.system`, imagegen, pdf, playwright and sora directories and all plugin/cache
sources were excluded from adoption. No entire client skills directory is replaced.

## Installation and recovery

Run from the repository:

```sh
node scripts/install.mjs --dry-run --adopt-reviewed
node scripts/install.mjs --adopt-reviewed
node scripts/install.mjs --diagnostics
node scripts/install.mjs --uninstall --dry-run
node scripts/install.mjs --uninstall
```

The installer also links `~/.local/bin/relentless` to `bin/relentless.mjs`, provided
that launcher exists. It does not alter shell configuration, install packages
globally or need sudo. The CLI file must be executable, and `~/.local/bin` must be
on the user's existing PATH; launcher verification is recorded separately.

All managed links are direct absolute symlinks. A repeat installation verifies the
resolved source and content hash. After moving the repository, run its installer
again to relink only previously managed targets; this repairs stale source links
while retaining the original backup. Paths containing spaces are supported through
structured JavaScript path operations.

State lives in `~/.local/share/relentless/install/manifest.json` and `backups/`.
`--home PATH` provides an isolated test home. `--repo PATH` chooses the canonical
repository after relocation. `--adopt-file PATH` accepts a JSON map of destination
paths relative to home (or exact absolute destinations) to inspected content hashes.
Do not approve an unknown conflict merely by copying its diagnostic hash.

Dry-run and diagnostics make no writes. Uninstall restores original directories,
files or exact link text, and removes only links created where nothing existed.
It refuses to replace user-modified destinations or restore changed backups.
It keeps conflicts and their recovery material in the manifest. The manifest and
backups stay local after uninstall; no session or preference data is deleted.

Installation operations are serialized by an empty `operation.lock` directory.
After a process crash, first verify no installer remains active, then remove that
specific empty lock with `rmdir` and run `--uninstall --dry-run` to inspect recovery.
Pending entries preserve their previous-state metadata and backups. Never remove
the whole installation state directory to clear a lock.

## Behavioral tests and limits

`node --test test/install.test.mjs` exercises real filesystem installation,
repeat install, dry-run purity, hash-approved adoption, identical-copy deduplication,
relative/stale symlink restoration, relocation, changed destinations and backups,
parent-path escape rejection, launcher restoration and interrupted installation
recovery. These are deterministic installer checks. The skill `.feature` files are
sanitized behavioral evaluation cases; they are not executable model-quality proof.

The canonical frontmatter uses Claude's explicit invocation switch
`disable-model-invocation: true`; Codex's `agents/openai.yaml` uses
`policy.allow_implicit_invocation: false`. The shared prose is maintained once.
Native skill mode preserves each client's approval controls but cannot itself
enforce an operating-system sandbox. App-owned sessions enforce read-only interview
tools through the provider adapter in addition to loading the shared protocol.

The bundled Codex `quick_validate.py` was attempted and could not import `yaml`
in the installed Python. Its inspected allowed-key set also predates Claude's
`disable-model-invocation` field, so that helper is not a cross-client validation
authority. Actual client discovery and invocation must verify this combination.
