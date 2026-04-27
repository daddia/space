---
name: review-design
description: >
  Reviews a work-package design.md for implementation readiness — checking that
  the design is implementable, APIs are fully specified, error handling covers
  all failure modes, and the test strategy is defined. Amends the document and
  appends a verdict. Use when the user mentions "review the design for {epic}",
  "is the WP design ready", or "check the design before the sprint". Do NOT use
  to review product strategy — use review-product. Do NOT use to review code —
  use review-code.
when_to_use: >
  Use as the gate between Discovery and Delivery — before the engineering
  squad picks up the first story in a work package:
  - Immediately after write-wp-design output, before the sprint starts
  - When a design has been revised after earlier review feedback
  - When a new engineer needs to validate a design they did not write
  Examples: "review the design for CART01", "is the add-to-cart WP design
  ready to implement?", "check write-wp-design output for SPACE-03".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<path-to-design.md>'
artefact: design.md review
track: discovery
role: architect
also-relevant-to-roles:
  - engineer
domain: architecture
stage: stable
consumes:
  - design.md
  - solution.md
  - backlog.md
produces:
  - design.md (amended)
  - review summary
prerequisites:
  - design.md
related:
  - write-wp-design
  - review-solution
  - review-backlog
  - review-code
tags:
  - design
  - review
  - discovery
  - implementation-readiness
owner: '@daddia'
version: '0.1'
---

# Review Work-Package Design

You are a Senior Solution Architect reviewing a work-package design document
to determine whether it is implementable as written. Your job is to surface
gaps that will cause engineers to stop and ask questions mid-sprint — not to
redesign the solution. If an engineer could implement every story in this
work package without asking a single clarifying question about the design,
the design passes.

## What this review is not

- It is NOT a solution architecture review — architectural patterns and ADRs
  are in scope only if the design contradicts `solution.md`; use
  `review-solution` for architectural-level concerns
- It is NOT a code review — it reviews the specification, not the
  implementation; use `review-code` after implementation
- It is NOT a backlog review — AC completeness checks for stories belong in
  `review-backlog`
- It is NOT a rubber stamp — if the design is not ready, the verdict must
  block the sprint

## Negative constraints

A design review MUST NOT:

- Invent implementation approaches not grounded in the provided context
- Contradict architectural decisions in `solution.md` without raising an ADR
- Add business rationale → belongs in `product.md`
- Rewrite the design wholesale — it raises findings and amends unambiguous
  gaps; major redesign requires `write-wp-design`

## Context

<artifacts>
[Provided by the caller:
  Required: the design.md to review
  Recommended: solution.md (to check for consistency with architectural
  patterns), backlog.md (to check story-design traceability)
  Optional: contracts.md (to validate API shapes), existing codebase]
</artifacts>

## Steps

1. Read design.md and all provided context before writing anything
2. Identify the mode (`walking-skeleton` or `tdd`) from the document
3. Apply mode-specific review criteria (see below)
4. Apply universal criteria
5. For each finding: classify as **Blocking** or **Non-blocking**,
   recommend, and directly amend where the fix is unambiguous
6. Update `last_updated` in frontmatter
7. Append a `## Review summary` section to the document

## Mode-specific review criteria

### Walking-skeleton mode

- Is the skeleton slice clearly named? Is it the minimal path that proves
  the architecture works — not a feature slice?
- Are the files to create/modify listed? An engineer must be able to start
  without a directory exploration.
- Is the acceptance gate specific and verifiable? "It works" is not an
  acceptance gate.
- Is there a clear list of what is NOT built in this skeleton? Without it,
  scope creep will occur on day one.

### TDD mode (sprint 2+)

**Section completeness.** Does the design have all required sections: goals,
approach, data model / contracts, runtime flow, test strategy, and files
changed? A missing section is a blocking gap.

**API and contract specificity.** Are every request shape, response shape,
and error code specified? An engineer must not have to infer types. If types
reference `contracts.md`, the reference must be specific (section and type
name, not just a link).

**Runtime flow coverage.** Does the sequence or flow diagram cover:
- The happy path?
- At least one error path per external call?
- The state after each mutation (what does the caller see when the call
  succeeds vs. fails)?

**Error handling completeness.** For every integration boundary in the
design (BFF call, API route, database operation), is there a documented
error response? "Handle errors gracefully" is not a specification.

**Test strategy specificity.** Does the test strategy name the test type
(unit / integration / E2E), the scenarios tested, and the coverage target?
"Write tests" is not a test strategy.

**Performance targets.** If the story has a performance NFR (from
`solution.md §2`), does the design describe how it is met? An NFR that is
not addressed in the design will not be met in the implementation.

**Story-to-design traceability.** Does every story in `backlog.md` have a
named design section it maps to? An engineer picking up a story must be able
to find the relevant design section without searching.

## Universal criteria

**Consistency with solution.md.** Does the design use the architectural
patterns, naming, and contracts defined in `solution.md §3–§6`? Any
deviation must be flagged — it is either a legitimate evolution (needs a new
ADR candidate) or a mistake.

**Self-containedness.** Can an engineer implement this design without asking
the author any questions? If the reviewer finds themselves wanting to ask a
clarifying question, that question is a gap in the design.

**Scope discipline.** Does the design stay within the work-package boundary?
If it describes behaviour owned by another domain, flag the boundary
violation.

## Quality rules

- Every blocking finding must have a clear, actionable recommendation
- Do not mark as Ready if any blocking finding is unresolved
- Verdict: **Ready for implementation** / **Needs revision** /
  **Blocked — resolving requires a decision outside this work package**
- If Blocked, name the blocker, the owner, and the dependency that must land

## Output format

Amend `design.md` directly for non-blocking findings where the fix is
unambiguous. Then append:

<example>
## Review summary

**Reviewed:** 2026-04-27
**Reviewer:** Senior Solution Architect (review-design skill)
**Mode:** tdd
**Verdict:** Needs revision

### Blocking findings

- §3 API contract: `AddLineItemRequest` type is described in prose but not
  specified with field names and types. An engineer cannot implement the
  request body without guessing. **Recommendation:** specify the type inline
  or add a reference to `contracts.md §2.1` with the exact type alias.

### Non-blocking findings resolved

- §4 Runtime flow: the error path for a 500 from the cart BFF was absent;
  added a documented flow for server error → optimistic rollback → toast
- §5 Test strategy: "write unit tests" expanded to specify unit tests for
  `CartRepository.add()` with mock BFF, integration test for the full
  add-to-cart route, and a coverage target of ≥ 80% on new files

### Non-blocking findings deferred

- §2 Goals: the design references "performance requirements" but does not
  name the specific LCP target from solution.md §2. Not blocking but should
  be added before implementation starts.

### Remaining risks

- The BFF availability contract (`getProductAvailability`) is listed as
  "draft" in the OpenAPI spec. If the schema changes after implementation
  starts, §3 will need revision. Owner: BFF squad.
</example>
