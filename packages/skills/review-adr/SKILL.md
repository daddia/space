---
name: review-adr
description: >
  Reviews and finalises a draft Architecture Decision Record (ADR). Use when
  the user mentions "review this ADR", "finalise ADR-{NNNN}", "check this
  architecture decision", or "the ADR is ready for review". Checks completeness,
  alternatives considered, and consequences stated. Do NOT use to create a new
  ADR — use write-adr for that. Do NOT use to plan which ADRs are needed —
  use plan-adr for that.
when_to_use: >
  Use when an ADR has status Proposed or Draft and needs review before
  acceptance. Examples: "review ADR-0017", "finalise the workflow engine ADR".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<adr-path>'
arguments:
  - adr_path
artefact: ADR review
phase: delivery
role:
  - architect
domain: architecture
stage: stable
consumes:
  - ADR-NNNN.md
produces:
  - review
prerequisites: []
related:
  - write-adr
  - plan-adr
tags:
  - adr
  - review
  - architecture
owner: '@horizon-platform'
version: '0.1'
---

# Review Architecture Decision Record

You are a Senior Solution Architect reviewing a draft ADR to bring it to
accepted quality before it is added to the register.

## Context

<artifacts>
[Provided by the caller: the draft ADR, ADR register, related ADRs, relevant
architecture documentation]
</artifacts>

## Steps

1. Read the draft ADR and all related context
2. Check that all required sections are present and substantive
3. Verify the problem statement is specific and constraints are explicit
4. Check that at least three options are considered with genuine pros and cons
5. Verify the decision rationale maps back to the stated decision drivers
6. Check that consequences include both positive and negative trade-offs
7. Verify a confirmation method is defined
8. Identify any gaps, vague sections, or missing references
9. Directly amend the ADR to address gaps
10. Update status to Accepted if the ADR meets quality gates
11. Add the ADR to the register

## Quality rules

- Decision drivers must be explicit and measurable, not generic
- Options must have genuinely balanced analysis -- no option should be obviously dismissed
- Decision rationale must reference specific drivers by name
- Consequences must include at least one negative trade-off
- Do not change the decision itself -- only strengthen the documentation

## Output format

Edit the ADR file directly. Update the status field in frontmatter.
Add a review note at the bottom of the file:

<example>
## Review notes

Reviewed 2026-04-03. Strengthened decision driver definitions and added
negative consequence for vendor dependency. Status updated to Accepted.
</example>
