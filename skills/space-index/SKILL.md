---
name: space-index
description: >
  Identifies the right skill for a vague or open-ended request. Use when the
  user asks "which skill should I use?", "what can I do?", or "how do I start
  this?". Presents a CI-generated index of all stable skills with names,
  artefacts, phases, roles, and trigger conditions so the agent can route to
  the correct skill. Do NOT use to produce a delivery artefact -- use
  write-product, write-solution, write-backlog, or write-wp-design for that.
  Do NOT use to implement a story -- use implement.
when_to_use: >
  Use when the user asks "which skill should I use?", "what can I do in this
  space?", "how do I start?", "what skills are available?", or any vague
  routing question. Also use when multiple skills look relevant and the agent
  needs to pick one.
allowed-tools:
  - Read
argument-hint: '<query>'
artefact: skill-routing
phase: discovery
role:
  - pm
  - founder
  - architect
  - engineer
domain: delivery
stage: stable
produces:
  - skill-routing
tags:
  - router
  - index
  - skills
owner: '@horizon-platform'
version: '0.1'
---

# Space Index

You are a Skill Router. When the user asks a vague question — "which skill
should I use?", "what can I do here?", "how do I start?" — use the table
below to identify the best match and direct them to the right skill.

## How to route

1. Read the user's request carefully.
2. Scan the **Description** column for skills that match the intent.
3. Pick the single best skill. When multiple match, prefer the one whose
   **Phase** matches the current delivery context.
4. Tell the user: "The best skill for this is **{skill-name}**." followed by
   one sentence explaining why.

## Skill index

<!-- BEGIN GENERATED — do not edit; run `pnpm generate:index` to refresh -->

| Skill           | Description (excerpt)                                                                                                      | Artefact          | Phase      | Role                             | Consumes                            | Produces         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------- | -------------------------------- | ----------------------------------- | ---------------- |
| create-mr       | Creates a merge request or pull request for the current branch after implementation is complete. Use when the user...      | MR description    | delivery   | engineer                         | —                                   | MR description   |
| implement       | Implements code for a story or task against an approved design.md and backlog.md. Use when the user mentions...            | code              | delivery   | engineer                         | design.md, backlog.md               | code             |
| plan-adr        | Identifies the architecture decisions that need ADRs and produces a prioritised adr-plan.md before technical design...     | adr-plan.md       | delivery   | architect                        | solution.md                         | adr-plan.md      |
| plan-delivery   | Produces a delivery-plan.md that sequences the five Phase-0 artefacts — product.md, solution.md, roadmap.md,...            | delivery-plan.md  | discovery  | pm, founder, architect, engineer | —                                   | delivery-plan.md |
| refactor-code   | Performs targeted code refactoring to address issues raised in a code review or to improve quality without changing...     | code              | delivery   | engineer                         | review, code                        | code             |
| review-adr      | Reviews and finalises a draft Architecture Decision Record (ADR). Use when the user mentions "review this ADR",...         | ADR review        | delivery   | architect                        | ADR-NNNN.md                         | review           |
| review-code     | Performs a comprehensive code review of changes in a branch or PR. Use when the user mentions "review this code",...       | code review       | delivery   | engineer                         | design.md, backlog.md               | review           |
| review-docs     | Reviews product.md and solution.md for completeness and alignment before development begins. Use when the user mentions... | doc review        | definition | pm, architect, engineer          | product.md, solution.md             | review           |
| space-index     | Identifies the right skill for a vague or open-ended request. Use when the user asks "which skill should I use?", "what... | skill-routing     | discovery  | pm, founder, architect, engineer | —                                   | skill-routing    |
| validate        | Performs a final stakeholder validation that an epic is complete against its backlog.md acceptance criteria. Use when...   | validation report | delivery   | pm, delivery                     | backlog.md, solution.md             | validation       |
| write-adr       | Documents a consequential architecture decision as an ADR-NNNN.md file. Use when the user mentions "write an ADR",...      | ADR-NNNN.md       | delivery   | architect, engineer              | solution.md                         | ADR-NNNN.md      |
| write-backlog   | Drafts a domain-level or work-package backlog.md. Use when the user mentions "backlog", "epic list", "stories",...         | backlog.md        | definition | pm, delivery, engineer           | product.md, solution.md, roadmap.md | backlog.md       |
| write-contracts | Produces contracts.md for a domain as an executable index of types, Zod schemas, API route contracts, and analytics...     | contracts.md      | discovery  | architect, engineer              | solution.md                         | contracts.md     |
| write-metrics   | Drafts metrics.md defining north-star, input, and guardrail metrics for a domain. Use when the user mentions "write the... | metrics.md        | definition | pm, engineer                     | product.md                          | metrics.md       |
| write-product   | Drafts product.md for a platform or domain sub-product in pitch mode (Phase 0, Shape Up, ≤2 pages) or product mode...      | product.md        | discovery  | pm, founder                      | —                                   | product.md       |
| write-roadmap   | Drafts roadmap.md for a platform or domain in Now / Next / Later format with outcome-based phases and exit criteria....    | roadmap.md        | discovery  | pm                               | product.md                          | roadmap.md       |
| write-solution  | Drafts solution.md in stub mode (Phase 0, two sections) or full arc42-lite mode (Phase 2+, ten sections). Use when the...  | solution.md       | discovery  | architect, engineer              | product.md, contracts.md            | solution.md      |
| write-wp-design | Drafts a work-package design.md in walking-skeleton mode (foundation sprint, 2–4 pages) or TDD mode (sprint 2+, 5–10...    | design.md         | delivery   | architect, engineer              | solution.md, backlog.md             | design.md        |

<!-- END GENERATED -->

## Negative constraints

The space-index response MUST NOT contain:

- Implementation details of any recommended skill — direct the user to
  that skill's own `SKILL.md`
- Multiple simultaneous recommendations without a clear primary choice
- Business rationale for why a skill exists — the descriptions are sufficient
