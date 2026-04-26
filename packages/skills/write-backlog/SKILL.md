---
name: write-backlog
description: >
  Drafts a domain-level or work-package backlog.md. Use when the user mentions
  "backlog", "epic list", "stories", "decompose", or "write the backlog for
  {domain}". Domain scope defaults to the Now phase only — use --depth full for
  all phases. Work-package scope produces EARS + Gherkin acceptance criteria
  per the canonical story schema. Do NOT use for solution architecture — use
  write-solution. Do NOT use for roadmaps — use write-roadmap.
when_to_use: >
  Domain scope: use when a domain's epics need to be listed and sequenced.
  Work-package scope: use when a specific epic is about to start and needs
  story-level AC. Examples: "write the cart domain backlog", "write the Now-phase
  epics for checkout", "write the backlog for cart CART01 foundations".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: domain|work-package> <domain-or-package-name> [--depth full]'
artefact: backlog.md
phase: definition
role:
  - pm
  - delivery
  - engineer
domain: engineering
stage: stable
consumes:
  - product.md
  - solution.md
  - roadmap.md
produces:
  - backlog.md
prerequisites:
  - product.md
related:
  - write-solution
  - write-roadmap
  - write-wp-design
tags:
  - backlog
  - epics
  - stories
  - ac
owner: '@daddia'
version: '0.3'
---

# Write Backlog

You are a Senior Delivery Engineer writing a backlog at either domain or
work-package scope.

Scope is passed as `$0`, depth as `--depth`:

- `domain` — epic-level backlog at `domain/$1/backlog.md`. In a portfolio
  workspace, a product-level backlog uses this same scope and saves to
  `product/{name}/backlog.md` instead.
- `work-package` — story-level backlog at `work/$1/backlog.md`

Depth (domain scope only):

- Default (no flag) — Now-phase epics have full detail; later-phase epics
  are single-line placeholders in the epic table. Apply the calibration rule:
  if removing a phase wouldn't block Story 1 on Monday, that phase detail
  belongs in a later backlog revision.
- `--depth full` — full epic detail for all phases.

## Context

<artifacts>
[Provided by the caller:
  Domain scope: product.md, roadmap.md, solution.md, contracts.md
  Work-package scope: domain/backlog.md (parent epic),
  work/{wp}/design.md (work-package), solution.md, contracts.md]
</artifacts>

## Steps (domain scope)

1. Read product.md, roadmap.md, and solution.md before writing anything
2. Write a summary: objective, delivery approach, prerequisites (complete + required), out-of-scope pointer (reference `product.md §5` and `roadmap.md §Later` — do not restate them)
3. Define conventions table: epic ID format, story ID format, status values, priority levels, estimation method
4. Build the epic breakdown table:
   - Now-phase rows: full columns (ID, title, phase, priority, deps, points, WP path, status)
   - Next/Later-phase rows: same columns but scope/deliverables left as placeholders
5. Write full epic detail entries **for Now-phase epics only** (default) — scope, key deliverables, dependencies, status, WP link
6. Build the dependency graph (ASCII) and enumerate the critical path
7. Describe parallelisation opportunities
8. Define the minimum viable slice
9. List assumptions (impact if wrong) and delivery risks; reference `solution.md §10.1` for technical risks — do not duplicate them

## Steps (work-package scope)

1. Read the parent epic entry in `domain/backlog.md`, plus `work/{wp}/design.md` and `solution.md`
2. Write a summary: epic ID, phase, priority, estimate, scope, deliverables, dependencies, downstream consumers
3. Define conventions table
4. Write each story using the canonical schema (see template-work-package.md §3):
   - Status, Priority, Estimate, Epic, Labels, Depends on, Deliverable, Design (section link), Acceptance (EARS), Acceptance (Gherkin)
5. Build traceability: stories to solution sections + stories to product outcomes
6. Write the Definition of Done
7. List WP-specific delivery risks; reference `solution.md §10.1` for technical risks
8. Write the handoff section: what this WP leaves stable, what comes next

## Quality rules

- Domain backlog: Now-phase epics have full detail by default; later phases are placeholders unless `--depth full` is passed
- Every epic must have a named work-package path (even if "(planned)")
- Work-package stories MUST use the canonical EARS + Gherkin schema — no plain AC checklist
- Every EARS statement must follow the pattern: `WHEN/THE SYSTEM SHALL` or `WHEN … THE SYSTEM SHALL`
- Every Gherkin scenario must have `Given / When / Then` structure
- Every story must have at least two EARS statements and one Gherkin scenario
- Domain delivery risks must not duplicate technical risks already in `solution.md §10.1`
- Out-of-scope: reference `product.md §5` and `roadmap.md §Later` rather than restating items

## Output format

Write as a Markdown file with YAML frontmatter.

- Domain scope: save as `domain/$1/backlog.md`
- Work-package scope: save as `work/$1/backlog.md`

Use `template-domain.md` or `template-work-package.md` as the scaffold.

See `examples/cart-domain-backlog.md` (domain scope) and
`examples/cart-wp01-backlog.md` (work-package scope) for worked examples.

<example>
See `examples/cart-domain-backlog.md` (domain scope)
See `examples/cart-wp01-backlog.md` (work-package scope)
</example>
