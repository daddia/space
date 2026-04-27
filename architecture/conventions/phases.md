# Delivery Phases

How work progresses through three phases — before code, during the foundation sprint, and after it closes — and the calibration rule that keeps artefacts lean.

## The calibration rule

> **If removing a document wouldn't block Story 1 from starting on Monday, that document belongs to Phase 1 or Phase 2, not Phase 0.**

This is the acceptance test for any proposed Phase 0 artefact. Apply it recursively: a section inside a Phase 0 document that fails the test belongs in a later phase too.

## Phase 0 — Before the foundation sprint

Five artefacts per scope plus the work-package pair. This is the complete pre-code set.

| Artefact                            | Scope             | Length       | Purpose                                                       |
| ----------------------------------- | ----------------- | ------------ | ------------------------------------------------------------- |
| `product.md` (pitch stage)          | Domain or product | ≤2 pages     | Why, who, problem, appetite, no-gos                           |
| `solution.md` (stub)                | Domain or product | ≤2 pages     | C4 context + NFRs; remaining sections `[NEEDS CLARIFICATION]` |
| `contracts.md` + source types       | Domain            | code + index | Executable types/schemas for the skeleton slice               |
| `backlog.md` (domain scope)         | Domain            | 1–2 pages    | Phase-1 epic list; later phases are placeholders              |
| `design.md` (walking-skeleton mode) | Work package      | 2–4 pages    | The one end-to-end slice + acceptance gates                   |
| `backlog.md` (work-package scope)   | Work package      | 3–5 pages    | Sprint-1 stories with EARS + Gherkin AC                       |

Total: ~10–15 pages of Markdown plus executable contract source.

`AGENTS.md` at the workspace root and package-level `AGENTS.md` overrides are always present regardless of phase.

## Phase 1 — During the foundation sprint

No artefacts are prescribed upfront. Written just-in-time as the skeleton walks:

- ADRs as decisions arise (MADR format, NYGARD style)
- Error taxonomy as the error registry takes shape in code
- CI pipeline config and `/examples/` directory
- New skills only once a pattern has been used twice (avoid speculative abstractions)

## Phase 2 — After the foundation sprint closes

Only after the skeleton has walked does the team know enough to author these usefully.

- `product.md` (product stage) — extended with target users, outcome metrics, product principles, stakeholders
- `solution.md` (full mode) — ten-section arc42-lite reverse-engineered from what walked
- `roadmap.md` — Now / Next / Later with phase exit criteria
- `metrics.md` — measurable baselines from the shipped skeleton
- Additional work-package pairs in TDD mode (later sprints)

## Phase gates

### Ready for Architecture

An epic is ready to enter Architecture when:

- Epic has a clear scope statement and context
- Initial stories are defined with acceptance criteria
- Priority is set relative to other epics
- Dependencies on other epics are identified

### Ready for Discovery (Definition of Ready)

A work item is ready for Delivery when:

- Requirements exist and are approved
- Technical design exists and is approved (for epics and complex stories)
- Stories have estimates and are marked "Ready"
- Dependencies are identified and resolved or planned

### Definition of Done

A work item is done when:

- Code implements the acceptance criteria
- Tests pass (unit, integration as applicable)
- Automated quality gates pass (lint, typecheck, test suite)
- Peer code review approved
- PR merged to main
- Documentation updated if behaviour changed

## `product.md` modes

| Mode    | When                              | Sections                                                                                                    | Length   |
| ------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| Pitch   | Phase 0 — before epics exist      | 1 Problem, 2 Appetite, 3 Sketch, 4 Rabbit holes, 5 No-gos                                                   | ≤2 pages |
| Product | Phase 2+ — after walking skeleton | Pitch sections + 6 Target users, 7 Outcome metrics, 8 Principles, 9 Stakeholders, 10 Relationship to parent | ≤5 pages |

## `solution.md` modes

| Mode | When     | Sections                                                                   | Length     |
| ---- | -------- | -------------------------------------------------------------------------- | ---------- |
| Stub | Phase 0  | §1 Context + §2 Quality goals; §3–11 headings with `[NEEDS CLARIFICATION]` | ≤2 pages   |
| Full | Phase 2+ | All eleven sections (arc42-lite)                                           | 8–12 pages |

## `design.md` modes

| Mode             | When              | Sections                                                                                | Length     |
| ---------------- | ----------------- | --------------------------------------------------------------------------------------- | ---------- |
| Walking-skeleton | Foundation sprint | The slice, files shipped, acceptance gates, what was NOT built                          | 2–4 pages  |
| TDD              | Sprint 2+         | References solution.md, sequence diagrams, exact signatures, error paths, test strategy | 5–10 pages |

Work-package design always references the parent solution.md for domain-wide patterns. It never re-narrates them.
