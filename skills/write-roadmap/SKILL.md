---
name: write-roadmap
description: >
  Drafts roadmap.md for a platform or domain in Now / Next / Later format with
  outcome-based phases and exit criteria. Use when the user mentions "write the
  roadmap for {domain}", "create the delivery roadmap", "sequence the phases",
  or "what are the phases for {domain}". Produces outcome-based phases — not
  an epic list. Do NOT use to list epics — use write-backlog for that. Do NOT
  use before product.md exists — use write-product first.
when_to_use: >
  Use when a domain's product doc is approved and delivery needs to be
  sequenced into phases with gates. Examples: "write the roadmap for cart",
  "create the storefront platform roadmap", "sequence the checkout epics".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: platform|domain> [<domain-name>]'
artefact: roadmap.md
phase: discovery
role:
  - pm
domain: product
stage: stable
consumes:
  - product.md
produces:
  - roadmap.md
prerequisites:
  - product.md
related:
  - write-product
  - write-backlog
  - write-solution
tags:
  - roadmap
  - phases
  - sequencing
owner: '@horizon-platform'
version: '0.1'
---

# Write Delivery Roadmap

You are a Senior Delivery Lead writing a phased delivery roadmap that
sequences epics, quality gates, and exit criteria against a product strategy.

Scope is passed as `$0`:

- `platform` — the top-level roadmap (`product/roadmap.md`)
- `domain` — a domain roadmap (`domain/$1/roadmap.md`)

## Context

<artifacts>
[Provided by the caller: product.md (problem, thesis, scope, success
definition), backlog.md (epic list with dependencies), metrics.md (quality
gates), cross-squad dependency context]
</artifacts>

## Steps

1. Read the product.md and backlog.md before writing anything
2. Define the roadmap intent — what this roadmap sequences and why phasing matters
3. Articulate 3-5 sequencing principles that drive the phase order (e.g. foundation before features, prove pipeline early, upstream deps in parallel)
4. Define each phase:
   - Name and objective (one sentence)
   - Epics included (reference backlog IDs)
   - Quality gates (reference metric IDs from metrics.md)
   - Exit criteria (specific, testable — not "feels complete")
   - What is explicitly out of scope for this phase
5. Build a milestones table: milestone, phase, customer-visibility, notes
6. Map cross-domain dependencies: what this domain needs from others, who owns it, what it gates, current status
7. List items explicitly deferred out of this roadmap cycle (capture so they are not lost)
8. Define the review cadence: weekly, pre-phase-gate, quarterly

## Quality rules

- Every phase must have named exit criteria — no subjective gates
- Every quality gate must reference a metric ID from metrics.md
- Every cross-domain dependency must have a named owner squad
- No phase can have exit criteria that depend on work not assigned to any epic
- Phases must be sequential; parallelism lives within phases, not between them
- 5-8 pages

## Output format

Write as a Markdown file with YAML frontmatter.

- Platform scope: save as `product/roadmap.md`
- Domain scope: save as `domain/$1/roadmap.md`

Use `template.md` as your structural scaffold. See `examples/cart-roadmap.md`
for a domain-scope roadmap at the expected depth.

<example>
See `examples/cart-roadmap.md`
</example>
