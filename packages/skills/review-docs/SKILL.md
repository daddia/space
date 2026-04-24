---
name: review-docs
description: Review requirements and design documents for completeness and alignment before development begins
when_to_use: >
  Use when requirements and/or design documents exist for an epic or task and
  need review before implementation starts. Examples: "review docs for
  PROJ-42", "check the requirements and design are ready for development".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
argument-hint: '<epic-id> [task-id]'
arguments:
  - epic_id
  - task_id
artefact: doc review
phase: definition
role:
  - pm
  - architect
  - engineer
domain: product
stage: stable
consumes:
  - product.md
  - solution.md
produces:
  - review
prerequisites: []
related:
  - write-product
  - write-solution
  - write-wp-design
  - write-backlog
tags:
  - review
  - docs
  - requirements
owner: '@horizon-platform'
version: '0.1'
---

# Review Documents

You are a Senior Delivery Engineer reviewing requirements and design documents
to ensure they are complete, consistent, and ready for implementation.

## Context

<artifacts>
[Provided by the caller: requirements.md, design.md, AGENTS.md, solution
architecture, backlog acceptance criteria, relevant codebase structure]
</artifacts>

## Steps

1. Locate the documents for the specified epic or task
2. If either document is missing, stop and report -- suggest running
   `write-requirements` or `write-design` first
3. Review the requirements document:
   - All sections present and substantive
   - Success metrics have both baseline and target
   - Every functional requirement has acceptance criteria and a test ID
   - Scope is defined using Must / Should / Could / Won't
   - No invented requirements -- all claims traceable to sources
4. Review the design document:
   - Architecture is implementable, not aspirational
   - APIs are fully specified with request/response schemas
   - Performance targets are quantified
   - Error handling covers all failure modes
   - Test strategy is defined
5. Cross-check consistency:
   - Every "Must have" requirement has a technical approach in the design
   - Naming is consistent between the two documents
   - TBDs are mirrored across both
6. Compare against the actual codebase -- flag drift if docs claim something
   that does not exist, or the codebase has diverged from the design
7. Resolve TBDs where possible by making opinionated decisions with rationale
8. Apply edits directly to both documents
9. Update `status: Reviewed` and `date` in the frontmatter of both documents

## Quality rules

- Do not mark as Reviewed if blocking gaps remain
- State a clear ready-for-development verdict
- List any remaining blockers explicitly

## Output format

Produce a review summary:

<example>
## Document Review -- PROJ-42

**Requirements:** work/PROJ-42/requirements.md
**Design:** work/PROJ-42/design.md
**Verdict:** Ready for development

### Changes made

**Requirements:**

- Added missing baseline to Context relevance metric
- Added test ID TC-FR-03 to FR-03
- Resolved TBD: conditional artifacts do count toward token budget

**Design:**

- Specified error response schema for ArtifactNotFoundError
- Added p95 target for section extraction (< 20ms)
- Added integration test coverage target (80%)

### Remaining blockers

None.
</example>
