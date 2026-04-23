---
type: Backlog
scope: platform
product: space
version: '1.0'
owner: Horizon Platform
status: Draft
last_updated: 2026-04-23
parent_product: docs/product.md
related:
  - docs/product.md
  - docs/solution.md
  - docs/roadmap.md
  - docs/design/space-artefact-model.md
---

<!--
DO NOT INCLUDE in this document:
  - Business-case narrative             (goes to docs/product.md)
  - Architecture rationale              (goes to docs/solution.md or an ADR)
  - Pattern definitions                 (goes to docs/solution.md)
  - Story-level acceptance criteria     (goes to work/<wp>/backlog.md)
-->

# Backlog -- Space (platform)

Platform-level epic backlog. Lists the epics Space will deliver, their
objective, dependencies, status, and the work package that carries each
one when active. Story-level detail lives in the per-work-package
backlogs under `work/`.

- **Product:** `docs/product.md`
- **Solution:** `docs/solution.md`
- **Phases, gates, milestones:** `docs/roadmap.md`

## 1. Summary

**Objective.** Deliver Space in incremental, validation-gated phases:
source sync now, artefact-model v2 and publish pipeline next, platform
maturity (embedded mode, additional sources, expanded skill set) later.

**Delivery approach.** Each epic ships a visible, testable slice behind
its own work package. No epic is "in progress" without an active
`work/<wp>/backlog.md` and matching `work/<wp>/design.md`. Phase gates
live in `docs/roadmap.md`.

**Prerequisites (complete).**

- `@tpw/skills` base implementation; `sync-skills` postinstall bin.
- `@tpw/create-space` base scaffolder; interactive prompt flow;
  template directory.
- `@tpw/space` CLI skeleton and Commander registration.
- The three-package monorepo orchestration (pnpm, turborepo, changesets).
- `storefront-space` available as the first validation workspace.

**Prerequisites (required before Next phase ships).**

- `@tpw/space` source-sync commands green against real Atlassian
  credentials from `storefront-space` (EPIC-01).
- `docs/design/space-artefact-model.md` reviewed and accepted (this is
  the design that EPIC-02, -03, -04 implement against).

**Out of scope (platform).** Scope for specific epics lives in each
epic's work-package `design.md` and `backlog.md`. Platform-level
out-of-scope is captured in `docs/product.md` Section 5 ("No-gos").

## 2. Conventions

| Convention      | Value                                                             |
| --------------- | ----------------------------------------------------------------- |
| Epic ID format  | `EPIC-{nn}` (e.g. `EPIC-01`)                                      |
| Story ID format | `SPACE-{nn}` (stored in the work-package backlog)                 |
| Status values   | Not started, In progress, In review, Done, Blocked                |
| Priority levels | P0 (must have), P1 (should have), P2 (stretch), P3 (defer)        |
| Estimation      | Fibonacci story points (1, 2, 3, 5, 8, 13)                        |
| Acceptance      | EARS + Gherkin at work-package scope (see artefact-model Sec 5.3) |

## 3. Epic breakdown

| Epic    | Title                                         | Phase | Priority | Dependencies         | Points | Work package                      | Status      |
| ------- | --------------------------------------------- | ----- | -------- | -------------------- | ------ | --------------------------------- | ----------- |
| EPIC-01 | Source sync foundation                        | Now   | P0       | -                    | 43     | `work/01-source-sync/`            | In progress |
| EPIC-02 | Space v2 artefact model: skill changeset (P0) | Next  | P0       | EPIC-01 (validation) | ~25    | `work/02-v2-skills/` (planned)    | Not started |
| EPIC-03 | Space v2 artefact model: tooling and router   | Next  | P1       | EPIC-02              | ~15    | `work/03-v2-tooling/` (planned)   | Not started |
| EPIC-04 | Publish pipeline: Jira                        | Next  | P1       | EPIC-02, EPIC-01     | ~20    | `work/04-publish-jira/` (planned) | Not started |
| EPIC-05 | Publish pipeline: Confluence                  | Next  | P1       | EPIC-02, EPIC-01     | ~15    | `work/05-publish-conf/` (planned) | Not started |
| EPIC-06 | Embedded workspace mode                       | Later | P2       | EPIC-02              | TBD    | `work/06-embedded/` (planned)     | Not started |
| EPIC-07 | Additional source providers (Slack, Vercel)   | Later | P2       | EPIC-01              | TBD    | `work/07-providers/` (planned)    | Not started |
| EPIC-08 | Multi-project Jira and incremental sync       | Later | P2       | EPIC-01              | TBD    | `work/08-jira-scale/` (planned)   | Not started |
| EPIC-09 | Skill library expansion (regulated + ops)     | Later | P2       | EPIC-02              | TBD    | `work/09-skills-expand/` (plan)   | Not started |
| EPIC-10 | Workspace profiles at scaffold                | Later | P2       | EPIC-02              | TBD    | `work/10-profiles/` (planned)     | Not started |

