---
type: Backlog
scope: work-package
work_package: <!-- e.g. 01-foundations -->
epic: <!-- e.g. CART01 -->
domain: <!-- domain name -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
figma: <!-- Figma link, or omit -->
sources:
  - domain/{domain}/requirements.md
  - domain/{domain}/design.md
  - domain/{domain}/contracts.md
  - domain/{domain}/backlog.md
  - work/{domain}/{pkg}/design.md
---

# Backlog -- {Title} ({EPIC-ID})

Sprint-level backlog for the **{Title}** work package at
`work/{domain}/{pkg}/`, which implements {EPIC-ID} in the domain backlog.
This artifact is the source of truth for story-level scope, acceptance
criteria, and delivery tracking.

At work-package scope, this backlog is the paired requirements artifact for the
work-package design. {EPIC-ID} does not maintain a separate `requirements.md`.

## 1. Summary

**Epic:** {EPIC-ID} -- {Epic title}
**Phase:** <!-- e.g. Alpha (see `domain/{domain}/roadmap.md`) -->
**Priority:** P0
**Estimate:** <!-- total story points -->

**Scope:** <!-- 2-3 sentences describing what this work package delivers -->

**Out of scope (this work package):** <!-- explicitly deferred to later WPs -->

**Deliverables:**

- <!-- concrete artefact: file path, component name, or capability -->

**Dependencies:** <!-- "None" or named epic / prerequisite IDs -->

**Downstream consumers:** <!-- which next work packages depend on this one -->

## 2. Conventions

| Convention | Value |
| ---------- | ----- |
| Story ID format | `{EPIC-ID}-{00}` (e.g., `{EPIC-ID}-01`) |
| Status values | Not started, In progress, In review, Done, Blocked |
| Priority levels | P0 (must have), P1 (should have), P2 (stretch), P3 (defer) |
| Estimation | Fibonacci story points (1, 2, 3, 5, 8, 13) |
| Acceptance style | Each AC maps to a `TC-{DOM}-FR-XX` test case ID where applicable |

## 3. Stories

- [ ] **[{EPIC-ID}-01] {Story title}**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Deliverable:** <!-- what exists when this story is done -->
  - **Acceptance:**
    - [ ] <!-- testable condition 1 -->
    - [ ] <!-- testable condition 2 -->
    - [ ] <!-- testable condition 3 -->

- [ ] **[{EPIC-ID}-02] {Story title}**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Dependencies:** {EPIC-ID}-01
  - **Deliverable:** <!-- what exists when this story is done -->
  - **Acceptance:**
    - [ ] <!-- testable condition 1 -->
    - [ ] <!-- testable condition 2 -->

## 4. Traceability

### Stories to domain requirements

| Story | Domain FR(s) |
| ----- | ------------ |
| {EPIC-ID}-01 | FR-01 (<!-- description -- partial or full implementation) |

### Stories to design

| Story | Design sections (work-package) | Domain references |
| ----- | ------------------------------ | ----------------- |
| {EPIC-ID}-01 | Section N "<!-- section title -->" | `domain/{domain}/design.md` §2.N |

## 5. Definition of Done

A story in this backlog is done when:

- [ ] All acceptance criteria boxes are ticked
- [ ] Unit tests pass locally and in CI; coverage on new files >= 80%
- [ ] TypeScript typecheck passes with no `any` (except where JSDoc-justified)
- [ ] ESLint passes with no new warnings
- [ ] The story's design-doc section and requirement IDs are referenced in the commit message
- [ ] Code review approved by at least one other squad engineer
- [ ] PR merged into `main`; feature flag remains off in production

The epic ({EPIC-ID}) is done when every story above is done **and** the phase
exit criteria in `domain/{domain}/roadmap.md` hold.

## 6. Risks for this work package

| ID | Risk | Likelihood | Impact | Mitigation |
| -- | ---- | ---------- | ------ | ---------- |
| F1 | <!-- risk --> | Low | Medium | <!-- mitigation --> |

## 7. Handoff to follow-on work packages

When this work package closes, the following are stable and available to
downstream work packages:

- <!-- contract / artefact / file that is now stable -->

Next work packages:

1. `work/{domain}/02-{slug}/` -- {EPIC-ID + 1} {title}
