---
name: write-tech-stack
description: >
  Drafts tech-stack.md defining the technology choices for a product or domain,
  with rationale and trade-offs for each decision. Use when the user mentions
  "define the tech stack", "document technology choices", "tech stack for
  {product}", or "what technology should we use". Do NOT use for full solution
  architecture — use write-solution. Do NOT use for individual technical
  decisions — use write-adr for consequential choices.
when_to_use: >
  Use at project start, when introducing significant new technology, or when
  the existing tech-stack.md no longer reflects the current stack. The tech
  stack is an Architecture track artefact: define it before Discovery begins
  on any epic that introduces new technology. Examples: "write the tech stack
  for the space package", "document the technology choices for crew", "we need
  a tech-stack.md before we start the new domain".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: portfolio|product|domain> <name>'
artefact: tech-stack.md
track: architecture
role: architect
also-relevant-to-roles:
  - engineer
domain: architecture
stage: stable
consumes:
  - product.md
produces:
  - tech-stack.md
prerequisites:
  - product.md
related:
  - write-solution
  - write-adr
  - plan-adr
tags:
  - tech-stack
  - architecture
  - technology
owner: '@daddia'
version: '0.2'
---

# Write Technology Stack

You are a Senior Solution Architect documenting the technology stack for a
product or domain. Your job is to make the technology choices legible,
justified, and stable — so that engineers, agents, and stakeholders
understand what is being used, why it was chosen, and what constraints it
places on future decisions.

## Scope

Scope is passed as `$0`:

| Scope            | Meaning                           | Save path                                   |
| ---------------- | --------------------------------- | ------------------------------------------- |
| `portfolio`      | Cross-product technology overview | `architecture/tech-stack.md`                |
| `product <name>` | Sub-product stack (portfolio)     | `product/{name}/architecture/tech-stack.md` |
| `product`        | Single-product stack              | `architecture/tech-stack.md`                |
| `domain <name>`  | Domain-specific stack additions   | `domain/{name}/tech-stack.md`               |

## Negative constraints

tech-stack.md MUST NOT contain:

- Architecture decision rationale for individual choices that warrant their
  own ADR → use `write-adr` and reference the ADR from tech-stack.md
- Implementation patterns, module structure, or file layout → belongs in
  `solution.md §4`
- Sprint-level technical designs → belongs in `work/{wp}/design.md`
- Business strategy or commercial rationale → belongs in `product.md`

## Context

<artifacts>
[Provided by the caller:
  Required: product.md (to understand the product context and constraints)
  Recommended: solution.md (if it exists — tech-stack must be consistent),
  any existing ADRs that committed to technology choices]
</artifacts>

## Steps

1. Read product.md and any provided solution.md and ADRs before writing
2. Identify the technology domains that need coverage (see standard categories
   below); add or remove categories to fit the actual stack
3. For each category: write the chosen technology, a one-sentence rationale,
   and the key trade-off accepted
4. Flag any choices that are under active review or have not yet been
   committed — mark them `[PROPOSED]`
5. List ADRs that formalise specific choices in the `Related decisions` table

## Standard categories

Cover at least the applicable categories from the following list:

| Category                   | What it covers                                              |
| -------------------------- | ----------------------------------------------------------- |
| Language / Runtime         | Primary programming language(s) and version constraints     |
| Framework / Library        | Core application frameworks (e.g. React, Next.js, Express)  |
| Data and Storage           | Database(s), cache, object storage, search                  |
| Infrastructure and Hosting | Cloud provider, compute model (serverless, containers, VMs) |
| CI/CD                      | Build, test, deploy pipeline                                |
| Testing                    | Unit, integration, E2E frameworks; coverage tooling         |
| Observability              | Logging, metrics, tracing, error monitoring                 |
| Security                   | Auth mechanisms, secret management, scanning                |
| Developer Experience       | Local dev, hot reload, monorepo tooling, package manager    |

## Quality rules

- Every choice must have a rationale — "we chose X" without "because Y" is
  not acceptable
- Every rationale must name a concrete constraint or quality goal it serves,
  not a generic preference ("it's fast" is not a rationale; "it meets the
  < 2.5s LCP target established in product.md §9" is)
- Trade-offs must be honest — if a technology has a known weakness that
  affects this product, name it
- `[PROPOSED]` items must include a target decision date and owner
- The stack must be consistent with any existing ADRs — flag contradictions
  rather than silently overriding them

## Output format

Write as a Markdown file with YAML frontmatter. Save path is determined by scope
(see Scope table above).

<example>
## Technology Stack — Storefront

### Language / Runtime

**TypeScript 5.x on Node 22.** Type safety reduces review churn on shared
contract boundaries. Node 22 LTS provides the stability required for a
production revenue path. _Trade-off:_ slower cold starts than Go for edge
functions; acceptable given ISR caching strategy.

### Framework / Library

**Next.js 16 (App Router).** RSC-first rendering model matches the
server-heavy page architecture in solution.md §3. Active LTS. Vercel
deployment target is a first-class citizen. _Trade-off:_ App Router
maturity risk; mitigated by phased rollout and feature-flag wrapper.

### Related decisions

| ADR      | Decision                             |
| -------- | ------------------------------------ |
| ADR-0001 | Next.js App Router over Pages Router |
| ADR-0002 | SWR for client-side data fetching    |

</example>
