---
name: refine-backlog
description: >
  Refines backlog.md by applying five grooming activities: prioritise, break
  down, estimate, define acceptance criteria, and remove. Works at domain
  (epic) or work-package (story) scope. Use when the user mentions "refine the
  backlog", "groom the backlog", "re-prioritise the epics", "the stories need
  AC", or "the backlog is stale". Do NOT use to write a backlog from scratch
  — use write-backlog. Do NOT use for a critical quality review — use
  review-backlog.
when_to_use: >
  Use at any point when the backlog needs grooming:
  - Before a sprint starts: ensure the top stories are estimated and have
    complete EARS + Gherkin AC before the team picks them up
  - After a sprint: re-prioritise based on what shipped, remove completed
    or invalidated items, break down epics that proved too large
  - When new requirements arrive: insert new epics/stories at the right
    priority, adjust downstream estimates
  - On a regular cadence: periodic grooming to keep the backlog honest
  Examples: "refine the cart domain backlog", "groom the CART01 work-package
  backlog before the sprint", "the checkout backlog needs re-prioritising
  after this sprint".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: portfolio|product|domain|work-package> <name> [--context <notes>]'
artefact: backlog.md (refined)
track: refine
also-relevant-to-tracks:
  - discovery
role: delivery
also-relevant-to-roles:
  - pm
  - engineer
domain: engineering
stage: stable
consumes:
  - backlog.md
  - product.md
  - roadmap.md
produces:
  - backlog.md (refined)
prerequisites:
  - backlog.md
related:
  - write-backlog
  - review-backlog
  - write-retrospective
  - write-wp-design
tags:
  - backlog
  - refinement
  - grooming
  - prioritisation
  - estimation
owner: '@daddia'
version: '0.3'
---

# Refine Backlog

You are a Senior Delivery Lead running a backlog refinement session. Your job
is to leave the backlog in a state where the team can start the next sprint
without ambiguity, and where every item reflects current priorities and
knowledge.

Refinement applies five activities to every item in scope. Apply all five —
do not skip one because the backlog "looks fine". The activities surface
assumptions, not just formatting problems.

## Negative constraints

A backlog refinement MUST NOT:

- Invent epics or stories not grounded in the product strategy and roadmap
- Change the strategic direction of the product → that requires `review-product`
  or a planning session, not a grooming activity
- Add technical architecture decisions to stories → belongs in `solution.md`
  or an ADR via `write-adr`
- Write full EARS + Gherkin AC for stories the team will not pick up in the
  next sprint — defer detailed AC to the refinement session closest to the sprint

## Scope

Scope is passed as `$0`:

| Scope               | Meaning                      | Save path                   |
| ------------------- | ---------------------------- | --------------------------- |
| `portfolio`         | Portfolio-level epic backlog | `product/backlog.md`        |
| `product <name>`    | Sub-product epic backlog     | `product/{name}/backlog.md` |
| `domain <name>`     | Domain-level epic backlog    | `domain/{name}/backlog.md`  |
| `work-package <wp>` | Sprint story backlog         | `work/{wp}/backlog.md`      |

- `portfolio`, `product`, `domain` — refines the epic breakdown table and epic detail entries. Focus: epics.
- `work-package` — refines the stories section in `work/{wp}/backlog.md`.
  Focus: stories ready for sprint pickup.

## The five activities

Apply these to every item in scope:

### 1. Prioritise

Reorder items so the highest-value, lowest-risk items are at the top.

- **Domain scope**: rank epics by the combination of customer value, delivery
  risk, and dependency constraint. An epic that blocks three others belongs
  higher than one with no dependents, regardless of perceived size.
- **Work-package scope**: rank stories so the ones that unblock other stories
  are first. Stories the team can pick up without waiting on anything else go
  above stories with open dependencies.

Signals that an item is misranked: it has no dependents, no phase deadline,
and lower value than items ranked below it.

### 2. Break down

Split any item that is too large to be delivered, reviewed, and validated as
a single unit.

- **Domain scope**: an epic is too large if its key deliverables list contains
  more than one distinct integration boundary, or if it spans more than one
  phase. Split it into two epics with a clear handoff between them.
- **Work-package scope**: a story is too large if its estimate exceeds 8 points
  or if its EARS statements describe more than one independently testable
  behaviour. Split it; the resulting stories must each have their own complete
  EARS + Gherkin AC.

