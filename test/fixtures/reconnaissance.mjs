// Entirely synthetic; no real hardware inventory, addresses, paths or measurements.
export const reconnaissance = `Imported reconnaissance, synthetic and historical (2025-01-15):
A spare secondary machine might run bounded numerical tests. A simulated measurement
from that earlier date reported 1.2 GiB peak resident memory for a one-worker trial.
That number is historical evidence, not a current resource measurement. A note
suggested a Linux userland on the existing installation; native Windows and a new
installation remain alternatives, not accepted choices. The project has a small
reference test whose result can be compared with a local baseline. No access has
been granted, no commands have run, and no resource ceiling has been selected.
Questions left open: which environment, which workload and first result, worker and
memory limits, timeout, manual vs remote access, privileges, and what must stay
untouched. Suggestions include recovering result files plus elapsed time and peak
resident memory after one bounded trial. Exclude ongoing services and large sweeps
unless explicitly agreed later. The original sidebar decisions/facts/questions are
blank; that does not mean this packet establishes no facts or no questions.`;
export const decisions = `For this synthetic plan, use the already available Linux
userland, with no installation or WSL/Windows changes. Scope is one existing tiny
reference test and recovery of its output, elapsed time and fresh peak resident
memory. Use one worker, a 2 GiB memory ceiling and a 60-second timeout. I will run the
reviewed command manually on the secondary machine and return its files; the agent
may prepare the local harness but must not SSH, contact that machine, install a
service, change privileges, kill processes or run sweeps. Compare recovered output
against a locally recorded reference tolerance. Stop on the stated limits and
preserve partial results. The old 1.2 GiB observation must be revalidated; it is not
a current measurement. Those environment, resource, scope and access choices are
settled for the fixture.`;
