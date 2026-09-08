Feature: Deliberate reviewed tuning
  Scenario: Rejected proposals leave reusable rules unchanged
    Given a method proposal with its reviewed source hash
    When the user rejects it
    Then canonical skills and preferences remain unchanged

  Scenario: Source changes invalidate approval
    Given a method proposal reviewed against version A
    When the source changes to version B before acceptance
    Then the patch is not applied
    And the user receives a new diff for review

  Scenario: Scope stays separate
    Given project-specific feedback and an interface code idea
    When Tune proposes improvements
    Then the project decision stays in the session
    And the code idea becomes an explicit implementation proposal
    And neither is silently written as a global preference

  Scenario: Approved method change is reversible and local
    Given a narrow approved patch against the current canonical source
    When the relevant regression checks pass
    Then only approved method files are committed
    And the previous version is recoverable
    And no push occurs automatically