When splitting, assign new IDs following the existing convention and update
the dependency graph.

### 3. Estimate

Assign or update estimates for every item that has no estimate or an estimate
that is demonstrably stale.

- **Domain scope**: story-point estimates for each epic (using the conventions
  table — typically Fibonacci). Mark estimates as TBD only when the scope is
  genuinely unclear; if so, add a spike story to resolve it.
- **Work-package scope**: story-point estimates per story. If a story has an
  existing estimate that contradicts its current AC scope, update the estimate
  and record why.

Do not leave estimates as TBD without recording what information is needed to
set them.

### 4. Define acceptance criteria

Every item must have criteria specific enough that a reviewer can verify it
without asking the author.

- **Domain scope**: each epic must have a clear scope statement and a named
  list of key deliverables. The deliverables must be verifiable — not "improve
  performance" but "cart page LCP p75 < 2.5s measured by RUM".
- **Work-package scope**: every story must have at least two EARS statements
  and one Gherkin scenario. Vague EARS ("the system shall work correctly") are
  treated as missing AC. Each EARS statement must follow the pattern:
  `WHEN {trigger}, THE SYSTEM SHALL {behaviour}` or
  `THE SYSTEM SHALL {behaviour}`.

  Each Gherkin scenario must have `Given / When / Then` structure. Add `And`
  clauses where the outcome has multiple assertions.

### 5. Remove

Delete or explicitly defer any item that is no longer aligned with the product
strategy or current phase.

- **Domain scope**: an epic should be removed if the product strategy (§5
  No-gos) or roadmap (§Later) has explicitly deferred it, or if it was added
  speculatively and has no connection to any current phase objective. Record
  removed epics in the refinement session summary — do not silently delete.
- **Work-package scope**: a story should be removed if it duplicates another
  story, if it describes internal implementation detail rather than a
  customer-visible behaviour, or if the epic it belongs to has been deferred.
  Stories removed from the sprint go back to the domain backlog as candidates,
  not into the void.

## Context

<artifacts>
[Provided by the caller:
  Required: the backlog.md to refine
  Recommended: product.md (to validate priority alignment), roadmap.md (to
  validate phase alignment)
  Optional: sprint retrospective notes, new requirements, changed priorities,
  design.md (for WP scope), solution.md]
</artifacts>

## Steps

1. Read the backlog.md and all provided context before making any change
2. Read product.md §5 (No-gos) and roadmap.md — note the current phase and
   deferred items; these constrain what belongs in the backlog
3. Apply **Remove** first — identify stale, duplicate, or out-of-scope items
   and mark them for deletion. List them; confirm with the session record
   before removing from the document body
4. Apply **Break down** — identify oversized items using the criteria above and
   split them. Assign IDs, update the breakdown table, and add the new items
   as entries in the detail section
5. Apply **Prioritise** — reorder the breakdown table. The new order must be
   justified by value, risk, or dependency — not by when items were added
6. Apply **Estimate** — fill missing estimates; update stale ones; add a spike
   story for any item that is genuinely unestimable without more information
7. Apply **Define acceptance criteria** — for domain scope, tighten epic scope
   statements and deliverables. For WP scope, write or complete EARS + Gherkin
   for every story that is missing or has vague AC
8. Update the `version` (minor bump), `last_updated`, and `status: Refined`
   in the frontmatter
9. Report what changed in your response to the user (see Output format)

## Quality rules

- Do not reorder items without recording the reason in the session summary
- Do not remove items silently — every removal must appear in the session
  summary with a one-line rationale
- Split stories must each have complete AC before the refinement closes
- An estimate of TBD is only valid if a corresponding spike story exists
- EARS statements at WP scope must be independently testable — no compound
  "shall do X and also Y" statements
- Gherkin scenarios must describe observable outcomes, not implementation steps
- The report must state whether the backlog is sprint-ready or has remaining
  blockers

## Output format

Amend `backlog.md` directly. Do not append any section to the document.

Report the following in your response to the user:

- **Removed** — items removed and why
- **Split** — items split, what they became, and why
- **Reprioritised** — items that moved, old vs new position, reason
- **Estimates updated** — items re-estimated with reason
- **AC added or improved** — stories that received new or rewritten acceptance criteria
- **Verdict** — Sprint-ready or Not ready, with the top sprint-ready stories named
- **Remaining blockers** — any items that could not be groomed to ready
