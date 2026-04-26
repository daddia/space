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
track: utility
role: utility
domain: delivery
stage: stable
produces:
  - skill-routing
tags:
  - router
  - index
  - skills
owner: '@daddia'
version: '0.2'
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
| Skill | Description (excerpt) | Artefact | Track | Role | Consumes | Produces |
| --- | --- | --- | --- | --- | --- | --- |
| create-mr | Creates a merge request or pull request for the current branch after implementation is complete. Use when the user... | MR description | delivery | engineer | — | MR description |
| implement | Implements code for a story or task against an approved design.md and backlog.md. Use when the user mentions... | code | delivery | engineer | design.md, backlog.md | code |
| plan-adr | Identifies the architecture decisions that need ADRs and produces a prioritised adr-plan.md before technical design... | adr-plan.md | architecture | architect | solution.md | adr-plan.md |
| plan-delivery | Produces a delivery-plan.md that sequences the Phase-0 artefacts for a new portfolio, product, or domain before the... | delivery-plan.md | strategy | pm | — | delivery-plan.md |
| refactor-code | Performs targeted code refactoring to address issues raised in a code review or to improve quality without changing... | code | delivery | engineer | review, code | code |
| refine-backlog | Refines backlog.md by applying five grooming activities: prioritise, break down, estimate, define acceptance criteria,... | backlog.md (refined) | refine | delivery | backlog.md, product.md, roadmap.md | backlog.md (refined) |
| refine-docs | Documents the sprint-end refinement session: promotes WP-local ADR candidates into solution.md, archives superseded... | refine-session.md | refine | architect | solution.md, design.md | refine-session.md |
| refine-product | Refines product.md on a regular cadence by recording sprint learnings, updating metric baselines, closing resolved open... | product.md (refined) | refine | pm | product.md | product.md (refined) |
| refine-roadmap | Refines roadmap.md to reflect delivery reality — advancing phase status, recording exit-criteria evidence, updating... | roadmap.md (refined) | refine | pm | roadmap.md, product.md | roadmap.md (refined) |
| refine-solution | Refines solution.md after a sprint or phase to reflect what was built — updating the building-block view, runtime... | solution.md (refined) | refine | architect | solution.md | solution.md (refined) |
| review-adr | Reviews and finalises a draft Architecture Decision Record (ADR). Use when the user mentions "review this ADR",... | ADR review | architecture | architect | ADR-NNNN.md | review |
| review-backlog | Reviews backlog.md at domain or work-package scope as a Senior Delivery Lead, checking strategic alignment, AC... | backlog.md review | discovery | delivery | backlog.md, product.md, roadmap.md | backlog.md (amended), review summary |
| review-code | Performs a comprehensive code review of changes in a branch or PR. Use when the user mentions "review this code",... | code review | delivery | engineer | design.md, backlog.md | review |
| review-design | Reviews a work-package design.md for implementation readiness — checking that the design is implementable, APIs are... | design.md review | discovery | architect | design.md, solution.md, backlog.md | design.md (amended), review summary |
| review-product | Reviews product.md at portfolio, product, or domain scope as a critical Senior Product Manager — checking strategy... | product.md review | strategy | pm | product.md | product.md (amended), review summary |
| review-roadmap | Reviews roadmap.md at portfolio, product, or domain scope as a Senior Delivery Lead — checking phase coherence,... | roadmap.md review | strategy | pm | roadmap.md, product.md | roadmap.md (amended), review summary |
| review-solution | Reviews solution.md as a Senior Solution Architect, checking structural soundness, section completeness, NFR... | solution.md review | architecture | architect | solution.md, product.md | solution.md (amended), review summary |
| space-index | Identifies the right skill for a vague or open-ended request. Use when the user asks "which skill should I use?", "what... | skill-routing | utility | utility | — | skill-routing |
| validate | Performs a final stakeholder validation that an epic is complete against its backlog.md acceptance criteria. Use when... | validation report | delivery | delivery | backlog.md, solution.md | validation |
| write-adr | Documents a consequential architecture decision as an ADR-NNNN.md file. Use when the user mentions "write an ADR",... | ADR-NNNN.md | architecture | architect | solution.md | ADR-NNNN.md |
| write-backlog | Drafts a domain-level or work-package backlog.md. Use when the user mentions "backlog", "epic list", "stories",... | backlog.md | strategy | pm | product.md, solution.md, roadmap.md | backlog.md |
| write-contracts | Produces contracts.md for a domain as an executable index of types, Zod schemas, API route contracts, and analytics... | contracts.md | architecture | architect | solution.md | contracts.md |
| write-metrics | Drafts metrics.md defining north-star, input, and guardrail metrics for a domain. Use when the user mentions "write the... | metrics.md | discovery | pm | product.md | metrics.md |
| write-metrics-report | Produces a metrics-report.md capturing actuals for delivery metrics (velocity, cycle time, PR merge rate) and quality... | metrics-report.md | refine | delivery | metrics.md | metrics-report.md |
| write-product | Drafts product.md at portfolio, product, or domain scope. Portfolio scope binds multiple products with thesis,... | product.md | strategy | pm | — | product.md |
| write-retrospective | Drafts a retrospective.md capturing what went well, what did not, and what to change, for a sprint or epic. Routes... | retrospective.md | refine | delivery | backlog.md | retrospective.md |
| write-roadmap | Drafts roadmap.md at portfolio, product, or domain scope using outcome-based phases with exit criteria, not epic lists.... | roadmap.md | strategy | pm | product.md | roadmap.md |
| write-solution | Drafts solution.md in stub mode (Phase 0, two sections) or full arc42-lite mode (Phase 2+, ten sections). Use when the... | solution.md | architecture | architect | product.md, contracts.md | solution.md |
| write-tech-stack | Drafts tech-stack.md defining the technology choices for a product or domain, with rationale and trade-offs for each... | tech-stack.md | architecture | architect | product.md | tech-stack.md |
| write-wp-design | Drafts a work-package design.md in walking-skeleton mode (foundation sprint, 2–4 pages) or TDD mode (sprint 2+, 5–10... | design.md | discovery | architect | solution.md, backlog.md | design.md |
<!-- END GENERATED -->

## Negative constraints

The space-index response MUST NOT contain:

- Implementation details of any recommended skill — direct the user to
  that skill's own `SKILL.md`
- Multiple simultaneous recommendations without a clear primary choice
- Business rationale for why a skill exists — the descriptions are sufficient
