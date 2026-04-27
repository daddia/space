---
title: The four canonical artefacts
description: How we plan and deliver work in a small, canonical set of artefacts where each one owns a distinct question.
---

We use four canonical artefacts to plan and deliver our work. Each one owns a single, distinct question; together they carry a piece of work from business context through to shipped code. This page is the shared reference for how the four fit together, what goes in each, and how they compose into a full delivery workflow.

## The principle

Two rules keep this set small and sharp:

- **One source of truth per question.** Each artefact owns a distinct question (see the tables below) and nothing else. Every other artefact references its answer rather than restating it. When a piece of content belongs in `product.md`, the solution, roadmap, and backlog link to it and move on.
- **Write what we know, when we know it.** The four durable artefacts capture what the team has decided. Detail that emerges during delivery — ADRs, metrics baselines, cross-squad dependencies — is written when the work generates it, not upfront.

Together, these rules mean the artefact set stays small, the content stays current, and a reader always knows where to look for any given question.

## The four artefacts

| Artefact      | Question it answers                                                           |
| ------------- | ----------------------------------------------------------------------------- |
| `product.md`  | **Why** are we building this? **Who** is it for? **What** outcome do we want? |
| `solution.md` | **How** will it work, at a system level?                                      |
| `roadmap.md`  | **When**, in what order, do the customer-visible capabilities land?           |
| `backlog.md`  | **What next**, sized and sequenced into epics and stories?                    |

This set of artefacts are well-tested industry pattern applied end-to-end:

> **Working Backwards** (product) → **Solution Intent** (solution) → **Now / Next / Later** (roadmap) → **Story Map** (backlog).\*\*

Working Backwards (Amazon) frames product around the customer outcome. Solution Intent (SAFe / arc42) captures the system-level design. Now/Next/Later (Jeff Bastow, Teresa Torres) sequences outcomes by what each unlocks, not by calendar. Story Map (Jeff Patton) lays out the backlog as slices of real customer value.

Each artefact is short, single-purpose, and references the others instead of restating them.

## Two tiers

We use the four artefacts at two levels:

- **Tier 1 — Product / Domain.** The durable artefacts that describe a product (or a sub-domain of one) over its lifetime. Written once per product or domain, updated when the strategy or architecture shifts.
- **Tier 2 — Work package.** The sprint-scale pair that describes how one slice of the work gets built and what stories the sprint will deliver. Written once per sprint-sized unit of work.

### Tier 1 — Product / Domain

| Artefact      | Owns the question      | Owner                      | Primary audience           | Must not contain                                                     |
| ------------- | ---------------------- | -------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `product.md`  | Why, who, what outcome | Product                    | Exec, PMs, adjacent squads | File paths, APIs, schemas, component names, tech choices, ADRs       |
| `solution.md` | How, at a system level | Architect / staff engineer | Engineers, adjacent squads | Commercial rationale, target segments, story-level AC, UI copy       |
| `roadmap.md`  | When, in what order    | Product + engineering lead | Cross-squad, stakeholders  | Epic IDs, implementation design, story AC, dates beyond "Now"        |
| `backlog.md`  | What next, sized       | Delivery lead              | Squad                      | Business-case narrative, architecture rationale, pattern definitions |

### Tier 2 — Work package

| Artefact     | Owns the question                          | Owner            | Primary audience | Must not contain                                                                         |
| ------------ | ------------------------------------------ | ---------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `design.md`  | How will **this sprint** build it?         | Engineering lead | Sprint squad     | Domain-wide patterns (reference `solution.md`), business rationale, phase sequencing     |
| `backlog.md` | What stories does **this sprint** deliver? | Delivery lead    | Sprint squad     | Business-case narrative; pattern definitions; cross-sprint dependencies without a reason |

A work-package `design.md` comes in two modes, depending on sprint position:

- **Walking-skeleton mode** for the foundation sprint (2–4 pages): names the one end-to-end slice the sprint will land, the files shipped, and the acceptance gates the slice must clear.
- **TDD mode** for sprint 2 onwards (5–10 pages): a detailed technical design that references `solution.md` sections rather than re-narrating them.

## Folder layout

### A simple product — no sub-domains

```text
docs/
  product.md
  solution.md
  roadmap.md
  backlog.md

work/01-foundations/
  design.md
  backlog.md
```

### A product with domains

```text
product/
  product.md
  roadmap.md

domain/{d}/
  product.md
  solution.md
  roadmap.md
  backlog.md

work/{d}/{wp}/
  design.md
  backlog.md
```

Sub-domains are optional. Use them when a single product has clearly separable sub-products with their own squads, pace, or customers (for example cart, checkout, and PDP inside a storefront).

## A worked example: the cart on the new storefront

The cart domain on the new storefront is our reference implementation of the model.

- **Confluence:** [Cart on Confluence](https://your-org.atlassian.net/wiki/spaces/storefront/folder/4456808650)
- **GitLab:** [Cart on GitLab](https://github.com/daddia/space)

The layout:

```text
product/
  product.md        business context for the storefront as a whole
  solution.md       high-level solution architecture
  roadmap.md        phases to deliver the storefront

domain/cart/
  product.md        business context for the cart
  solution.md       solution architecture for the cart
  roadmap.md        now / next / later for the cart
  backlog.md        epics that implement the roadmap

work/cart/01-foundations/           [DONE]
  design.md         walking-skeleton design (what the foundation sprint proved)
  backlog.md        the nine stories CART01 delivered

work/cart/02-add-to-cart/
  design.md         sprint TDD (references domain/solution + 01-foundations where relevant)
  backlog.md        the stories CART02 will deliver
```

Open any of these and you'll see the same seven files, the same content split, and the same pattern of references between them.

## Reading order

The four artefacts are designed to be read in dependency order:

1. `product.md` — decide **what** we're building and **why**.
2. `solution.md` — decide **how** it will work.
3. `roadmap.md` — decide **when** capabilities land, in what order.
4. `backlog.md` — decide **what next**, in concrete epics.

For any active sprint, add the work-package pair:

1. `work/{wp}/design.md` — decide **how this sprint** will build it.
2. `work/{wp}/backlog.md` — decide **what stories** this sprint will deliver.

When one changes, the ones below usually change too. When one below changes, the ones above usually don't. If a change touches both, either the outcome has genuinely shifted (rare) or the change has been expressed in the wrong artefact.

## The single rule that keeps them honest

Each artefact owns a distinct question; crossing into another's territory is how artefacts rot. The rule we enforce at review:

> **Every piece of content has one canonical home.** If it's already in `product.md`, don't restate it in `solution.md` — reference it. If the backlog's scope needs changing, change the roadmap. If a technical pattern is domain-wide, promote it to `solution.md` instead of restating it in every `work/{wp}/design.md`.

This is what keeps the set small, the artefacts short, and the reader confident they're looking at the source of truth for any question they have.

## Where to learn more

- **Full artefact-model design** — the normative spec, with the content-ownership matrix and every quality rule: [`docs/design/space-artefact-model.md`](../../design/space-artefact-model.md).
- **Cart as a worked example** — every artefact at every level, in a real domain mid-flight: [Cart on GitLab](https://github.com/daddia/space).
- **Scaffolding a new workspace** — creating a workspace that has this layout baked in: [Setting up a workspace](../setting%20up%20a%20workspace/01-scaffold-a-workspace.md).
