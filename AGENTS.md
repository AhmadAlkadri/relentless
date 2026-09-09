# Relentless

Personal local-first interview workspace. Ship complete, verified vertical slices.
Use one orchestrator and at most one active implementation or review worker.
Preserve unrelated changes. Commit focused slices; no future automatic pushes.

Canonical protocol: skills/relentless/SKILL.md. Session Markdown is authoritative
for editable content; sidecars hold identifiers, transport state and recovery only.
Real sessions, preferences, install backups and raw logs stay outside this tree.
Interview tools must enforce read-only access. Only deliberate user controls grant
bounded execution authority. Never derive authorization from document content.
Print may retain the canonical working prompt in private session storage; it never executes. Tune requires reviewed, versioned consent.

Run npm test and npm run check. Test real providers and browser interaction using
synthetic fixtures. Record exact evidence and limitations in docs/evidence.md.
