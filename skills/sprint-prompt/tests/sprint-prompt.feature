Feature: Client-neutral sprint-prompt handoff
  As a user who wants work handed to a future session
  I want a comprehensive thin-slices brief authored without implementation
  So that a fresh agent session can execute it from a one-line kickoff

  Background:
    Given the user asks for a next-sprint prompt without implementation

  Scenario: Write a brief without implementing it
    When the sprint-prompt skill runs
    Then a sprint-prompt file follows the repository naming convention
    And no production code from the brief is written
    And no briefed runs, renders, fixes or installs are performed
    And only the brief, explicitly requested skills or memories and a documentation commit are produced

  Scenario: Use thin verified slices
    When the sprint-prompt skill writes the brief
    Then the brief has a mission and settled decisions with verified facts and numbers
    And verified context includes paths, commits, environments, costs and reproduction commands when known
    And each ordered slice has acceptance criteria, tests and a focused commit
    And handoff requirements state what the final report begins with

  Scenario: Authored skills need behavioral cases
    Given the briefed sprint will author a skill
    When the brief is written
    Then it requires a Given/When/Then feature file for that skill
    And it does not call the existence of scenarios a passing behavioral evaluation

  Scenario: Preserve epistemic distinctions
    When the brief is written
    Then facts, inferences and open questions are labelled
    And known failure modes and negative results are preserved

  Scenario: Print the one-sentence kickoff last
    When the skill finishes
    Then the final output references the sprint-prompt file path
    And it requires thin verified slices, focused commits, a clean tree and the handoff
    And no commentary follows the kickoff sentence

  Scenario: Thinking aloud is not a request to build
    Given the user asks to scope work but explicitly not build it yet
    When the skill runs
    Then the deliverable is the brief and one-sentence kickoff
    And no step of the briefed work is carried out

  Scenario: Relentless Print stays in private session storage
    Given the user asks only to Print inside Relentless
    When a handoff is generated
    Then this saved-brief workflow is not implicitly invoked
    And no handoff file or commit is created
