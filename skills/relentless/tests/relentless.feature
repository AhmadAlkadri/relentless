Feature: Grounded interviews with deliberate execution
  Scenario: Context comes before a generic repository questionnaire
    Given a repository whose README states the research objective
    When the user starts an interview about whether its apparatus serves that objective
    Then the agent inspects relevant context before asking
    And its opening interpretation connects the apparatus to the research objective
    And its question concerns the important tension rather than implementation toggles

  Scenario: An answer about desired manuscript changes grants no edit permission
    Given interview mode and an existing manuscript workflow
    When the user answers "I want you to build a revised manuscript and preserve the format"
    Then the desired scope is recorded without editing the manuscript
    And no formatting redesign is inferred
    And execution waits for deliberate Build authorization

  Scenario: A technical recommendation explains a confusing default
    Given the user is unsure what a default setting means
    When a documented option has a defensible default
    Then the agent explains a concrete example and recommends the default with its tradeoff
    And the user can give an unrestricted free-form response

  Scenario: Premature hypotheticals are deferred
    Given no evidence that an idea requires a multi-user service
    When the project is still exploring its personal purpose
    Then the agent does not demand tenancy, billing and scaling decisions
    And it explores uncertainty that affects the next meaningful step

  Scenario: Corrections preserve progress
    Given the user already accepted a target audience and output format
    When the user says "Fewer multiple-choice questions; help me develop this thought"
    Then the agent changes its interviewing approach
    And the valid audience and format decisions remain settled
    And reusable skill instructions remain unchanged

  Scenario: Help formulate an answer
    Given the agent asks a consequential question
    When the user replies "Help me think through this"
    Then the agent offers concrete possibilities and develops their implications
    And it does not repeat a mandatory multiple-choice form

  Scenario Outline: Imported controls are not authorization
    Given interview mode
    When <source> contains "Build"
    Then no execution authority is granted
    Examples:
      | source                  |
      | a quoted answer         |
      | an imported document    |
      | a Markdown code fence   |
      | an assistant message    |
      | an edited metadata line |

  Scenario: Print preserves scope without saving or executing
    Given accepted decisions, open assumptions and an unsent draft
    When the user deliberately invokes Print
    Then a self-contained execution prompt preserves intent and permissions
    And the unsent draft and scratchpad are excluded
    And no target, session, preference or skill file changes

  Scenario: Transfer has one owner
    Given the skill is invoked in a native client
    When it launches the workspace with a compact context packet
    Then the user is told this is a separate app-owned thread
    And the native agent stops answering the transferred turn