## 4. Epic detail

### EPIC-01 -- Source sync foundation

**Scope:** Land the working `space sync jira` and `space sync confluence`
commands; harden the scaffold template to include the `.space/`
directory, `@tpw/space` dev dependency, and `sync` script; commit the
first real source mirrors inside `storefront-space`.

**Key deliverables.** Jira client + sync + tests; Confluence client +
sync + tests; `space sync` all-sources dispatch; scaffold template
update and integration test; storefront-space smoke tests; path-traversal
protection; skill structural lint in CI.

**Dependencies.** None (base package implementations complete).

**Work package.** `work/01-source-sync/backlog.md` (16 stories,
SPACE-01 .. SPACE-16).

**Status.** In progress.

### EPIC-02 -- Space v2 artefact model: skill changeset (P0)

**Scope:** Implement the P0 row of
`docs/design/space-artefact-model.md` Section 7.1. Add
`write-solution` (stub + full modes), refactor `write-product`
(pitch + product modes), refactor `write-backlog` domain scope for
phase-1-only depth, split `design` into walking-skeleton and TDD modes,
add executable `write-contracts`, add negative-constraint comment
blocks to every template, rewrite every skill description per
Anthropic skill-creator rules, lock down the backlog schema
(EARS + Gherkin), add the enriched frontmatter schema across every
skill.

**Key deliverables.** New / revised `SKILL.md` and `template.md` files
for each skill listed above. Minor release of `@tpw/skills` (0.3.0).
One example domain in `storefront-space` migrated to the new artefact
set as validation.

**Dependencies.** EPIC-01 delivers the source-sync substrate; v2 skills
need that to demonstrate end-to-end publish readiness.

**Work package.** `work/02-v2-skills/` (planned).

**Status.** Not started.

### EPIC-03 -- Space v2 artefact model: tooling and router

**Scope:** Implement the P1 tooling row of
`docs/design/space-artefact-model.md` Section 7.2. Add `space-index`
router skill with CI-regenerated body; generate role views
(`pm.md`, `architect.md`, `engineer.md`); add the description eval
loop in CI (`run_loop.py`); add `pnpm lint:docs` (frontmatter schema,
link check, budgets); add the `plan-delivery` orchestrator for Phase 0;
add the `refine-docs` sprint-end skill.

**Dependencies.** EPIC-02 (the skills must exist before the index,
router, and eval loop are meaningful).

**Work package.** `work/03-v2-tooling/` (planned).

**Status.** Not started.

### EPIC-04 -- Publish pipeline: Jira

**Scope:** Implement `space publish jira` per
`docs/design/space-artefact-model.md` Section 6. Source-aware behaviour
(`issues.source: jira | markdown`); dry-run output; key-ownership rule
with sidecar mapping at `.space/sources/jira/mapping.json`; EARS +
Gherkin acceptance criteria rendered per `ac_placement` config.

**Key deliverables.** Publish command + provider; schema parser for
domain and work-package backlogs; sidecar mapping; integration tests
against msw fixtures; validation against `storefront-space`.

**Dependencies.** EPIC-02 (schema lock-down); EPIC-01 (Jira mirror is
the diff basis).

**Work package.** `work/04-publish-jira/` (planned).

**Status.** Not started.

### EPIC-05 -- Publish pipeline: Confluence

**Scope:** Implement `space publish confluence <path>`. Opt-in via
`confluence_page_id` frontmatter. Markdown -> Confluence storage XHTML
conversion. Version increment per the Confluence contract; local
mirror overwritten from the API response.

**Dependencies.** EPIC-02 (artefact layout stable); EPIC-01 (Confluence
mirror is the local source of truth).

**Work package.** `work/05-publish-conf/` (planned).

**Status.** Not started.

### EPIC-06 -- Embedded workspace mode

**Scope:** `--mode embedded` on `create-space`: scaffold Space into an
existing code repo as a top-level subtree. Success condition: a team
with a single-repo initiative can adopt Space without maintaining a
second repo, with no loss of function compared to sibling mode.
Sibling mode remains the correct choice for program-level workspaces
that span multiple repos or need distinct access control.

**Dependencies.** EPIC-02 (canonical artefact set must exist first so
the embedded layout is settled).

**Work package.** `work/06-embedded/` (planned).

**Status.** Not started.

### EPIC-07 -- Additional source providers (Slack, Vercel)

**Scope:** `space sync slack` and `space sync vercel` writing
native-format mirrors under `.space/sources/{provider}/`. Same atomic
pattern and error handling as the Atlassian providers.

