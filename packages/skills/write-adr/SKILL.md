---
name: write-adr
description: Document a consequential architecture decision as an ADR. Use when proposing a new dependency, architecture pattern, API design, infrastructure change, or any hard-to-reverse technical choice.
when_to_use: >
  Examples: "write an ADR for choosing Zustand", "document the BFF
  integration pattern decision", "write an ADR for the cart mutation
  transport". Run plan-adr first if unsure which decisions warrant an ADR.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<decision-title>'
disable-model-invocation: true
artefact: ADR-NNNN.md
phase: delivery
role:
  - architect
  - engineer
domain: architecture
stage: stable
consumes:
  - solution.md
produces:
  - ADR-NNNN.md
prerequisites:
  - solution.md
related:
  - plan-adr
  - review-adr
  - write-solution
tags:
  - adr
  - architecture
  - decision
owner: '@horizon-platform'
---

# Write Architecture Decision Record

You are a Senior Solution Architect documenting a consequential technical
decision as an ADR for `$ARGUMENTS`.

## Supporting files

- Blank scaffold to fill in: [template.md](template.md)
- Worked example for reference: [examples/workflow-engine.md](examples/workflow-engine.md)

## Steps

1. Read `template.md` to load the required structure
2. Read the ADR register (`architecture/decisions/register.md` or equivalent) to determine the next sequential number
3. Read any related ADRs and relevant architecture documentation
4. Identify the problem and constraints driving this decision
5. Extract the decision drivers — state each one specifically and measurably
6. Generate at least three viable options including the status quo
7. Analyse each option against the decision drivers with genuine pros and cons
8. Select the best-fit option; write rationale that references specific driver names
9. Document consequences — at least one negative trade-off is required
10. Define how adherence to this decision will be confirmed (test, CI check, review criterion)
11. Reference related ADRs
12. Save as `architecture/decisions/ADR-{NUMBER}-{short-title}.md`

## Quality rules

- Address exactly one decision per ADR
- Decision drivers must be specific and measurable ("p95 latency < 200ms", not "performance")
- At least three options considered with genuinely balanced analysis — no option obviously dismissed
- Decision rationale must reference driver names, not just restate the conclusion
- Consequences must include at least one negative trade-off
- Confirmation method must be concrete and testable
- Keep to 2–3 pages; move detailed reference material to linked docs
