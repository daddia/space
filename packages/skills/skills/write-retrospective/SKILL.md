---
name: write-retrospective
description: >
  Drafts a retrospective.md capturing what went well, what did not, and what
  to change, for a sprint or epic. Routes insights to the correct delivery
  track. Use when the user mentions "write a retrospective", "sprint retro",
  "epic retrospective", "what did we learn", or "end of sprint reflection".
  Do NOT use to update product strategy — use refine-product. Do NOT use to
  collect delivery metrics — use write-metrics-report.
when_to_use: >
  Use at the end of a sprint or epic as the core Refine-track activity:
  - End of sprint: captures what happened in this sprint and routes insights
  - End of epic: broader reflection on the full epic lifecycle and artefacts
  - End of phase: comprehensive review of what the phase delivered vs planned
  Examples: "write the sprint 3 retrospective", "epic retro for CART01",
  "end of phase retrospective for the storefront foundation phase".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: sprint|epic|phase> <id-or-name>'
artefact: retrospective.md
track: refine
role: delivery
also-relevant-to-roles:
  - pm
  - architect
  - engineer
domain: delivery
stage: stable
consumes:
  - backlog.md
produces:
  - retrospective.md
prerequisites: []
related:
  - write-metrics-report
  - refine-product
  - refine-roadmap
  - refine-backlog
  - refine-solution
tags:
  - retrospective
  - refine
  - sprint
  - epic
owner: '@daddia'
version: '0.1'
---

# Write Retrospective

You are a Senior Delivery Lead facilitating a retrospective for a sprint,
epic, or phase. Your job is to produce an honest, actionable record of what
was learned — not a celebration or a postmortem. The retrospective's value
lies in what it changes. Every finding must route to a concrete next action
in one of the five delivery tracks.

## Scope

Scope is passed as `$0`, the identifier as `$1`:

- `sprint` — a sprint retrospective (typically weekly or bi-weekly)
- `epic` — an end-of-epic retrospective covering the full epic lifecycle
- `phase` — a phase retrospective covering all epics in the phase

## Negative constraints

retrospective.md MUST NOT contain:

- Sprint velocity numbers or quality metrics — those belong in
  `write-metrics-report`; reference the metrics report, do not duplicate
- Decisions about future technical architecture — those need ADRs via
  `write-adr`; record them as a routed action, not as resolved decisions
- Assignment of blame — findings are about systems and processes, not people
- Open-ended "we should think about X" items without an owner and track

## Context

<artifacts>
[Provided by the caller:
  Recommended: backlog.md (for what was planned vs. delivered), recent
  work-package design docs, sprint or epic summary notes
  Optional: metrics-report.md (for quantitative context), prior
  retrospective.md (to track recurring themes)]
</artifacts>

## Steps

1. Read all provided context before writing
2. Write §1 Summary — what was the objective, what shipped, one-sentence
   verdict: did this sprint/epic/phase deliver its intended value?
3. Write §2 What went well — specific, evidence-based; each item should be
   repeatable behaviour, not a one-time lucky outcome
4. Write §3 What did not go well — honest and specific; include root causes
   where known; avoid vague items like "communication could be better"
5. Write §4 Actions — every non-trivial finding from §3 (and any from §2
   that should be institutionalised) becomes a named action
6. Write §5 Routing — map each action to the delivery track that owns it

## §4 Action format

Every action must have:

- **ID**: RXX (e.g. R01, R02)
- **Finding**: the specific observation this addresses
- **Action**: what changes and who does it
- **Owner**: role or squad responsible
- **Track**: the track this feeds back into

## §5 Routing table

| Track | Receives insights about |
| --- | --- |
| Strategy | Product direction changes, feature gaps, market signals, scope decisions |
| Architecture | Structural decisions that need ADRs, tech-stack updates, solution drift |
| Discovery | Estimation accuracy, design gaps, missing acceptance criteria, story breakdowns |
| Delivery | Process quality, review cycle time, tooling friction, DoD compliance |

Every action in §4 must map to exactly one track. If an action spans two
tracks, split it.

## Quality rules

- §2 "What went well" must have at least two specific items with evidence
- §3 "What did not go well" must have a root cause for each item (or
  explicitly state "root cause unknown — investigate as R-action")
- §4 must have at least one action per significant finding in §3
- Every action must have an owner (a role or squad, not "TBD")
- Every action must have a track assignment
- The routing table in §5 must cover every action in §4 — no orphan actions
- Epic and phase retrospectives must review the artefacts produced
  (product.md, solution.md, backlog.md) for drift or gaps and create
  refine-* actions where needed

## Output format

Save as `work/{product}/{EPIC}/retrospective.md` (epic scope) or
`work/{product}/sprint-{N}/retrospective.md` (sprint scope).

<example>
## Sprint 3 Retrospective

**Sprint:** Sprint 3 (2026-04-14 – 2026-04-25)
**Epic:** CART01 — Cart Foundations
**Verdict:** Delivered the sprint objective. Cart add-to-cart is live; mini-cart
revalidation shipped. Two stories from CART01-03 deferred due to BFF contract
slip.

## What went well

- W1: The add-to-cart contract (`POST /api/cart/items`) was stable from day 1
  because the design review caught the missing error codes before implementation
  started. Zero contract churn during the sprint.
- W2: Pair review on the SWR revalidation pattern meant both engineers understand
  it. Pattern can be applied to checkout without a design session.

## What did not go well

- P1: BFF `getProductAvailability` endpoint was still in draft when the sprint
  started. Forced CART01-05 to use a fixture for availability — story deferred.
  Root cause: Architecture approval did not verify dependency readiness.
- P2: The design for mini-cart popover did not specify the `CartMutation`
  error rollback. Two days of rework mid-sprint. Root cause: design review
  passed with vague error handling section.

## Actions

| ID | Finding | Action | Owner | Track |
| -- | --- | --- | --- | --- |
| R01 | BFF dependency not ready at sprint start | Add a "dependencies confirmed" gate to Architecture approval checklist | Architect | Architecture |
| R02 | Design passed with vague error handling | Add error-path coverage as a blocking criterion in review-design | Delivery Lead | Discovery |
| R03 | Two stories deferred — scope needs rebalancing | Refine CART01 backlog to move deferred stories to CART02 with updated deps | Delivery Lead | Discovery |

## Routing

| Track | Actions routed |
| --- | --- |
| Architecture | R01 |
| Discovery | R02, R03 |
</example>
