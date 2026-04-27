# Acceptance Criteria

How stories in a work-package backlog express what "done" means — using EARS for system behaviour and Gherkin for observable scenarios.

## EARS — Easy Approach to Requirements Syntax

EARS statements define what the system must do in response to a condition. Every story needs at least two.

### Patterns

```
THE SYSTEM SHALL {behaviour}.

WHEN {trigger}, THE SYSTEM SHALL {behaviour}.

WHILE {state}, THE SYSTEM SHALL {behaviour}.

IF {optional feature is available}, THE SYSTEM SHALL {behaviour}.

WHEN {trigger} AND WHILE {state}, THE SYSTEM SHALL {behaviour}.
```

### Good EARS examples

```
WHEN a customer clicks "Add to cart", THE SYSTEM SHALL add the selected
product and quantity to the cart and display the updated item count.

WHEN the cart API returns a 4xx or 5xx status, THE SYSTEM SHALL revert
the optimistic cart update and display an error message.

THE SYSTEM SHALL render the cart page with LCP p75 < 2.5s as measured by
RUM.
```

### Common failures to avoid

```
# Too vague — not independently testable
THE SYSTEM SHALL handle errors correctly.

# Implementation detail — describes how, not what
THE SYSTEM SHALL call CartRepository.add() with the SKU and quantity.

# Compound — two behaviours in one statement (split it)
THE SYSTEM SHALL add the item and send an analytics event.
```

**Each EARS statement must be independently testable.** If a reviewer cannot verify it without asking the author for clarification, it is too vague.

## Gherkin — Given / When / Then

Gherkin scenarios describe observable outcomes from a user or external perspective. Every story needs at least one.

```gherkin
Scenario: customer adds an in-stock product to cart
  Given a product page for an in-stock item
  When the customer clicks "Add to cart"
  Then the mini-cart popover opens showing the added item
  And the cart item count in the header increments by one
```

### Rules

- `Given` — precondition (what is already true)
- `When` — the action the actor takes
- `Then` — the observable outcome (what the user sees or what is measurably true)
- `And` — additional assertions under `Then`

**`Then` must describe a user-observable outcome, not an internal state.** "The CartRepository contains the item" is an internal state. "The mini-cart shows the item" is observable.

### Anti-patterns

```gherkin
# Then describes an implementation call, not an observable outcome
Then CartRepository.add() is called

# Scenario is a test procedure, not a specification
Given the test harness is configured
When execute test case T-001
Then the system passes

# Missing Given — ambiguous starting state
When the customer clicks "Add to cart"
Then the cart updates
```

## Placement

EARS + Gherkin belong in `work/{d}/{wp}/backlog.md` under each story block:

```markdown
- [ ] **[CART01-03] Add to cart**
  - **Acceptance (EARS):**
    - WHEN a customer clicks "Add to cart", THE SYSTEM SHALL add the item
      and display the updated mini-cart.
    - WHEN the cart API returns an error, THE SYSTEM SHALL revert the
      optimistic update and show an error message.
  - **Acceptance (Gherkin):**
    ```gherkin
    Scenario: successful add to cart
      Given a product page for an in-stock item
      When the customer taps "Add to cart"
      Then the mini-cart opens with the added item
    ```
```

They do **not** belong in `domain/{d}/backlog.md` (epic scope — too detailed) or `domain/{d}/product.md` (strategy scope — wrong seam).
