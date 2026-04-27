---
name: refine-roadmap
description: >
  Refines roadmap.md to reflect delivery reality — advancing phase status,
  recording exit-criteria evidence, updating cross-dependency statuses, and
  adjusting phase contents when sprint outcomes diverge from plan. Use when the
  user mentions "update the roadmap after this sprint", "advance the phase", or
  "the roadmap is out of date". Do NOT use for a critical credibility review —
  use review-roadmap. Do NOT use to write from scratch — use write-roadmap.
when_to_use: >
  Use on a regular cadence to keep roadmap.md honest:
  - After a sprint: advance phase status, mark exit criteria met/unmet,
    update what shipped vs what did not
  - After a phase gate: formally close the phase, capture evidence, open the
    next phase
  - When a cross-domain dependency lands or slips: update dependency status
    and assess the effect on phase sequencing
  - When velocity data is available: update timeline guidance
  Examples: "advance the roadmap to reflect what shipped in sprint 3", "mark
  PDP phase 2 exit criteria as met", "update the cart roadmap — the BFF
  availability endpoint slipped by two weeks".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<path-to-roadmap.md> [--context <sprint-notes-or-gate-evidence>]'
artefact: roadmap.md (refined)
track: refine
also-relevant-to-tracks:
  - strategy
role: pm
also-relevant-to-roles:
  - delivery
domain: product
stage: stable
consumes:
  - roadmap.md
  - product.md
produces:
  - roadmap.md (refined)
prerequisites:
  - roadmap.md
related:
  - write-roadmap
  - review-roadmap
  - refine-product
  - refine-backlog
tags:
  - roadmap
  - refinement
  - phases
  - post-sprint
owner: '@daddia'
version: '0.2'
---

# Refine Delivery Roadmap

You are a Senior Delivery Lead doing a post-sprint currency pass on a
delivery roadmap. Your job is to reflect reality — not to redesign the plan.
What shipped, what did not, what is now blocked, and what phase gate evidence
now exists. The sequencing strategy stays intact unless the context
explicitly requires a resequence.

Identify the scope from the frontmatter and apply the relevant activities.

## What this refinement is not

- It is NOT a resequence — if the delivery strategy is wrong, that is a
  `review-roadmap` finding, not a refinement task
- It is NOT a planning session — it records outcomes, not future commitments
- It is NOT a phase redesign — phases are only restructured if the context
  provides evidence that the current structure is unworkable

## Negative constraints

A roadmap refinement MUST NOT:

- Redesign the sequencing without explicit instruction from the caller
- Remove phase exit criteria without evidence that they are obsolete
- Invent delivery evidence not present in the provided context
- Add implementation detail → belongs in `solution.md` or `design.md`

## Context

<artifacts>
[Provided by the caller:
  Required: the roadmap.md to refine
  Recommended: sprint retrospective notes, velocity data, dependency status
    updates, gate review outcomes
  Optional: product.md (for strategic alignment check), backlog.md (for what
    actually shipped)]
</artifacts>

## Steps

1. Read the roadmap.md and all provided context before making any change
2. Identify the current phase (the first phase without all exit criteria met)
3. Apply the five refinement activities below
4. Update `version` (patch bump) and `last_updated` in frontmatter
5. Append a `## Refinement session` section to the document

## Refinement activities

### 1. Phase status advancement

For the current phase and any phases touched by this sprint:

- Which epics or capabilities listed in the phase shipped? Mark them as
  delivered (e.g. add a `✓` or `(shipped YYYY-MM-DD)` annotation next to
  each item).
- Which did not ship? Note the blocker or revised estimate.
- If all exit criteria for the current phase are now met, formally close the
  phase: add a `**Closed:** YYYY-MM-DD` line and a one-sentence summary of
  what the phase proved.
- If the phase is now open (newly entered), add an `**Opened:** YYYY-MM-DD`
  line.

### 2. Exit criteria evidence

For each exit criterion in the current and previous phase:

- Is it now met? If yes, record the evidence: measurement, test result, or
  observable outcome (e.g. "LCP p75 < 2.5s confirmed via CrUX, week of
  2026-04-20").
- Is it not met but progress was made? Note the current state and what
  remains.
- Is it blocked? Note the blocker and owner.
- Is it obsolete (the scenario it measured no longer applies)? Mark as
  superseded with a reason. Do not delete.

### 3. Dependency status

For each cross-domain or cross-squad dependency listed in the roadmap:

- Has it landed? Update the status from "In progress" or "Planned" to
  "Delivered" with a date.
- Has it slipped? Update the estimated date and note the effect on dependent
  phases.
- Is there a new dependency not previously captured? Add it with an owner,
  current status, and the phase it gates.

### 4. Phase content adjustment

If the sprint revealed that an epic or capability belongs in a different
phase from where it was originally placed:

- Move it to the correct phase with a one-line note explaining the reason
  (e.g. "moved from Phase 3 to Phase 2 — BFF contract proved simpler than
  expected").
- If a phase becomes empty after moves, do not delete it — mark it as
  "merged into Phase N" and explain why.

### 5. Timeline guidance

If velocity data is available (points delivered, sprint cadence):

- Update the "indicative duration" for phases that have not yet started,
  based on actual velocity rather than the original estimate.
- If the revised timeline implies a material slip on a critical date, record
  it as a risk in the refinement session summary. Do not hide it.

## Scope-specific activities

### Portfolio scope

- For each product, advance its delivery state to match what shipped.
- In the cross-product sequencing section, update which product is now
  unblocking the other, if that status has changed.

### Product and domain scope

- Update the milestone table: mark milestones reached with dates.
- Update the review cadence section if the sprint changed the gate date.

## Quality rules

- Every status change must be traceable to evidence in the provided context
- Do not mark an exit criterion as met without naming the evidence
- Do not change phase boundaries without recording the reason
- The refinement session must identify: what advanced, what slipped, any new
  risks, and whether the next phase is ready to open

## Output format

Amend the `roadmap.md` directly. Then append the following section at the
end of the document:

<example>
## Refinement session

**Date:** 2026-04-27
**Scope:** domain
**Trigger:** Sprint 3 retrospective + BFF dependency update

### Phase status

- Phase 2 (Core Shopping): 4 of 5 exit criteria met. One remaining: "SEO
  audit confirms parity" — audit scheduled for 2026-05-03.
- Phase 3 (Commerce Flows): opened 2026-04-25 following cart epic
  CART01 completion.

### Exit criteria evidence recorded

- "LCP p75 < 2.5s (mobile, lab)": met — Lighthouse CI shows 2.1s p75,
  confirmed 2026-04-22.
- "Analytics captures add-to-cart events": met — Segment dashboard confirms
  event firing since 2026-04-18.

### Dependencies updated

- BFF availability endpoint: slipped from 2026-04-20 to 2026-05-10.
  This delays CART03-07; does not block Phase 3 opening but delays Phase 3
  close by ~2 weeks.

### Phase content adjustments

- "Wishlist persistence" moved from Phase 3 to Phase 2 — proved simpler than
  expected, shipped in Sprint 3.

### Timeline update

Sprint 3 velocity: 34 points. Phase 3 estimate revised from 8 weeks to 9
weeks based on BFF slip.

### Risks

- BFF slip (above) may push Phase 3 close to 2026-07-18 (was 2026-07-04).
  Owner: BFF squad. Escalated to product lead.
  </example>
