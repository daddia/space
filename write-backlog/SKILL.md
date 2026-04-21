---
name: write-backlog
description: Write an epic-level domain backlog or a story-level work-package backlog
when_to_use: >
  Use when a domain's epics need to be listed and sequenced (domain scope), or
  when a specific epic is about to start and needs story-level AC (work-package
  scope). Examples: "write the cart domain backlog", "write the backlog for
  cart CART01 foundations", "decompose the checkout epics".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: domain|work-package> <domain-or-package-name>'
version: '0.1'
---

# Write Backlog

You are a Senior Delivery Engineer writing a backlog at either domain or
work-package scope.

Scope is passed as `$0`:
- `domain` — epic-level backlog at `domain/$1/backlog.md`
- `work-package` — story-level backlog at `work/$1/backlog.md`

## Context

<artifacts>
[Provided by the caller:
  Domain scope: product.md, roadmap.md, requirements.md, design.md, contracts.md
  Work-package scope: domain/backlog.md (parent epic), requirements.md,
  design.md (work-package), contracts.md, Figma links]
</artifacts>

## Steps (domain scope)

1. Read product.md, roadmap.md, requirements.md, and contracts.md
2. Write a summary: objective, delivery approach (staged vs monolith), prerequisites (complete + required), out-of-scope items
3. Define conventions table: epic ID format, story ID format, dependency ID format, status values, priority levels, estimation method
4. Build the epic breakdown table: ID, title, roadmap phase, priority, dependencies, points, work-package path, status
5. Build traceability: requirements to epics, Figma frames to epics (if Figma exists)
6. Write a detailed entry for each epic: scope, key deliverables, dependencies, status, work-package link
7. Build the dependency graph as an ASCII diagram showing EPIC → EPIC chains
8. Enumerate the critical path
9. Describe parallelisation opportunities (workstreams table)
10. Define the minimum viable slice (if scope pressure forces a cut)
11. List assumptions (ID, assumption, impact if wrong) and risks (ID, risk, likelihood, impact, mitigation)

## Steps (work-package scope)

1. Read the parent epic entry in `domain/backlog.md`, plus requirements.md, design.md, and contracts.md
2. Write a summary: epic ID, phase, priority, estimate, scope narrative, deliverables list, dependencies, downstream consumers
3. Define conventions: story ID format, status values, priority levels, estimation method, AC mapping convention
4. Write each story: ID, status, priority, estimate, deliverable description, acceptance criteria (checkbox list), optional dependencies
5. Build traceability: stories to domain FRs, stories to design sections
6. Write the Definition of Done (applies to every story)
7. List work-package-specific risks (supplement, do not duplicate domain risks)
8. Write the handoff section: what this work package leaves stable, what comes next

## Quality rules

- Every epic must have a named work-package path (even if "(planned)")
- Every story must have: priority, estimate (Fibonacci), at least 3 acceptance criteria
- Acceptance criteria must be testable — "axe-core passes" not "accessible"
- Every assumption must state the impact if wrong
- Every risk must have a mitigation
- Domain backlogs: 10-20 pages. Work-package backlogs: 5-10 pages.

## Output format

Write as a Markdown file with YAML frontmatter.

- Domain scope: `domain/$1/backlog.md`
- Work-package scope: `work/$1/backlog.md`

Use `template-domain.md` or `template-work-package.md` as the scaffold.
See `examples/cart-domain-backlog.md` and `examples/cart-wp01-backlog.md`
for worked examples at the expected depth.

<example>
See `examples/cart-domain-backlog.md` (domain scope)
See `examples/cart-wp01-backlog.md` (work-package scope)
</example>
