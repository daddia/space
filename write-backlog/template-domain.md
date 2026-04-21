---
type: Backlog
scope: domain
domain: <!-- domain name -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
figma: <!-- Figma link, or omit -->
parent_product: product/product.md
related:
  - domain/{domain}/product.md
  - domain/{domain}/roadmap.md
  - domain/{domain}/metrics.md
  - domain/{domain}/requirements.md
  - domain/{domain}/design.md
  - domain/{domain}/contracts.md
---

# Backlog -- {Domain} (domain)

Domain-level backlog for {domain}. Lists epics, objectives, dependencies,
status, and the work package that carries each one when active. Story-level
detail lives in per-work-package backlogs under `work/`.

## 1. Summary

### Objective

<!-- What does this domain deliver and why? Reference the product strategy. -->

### Delivery approach

<!-- Staged increments or monolith? Wave delivery pattern? -->

### Prerequisites (complete)

<!-- What is already in place that this domain depends on. -->

### Prerequisites (required before core work ships)

<!-- What must be resolved before the first epic can complete. -->

### Out of scope (this domain)

<!-- Explicitly deferred work items with cross-references. -->

## 2. Conventions

| Convention | Value |
| ---------- | ----- |
| Epic ID format | `{DOM}{00}` (e.g., `{DOM}01`) |
| Story ID format | `{DOM}{00}-{00}` (stored in work-package backlog) |
| Dependency ID | `<!-- BFF-ASK-{00} or CENTRAL-{00} etc. -->` |
| Status values | Not started, In progress, In review, Done, Blocked |
| Priority levels | P0 (must have), P1 (should have), P2 (stretch), P3 (defer) |
| Estimation | Fibonacci story points (1, 2, 3, 5, 8, 13) |

## 3. Epic breakdown

| Epic | Title | Roadmap phase | Priority | Dependencies | Points | Work package | Status |
| ---- | ----- | ------------- | -------- | ------------ | ------ | ------------ | ------ |
| {DOM}01 | <!-- title --> | Phase 1 -- Alpha | P0 | None | TBD | `work/{domain}/01-{slug}/` | Not started |

## 4. Traceability

### Requirements to epics

| Requirement | Epic(s) |
| ----------- | ------- |
| FR-01 <!-- name --> | {DOM}01 |

### Figma frames to epics

| Figma frame | Epic(s) |
| ----------- | ------- |
| <!-- frame name --> | {DOM}01 |

## 5. Epics

---

### {DOM}01 -- {Title}

**Scope:** <!-- What this epic delivers in one sentence. -->

**Key deliverables:** <!-- comma-separated list of artefacts produced -->

**Dependencies:** <!-- None, or named epic / external dependency IDs -->
**Status:** Not started.
**Work package:** `work/{domain}/01-{slug}/` -- story detail in `work/{domain}/01-{slug}/backlog.md`.

---

## 6. Dependency graph

```text
{DOM}01 Foundation
    |
    v
{DOM}02   {DOM}03
    \       /
     v     v
     {DOM}04
```

### Critical path

**{DOM}01 → {DOM}02 → {DOM}04** (narrative: why this is critical)

### Parallelisation

| Workstream | Sequence | Notes |
| ---------- | -------- | ----- |
| **A: core** | {DOM}01 → {DOM}02 | Critical path |
| **B: supporting** | {DOM}03 | Independent after {DOM}01 |

### Minimum viable slice

<!-- If scope pressure forces a cut, what is the smallest coherent delivery?
List the epics and what is lost. -->

## 7. Risks and assumptions

### Assumptions

| ID | Assumption | Impact if wrong |
| -- | ---------- | --------------- |
| A1 | <!-- assumption --> | <!-- impact --> |

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| -- | ---- | ---------- | ------ | ---------- |
| R1 | <!-- risk --> | Medium | Medium | <!-- mitigation --> |
