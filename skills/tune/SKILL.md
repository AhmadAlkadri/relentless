---
name: tune
description: Explicitly review a Relentless session, propose small evidence-backed method, preference, project or interface changes, and apply only reviewed version-matched approvals.
disable-model-invocation: true
metadata:
  protocol-version: "1.0.0"
---

# Tune

Use the shared method in `../relentless/SKILL.md`; do not maintain another
interview protocol here. Native Codex invocation is `$tune`; Claude Code invocation
is `/tune`. In the workspace `/tune` is the same deliberate review control.

Open the selected session with `relentless tune <session-id>`. Review its relevant
exchanges and explicit feedback. Without a selected session, use the current
conversation as review context and label that limitation. Scratchpad and unsent
drafts remain private unless the user explicitly includes them.

Propose a small number of changes. "No change needed" is valid. For each proposal
show the observed friction or success, supporting exchange or feedback, proposed
change, scope (method / personal preference / project / interface), expected
benefit and possible downside, and actual diff or concrete implementation proposal.
Support accept, edit, reject and defer. A review is not blanket permission to apply.

Keep shared method changes in the canonical skill source under version control.
Keep personal preferences locally with inspectable revision history. Keep project
decisions in their session. Display settings can change directly; interface code
changes become explicitly approved implementation work, never preference patches.
Do not silently promote a project decision into a universal rule.

Approved patches must match the exact reviewed source version. If that source has
changed, regenerate the diff and ask for a fresh decision. Apply narrowly, run
relevant regressions, preserve rollback and commit only approved method files.
Prefer replacing, simplifying or removing contradictory guidance to accumulating
rules. Never sweep unrelated changes into a commit or push automatically. Reject
and defer leave the reusable rules unchanged.

Display which protocol version a running agent loaded. A changed source file does
not prove that an existing session reloaded instructions. Apply updated instructions
at a clear new-turn or new-thread boundary supported by the backend.
