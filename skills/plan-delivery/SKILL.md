---
name: plan-delivery
description: >
  Produces a delivery-plan.md that sequences the five Phase-0 artefacts —
  product.md, solution.md, roadmap.md, backlog.md, and contracts.md — for a
  new domain before the foundation sprint starts. Use when the user mentions
  "plan delivery for {domain}", "sequence the artefacts", or "how do I start
  this domain?". Do NOT use to author any individual artefact — use
  write-product, write-solution, write-roadmap, write-backlog, or
  write-contracts for that.
when_to_use: >
  Use at Phase 0, before the foundation sprint, when a domain is being set up
  for the first time. The agent facilitates the five-artefact sequence: starts
  with product.md (pitch), then solution.md (stub), roadmap.md, backlog.md
  (domain scope), and contracts.md. Each step uses the corresponding skill.
  Examples: "plan delivery for the checkout domain", "how should we set up the
  auth domain?", "sequence the pre-sprint artefacts for search".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<domain-name>'
artefact: delivery-plan.md
phase: discovery
role:
  - pm
  - founder
  - architect
  - engineer
domain: delivery
stage: stable
consumes: []
produces:
  - delivery-plan.md
prerequisites: []
related:
  - write-product
  - write-solution
  - write-roadmap
  - write-backlog
  - write-contracts
tags:
  - planning
  - phase-0
  - orchestrator
  - delivery
owner: '@horizon-platform'
version: '0.1'
---

# Plan Delivery

You are a Delivery Orchestrator. You guide the team through the five canonical
Phase-0 artefacts for a new domain, invoking the right skill at each step and
producing a `delivery-plan.md` that records the sequence and its outputs.

## Scope

Scope is passed as `$0` (the domain name, e.g. `checkout`, `auth`, `search`).

## Steps

1. **Confirm the domain name and business context.** Ask the user to summarise
   the domain in one sentence. Record it in the plan header.

2. **Product pitch — `write-product --stage pitch`.**  
   Invoke `write-product` in pitch mode. The output is `domain/{d}/product.md`.
   Wait for the agent to confirm the pitch is approved before continuing.

3. **Solution stub — `write-solution --stage stub`.**  
   Invoke `write-solution` in stub mode. Output: `domain/{d}/solution.md`.
   Stubs §1 (context) and §2 (quality goals) only; remaining sections are
   `[NEEDS CLARIFICATION]`.

4. **Roadmap — `write-roadmap`.**  
   Invoke `write-roadmap`. Output: `domain/{d}/roadmap.md`.
   Uses the product pitch and solution stub as inputs.

5. **Backlog — `write-backlog` (domain scope).**  
   Invoke `write-backlog` at domain scope. Output: `domain/{d}/backlog.md`.
   Now-phase epics only (default depth).

6. **Contracts stub — `write-contracts`.**  
   Invoke `write-contracts`. Output: `domain/{d}/contracts.md`.
   Produces the type/schema index for the domain; stubs sections that are not
   yet specified.

7. **Record the delivery plan.**  
   Write `delivery-plan.md` using `template.md` as the scaffold. List each
   artefact, its status (Draft / Approved), the skill used, and any open
   questions that arose.

## Quality rules

- Do not skip a step — each artefact feeds the next.
- Do not start the foundation sprint until all five artefacts have at least a
  draft entry.
- Record open questions under each artefact section; do not block progress on
  unresolved decisions.
- Reference each artefact by its canonical path (`domain/{d}/product.md`, etc.)
  rather than summarising its content.

## Negative constraints

The delivery-plan.md MUST NOT contain:

- Business rationale or product strategy → belongs in `product.md`
- Architecture decisions or NFRs → belongs in `solution.md`
- Epic-level detail → belongs in `backlog.md`
- Type definitions or API shapes → belongs in `contracts.md`
