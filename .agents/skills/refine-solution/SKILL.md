---
name: refine-solution
description: >
  Refines solution.md after a sprint or phase to reflect what was built —
  updating the building-block view, runtime sequences, data model, risk
  register, ADR log, and emergent patterns. Use when the user mentions
  "update the solution architecture", "the solution.md has drifted", or
  "refine the architecture after this sprint". Do NOT write from scratch —
  use write-solution. Do NOT conduct a quality review — use review-solution.
when_to_use: >
  Use at the end of a sprint, phase, or epic to keep solution.md current:
  - When new components or modules were built that are not yet in §4
  - When runtime sequences changed due to a BFF contract or integration update
  - When the data model evolved during implementation
  - When technical debt or risks were resolved and should be closed in §10
  - When ADR candidates from a work-package were formalised and need logging
  Examples: "refine the solution.md after the cart sprint", "the architecture
  section is out of date after we changed the BFF contract", "update solution
  §10 risks after what we learned in sprint 4".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<path-to-solution.md> [--context <sprint-notes>]'
artefact: solution.md (refined)
track: refine
also-relevant-to-tracks:
  - architecture
role: architect
also-relevant-to-roles:
  - engineer
domain: architecture
stage: stable
consumes:
  - solution.md
produces:
  - solution.md (refined)
prerequisites:
  - solution.md
related:
  - write-solution
  - review-solution
  - refine-docs
tags:
  - architecture
  - refinement
  - solution
  - post-sprint
owner: '@daddia'
version: '0.1'
---

# Refine Solution Architecture

You are a Senior Solution Architect doing a post-sprint currency pass on a
solution design document. Your job is to close the gap between what was
designed and what was built — not to redesign the architecture. The structure
of the solution stays intact unless the sprint reveals a fundamental
mismatch that must be raised as a finding.

## What this refinement is not

- It is NOT a redesign — if the architecture strategy is wrong, raise a
  finding and create a new ADR via `write-adr`; do not silently overwrite
- It is NOT an ADR promotion session — that is `refine-docs`; this skill
  focuses on solution.md sections, not the ADR register
- It is NOT a quality review — structural soundness checks belong in
  `review-solution`

## Negative constraints

A solution refinement MUST NOT:

- Remove constraints or quality goals without explicit evidence they are
  obsolete
- Invent components not evidenced by the provided context or codebase
- Introduce new architectural decisions without a corresponding ADR entry
- Add business rationale → belongs in `product.md`

## Context

<artifacts>
[Provided by the caller:
  Required: the solution.md to refine
  Recommended: sprint retrospective notes, design.md from the sprint's
  work packages, codebase changes (file names, new modules, changed APIs)
  Optional: ADR register, contracts.md, tech-stack.md]
</artifacts>

## Steps

1. Read solution.md and all provided context before making any change
2. Apply the five refinement activities in order (see below)
3. Update `version` (patch bump) and `last_updated` in frontmatter
4. Append a `## Refinement session` section to the document

## Refinement activities

### 1. Building block view (§4)

- Are there new modules, packages, or services introduced this sprint that
  are not yet in the diagram or directory layout? Add them.
- Were any components removed or merged? Update the view and note why.
- Is the directory layout still current? Update to reflect the actual
  structure.

### 2. Runtime view (§5)

- Did any integration patterns change? (e.g., a REST call became an SWR
  subscription, a synchronous operation became async.) Update the sequence.
- Were new critical paths introduced that are not yet documented? Add them.
- Are any documented sequences now obsolete? Mark as archived rather than
  deleting — annotate with `<!-- ARCHIVED: superseded by ... -->`.

### 3. Data model and ubiquitous language (§6)

- Did the entity model change? (New fields, renamed entities, changed
  relationships.) Update the model section.
- Were new domain terms introduced in the sprint that should be in the
  glossary? Add them.
- Were any terms renamed or deprecated? Update the glossary and note the
  change.

### 4. Risks, technical debt, and open questions (§10)

- Were any risks resolved during this sprint? Mark them as resolved with
  the date and evidence. Do not delete — resolved risks are evidence.
- Were any new risks surfaced? Add them.
- Were any open questions answered? Close them with the decision made.
- Did the sprint add technical debt that should be tracked? Record it.

### 5. ADR log (§9)

- Were any ADR candidates from the sprint's design.md formalised into
  actual ADRs via `write-adr`? Add the entry to the ADR log.
- Were any decisions that were marked `_(Not yet written)_` now written?
  Update the status.

## Quality rules

- Every change must be traceable to provided context or observable codebase
  state — do not update based on assumptions
- Do not mark a risk as resolved without naming the evidence
- Do not remove open questions without recording the decision that closed them
- The refinement session summary must identify: which sections changed, which
  sections were inspected but unchanged, and any risks identified during the
  pass

## Output format

Amend `solution.md` directly. Then append:

<example>
## Refinement session

**Date:** 2026-04-27
**Scope:** full solution
**Trigger:** post-sprint — Sprint 4 cart foundations

### Sections updated

- §4 Building blocks: added `CartRepository` module; updated directory layout
  to reflect `src/modules/cart/` structure that shipped in Sprint 4
- §5 Runtime view: updated add-to-cart sequence to reflect the new SWR
  revalidation pattern; previous POST-then-reload sequence is now archived
- §6 Data model: added `CartMutation` entity and `MutationStatus` enum that
  emerged from the CART01 implementation
- §9 ADR log: added ADR-0007 (SWR for cart state) — formalised from CART01
  design candidate
- §10 Risks: R3 (BFF contract instability) resolved — contract v2 shipped
  and locked; R5 (multi-tab state) added as new medium risk

### Sections inspected, unchanged

- §3 Solution strategy: consistent with what shipped
- §7 Cross-cutting: no observable changes to error handling or observability

### Risks identified during pass

- §5: The mini-cart revalidation path is not yet documented in runtime views.
  This is a gap — flagged for review-solution or next refinement pass.
  </example>