**Dependencies.** EPIC-01 (pattern established).

**Work package.** `work/07-providers/` (planned).

**Status.** Not started.

### EPIC-08 -- Multi-project Jira and incremental sync

**Scope:** Extend `sources.issues` from a single block to an array
(additive schema change). Add `updatedDate > {last_sync}` JQL filtering
for incremental pulls; preserve full-refresh as the explicit option.
Same treatment applied to Confluence where viable.

**Dependencies.** EPIC-01.

**Work package.** `work/08-jira-scale/` (planned).

**Status.** Not started.

### EPIC-09 -- Skill library expansion (regulated + ops)

**Scope:** Fill out the delivery lifecycle. Add `review-adr`,
`validate`, `write-metrics` (promoted from deferred to stable after
first real use), `retrospective`, `incident-response`,
`post-deployment`. Keep `write-requirements` as optional
`stage: deprecated-by-default`, usable only when a regulated-domain
flag is set.

**Dependencies.** EPIC-02.

**Work package.** `work/09-skills-expand/` (planned).

**Status.** Not started.

### EPIC-10 -- Workspace profiles at scaffold

**Scope:** `--profile` flag on `create-space`; profile YAML files
under `@tpw/skills/profiles/`; `space sync skills --profile X`
materialises only the profile's skills. Starter profiles: `minimal`,
`domain-team`, `platform`, `full`.

**Dependencies.** EPIC-02 (enriched frontmatter); EPIC-03 (tooling).

**Work package.** `work/10-profiles/` (planned).

**Status.** Not started.

## 5. Dependency graph

```text
EPIC-01 (source sync)
  +-- EPIC-02 (v2 skills)
  |     +-- EPIC-03 (v2 tooling + router)
  |     +-- EPIC-04 (publish jira)
  |     +-- EPIC-05 (publish confluence)
  |     +-- EPIC-06 (embedded mode)
  |     +-- EPIC-09 (skills expansion)
  |     +-- EPIC-10 (profiles)  <--  also depends on EPIC-03
  +-- EPIC-07 (additional providers)
  +-- EPIC-08 (jira scale)
```

## 6. Critical path

```text
EPIC-01 --> EPIC-02 --> EPIC-03
                    --> EPIC-04 (+ EPIC-05 in parallel)
```

The artefact-model roll-out (EPIC-02) is the gating epic: every later
epic in the Next phase depends on the v2 skill set being stable.

## 7. Parallelisation opportunities

| Workstream              | Can run in parallel with                   |
| ----------------------- | ------------------------------------------ |
| EPIC-04 (publish jira)  | EPIC-05 (publish confluence)               |
| EPIC-07 (new providers) | Any Next-phase epic once EPIC-01 is stable |
| EPIC-08 (jira scale)    | EPIC-07                                    |

## 8. Minimum viable slice

If scope pressure forces a cut, the smallest coherent release that
delivers platform value end-to-end:

- **EPIC-01** -- source sync
- **EPIC-02** (subset) -- `write-solution`, `write-product` refactor,
  negative-constraint blocks, description rewrites. Defer eval loop
  and tooling to a later slice.

Result: Space can read from external systems and produce the canonical
four-doc set in Markdown. Publish back (EPIC-04, EPIC-05) waits for
the next slice.

## 9. Assumptions

| ID  | Assumption                                                           | Impact if wrong                                         |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| A1  | Markdown skills will remain the cross-tool standard                  | Platform has to support a non-Markdown format; rework   |
| A2  | Atlassian rate limits hold under full-space Confluence sync          | Need filtering / batch strategy sooner than Later phase |
| A3  | `storefront-space` is representative of future initiative workspaces | Validation may miss domain-specific needs               |
| A4  | Description-only LLM routing remains the agent-skill contract        | May need to layer an in-workspace router over the spec  |

## 10. Risks

| ID  | Risk                                                      | Likelihood | Impact | Mitigation                                                              |
| --- | --------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------- |
| R1  | v2 artefact model adoption slower than Next phase assumes | Medium     | Medium | Roll out domain-by-domain; keep v0 artefacts legacy-compatible          |
| R2  | Publish pipeline conversion (Markdown <-> XHTML) complex  | Medium     | Medium | Spike on one real Confluence page first; defer if conversion fails      |
| R3  | Skill count grows past router scale before index ships    | Low        | Medium | Cap new-skill admission at 20 until `space-index` is green              |
| R4  | `storefront-space` blocks on source sync, delays EPIC-02  | Low        | High   | Keep EPIC-02 scoped independently; validate in a fresh workspace        |
| R5  | Breaking schema change needed in `.space/config`          | Low        | High   | Stick to additive changes; require major version bump per solution §2.1 |
