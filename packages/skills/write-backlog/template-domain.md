---
type: Backlog
scope: domain
domain: <!-- domain name -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
figma: <!-- Figma link, or omit -->
parent_product: <!-- domain/{d}/product.md or docs/product.md -->
related:
  - <!-- domain/{d}/product.md -->
  - <!-- domain/{d}/solution.md -->
  - <!-- domain/{d}/roadmap.md -->
  - <!-- domain/{d}/contracts.md -->
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this domain-scope backlog.md:
  - Architecture patterns, module boundaries, or technical rationale → solution.md
  - Business strategy, positioning, or target users                  → product.md
  - Phase dates, milestones, or delivery sequencing prose            → roadmap.md
  - Story-level acceptance criteria (EARS / Gherkin)                 → work/{d}/{wp}/backlog.md
  - API shapes, schemas, type aliases, or code fences                → contracts.md
  - Implementation detail for the epic currently in flight           → work/{d}/{wp}/design.md
Later-phase (Next / Later) epics stay as single-line placeholders unless --depth full.
-->

# Backlog -- {Domain} (domain)

Domain-level epic backlog. Lists the epics the {domain} domain will deliver,
their objective, dependencies, status, and the work package that carries each
one when active. Story-level detail lives in per-work-package backlogs under
`work/`.

- **Product:** [`domain/{d}/product.md`](product.md)
- **Solution:** [`domain/{d}/solution.md`](solution.md)
- **Phases, gates, milestones:** [`domain/{d}/roadmap.md`](roadmap.md)

## 1. Summary

**Objective.** <!-- What does this domain deliver and why? Reference the product strategy. -->

**Delivery approach.** <!-- Staged increments or monolith? Wave delivery pattern? -->

**Prerequisites (complete).**

- <!-- what is already in place -->

**Prerequisites (required before core work ships).**

- <!-- what must be resolved before the first epic can complete -->

**Out of scope.** The canonical list of no-gos lives in
[`product.md`](product.md) §5. Phase-gated deferrals live in
[`roadmap.md`](roadmap.md) §Later. This backlog does not restate either.

## 2. Conventions

| Convention | Value |
| --- | --- |
| Epic ID | `{DOM}{nn}` (e.g. `{DOM}01`) |
| Story ID | `{DOM}{nn}-{nn}` (lives in the work-package backlog) |
| Status | Not started, In progress, In review, Done, Blocked |
| Priority | P0 (must have), P1 (should have), P2 (stretch), P3 (defer) |
| Estimation | Fibonacci story points (1, 2, 3, 5, 8, 13) |
| Acceptance format | EARS + Gherkin at work-package scope |

## 3. Epic breakdown

<!--
Now-phase rows: full detail in §4 Epic detail.
Next/Later-phase rows: single-line placeholder (no §4 entry unless --depth full).
-->

| Epic | Title | Phase | Priority | Deps | Points | Work package | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {DOM}01 | <!-- Now-phase title --> | Now | P0 | - | TBD | `work/{d}/01-{slug}/` | Not started |
| {DOM}02 | <!-- Now-phase title --> | Now | P0 | {DOM}01 | TBD | `work/{d}/02-{slug}/` | Not started |
| {DOM}03 | <!-- Next-phase title --> | Next | P1 | {DOM}02 | TBD | `work/{d}/03-{slug}/` (planned) | Not started |

## 4. Epic detail

<!--
Write a full entry for every Now-phase epic.
Next/Later-phase epics are placeholders unless --depth full was passed.
-->

### {DOM}01 -- {Title}

**Scope.** <!-- What this epic delivers in one paragraph. -->

**Key deliverables.** <!-- comma-separated list -->

**Dependencies.** None (prerequisites satisfied).

**Status.** Not started. **Work package:** `work/{d}/01-{slug}/` (planned).

---

### {DOM}02 -- {Title}

**Scope.** <!-- What this epic delivers. -->

**Key deliverables.** <!-- comma-separated list -->

**Dependencies.** {DOM}01.

**Status.** Not started. **Work package:** `work/{d}/02-{slug}/` (planned).

---

## 5. Dependency graph

```text
{DOM}01 (foundation)
  +-- {DOM}02
        +-- {DOM}03
```

## 6. Critical path

```text
{DOM}01 → {DOM}02 → {DOM}03
```

<!-- One-line narrative: why this is the critical path. -->

## 7. Parallelisation opportunities

| Workstream | Can run in parallel with |
| --- | --- |
| {DOM}02 | {DOM}03 (once {DOM}01 ships) |

## 8. Minimum viable slice

If scope pressure forces a cut, the smallest coherent release:

- **{DOM}01** — foundation.
- **{DOM}02** — <!-- first user-visible slice -->.

Result: <!-- one sentence on what the customer gets >.

## 9. Assumptions

| ID | Assumption | Impact if wrong |
| --- | --- | --- |
| A1 | <!-- assumption --> | <!-- impact --> |

## 10. Risks (delivery-scoped)

Technical and architecture-scoped risks are authoritative in
[`solution.md`](solution.md) §10.1 and not duplicated here. This register
covers delivery risks only: scheduling, baselines, and cross-squad
coordination.

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | <!-- delivery risk --> | Medium | Medium | <!-- mitigation --> |
