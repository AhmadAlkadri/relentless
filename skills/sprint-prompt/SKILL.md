---
name: sprint-prompt
description: Package work as a comprehensive next-sprint brief in thin verified slices for a fresh agent session without implementing it, then print the one-sentence kickoff. Invoke for saved handoffs, including after investigation. Relentless Print is an unsaved generation operation and does not invoke this file-writing workflow implicitly.
disable-model-invocation: true
---

# Sprint Prompt

Package work as a brief for a future session. Do not do the briefed work now.

## Boundaries

Do not implement briefed work, edit production code, run the briefed workflow,
render its outputs, apply its fixes or install its dependencies. Create only the
requested sprint brief, any skill or memory explicitly requested now, and a
focused documentation commit when repository instructions or precedent call for
one. Existing authorization determines these boundaries; preparing a handoff does
not grant additional execution or publication permission.

Every skill the sprint will author must ship Gherkin/BDD acceptance scenarios in
a `.feature` file using Given/When/Then. Those cases guide behavioral evaluation;
their existence alone is not evidence that model behavior passed.

## Prepare the handoff

Scope from the conversation and inspect relevant repository conventions. Ask at
most one clarifying question, only if the goal is materially ambiguous. Write to
`spec/<audience>-<topic>-sprint-prompt.md`, following an existing repository naming
convention when present. The brief contains:

- Reader, date and canonical documents to read first, including the brief itself.
- Mission: the goal in two to four sentences.
- Decisions already made: settled choices and verified facts and numbers that
  the next session should not repeatedly reopen.
- Verified context to spot-check: paths, commits, environments, measured costs,
  reproduction commands, known failure modes and negative results. Label facts,
  inferences and open questions honestly.
- Ordered thin slices: each independently useful end-to-end capability has a
  goal, steps, acceptance criteria, relevant checks, a focused commit and required
  in-slice specification updates.
- Handoff requirements: what the final report must begin with, per-slice status,
  costs when known, deviations and what a subsequent session needs.

Keep unrelated changes out of the documentation commit. When a repository has no
requirement or precedent to commit the brief, report the clearly named file and
that choice. Do not invent model names, costs or measured results.

End with exactly one kickoff sentence in this form, with nothing after it:

> Read `spec/<file>.md` and execute it end to end in thin verified slices with focused commits, finishing with a clean tree and the required handoff.

The client-neutral scenarios in `tests/sprint-prompt.feature` preserve both
previous installations' useful behavior, including thinking aloud without building.
