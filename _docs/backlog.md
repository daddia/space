# Backlog — cart docs refinement + skills package enhancement

Five work streams. Task IDs are stable. Priority: **P0** blocks, **P1** should, **P2** defer.

## Stream A — Freeze cart as canon

| ID | Task | Priority | Depends on |
|---|---|---|---|
| A1 | Publish cart benchmark DoD checklist (the 7 criteria for "freeze cart") | P0 | — |
| A2 | Resolve or assign owner+date for every open question Q1–Q13 in `domain/cart/requirements.md` | P0 | — |
| A3 | Confirm baseline capture plan (CM-01, CM-I01..05, CM-G13, CWV) with owner and due date in `metrics.md` §4 | P0 | — |
| [x] A4 | Verify referenced ADRs exist; ADRs on repo `Users/jdaddia/Projects/storefront/storefront/architecture/decisions` | P0 | — |
| A5 | Resolve placeholder-copy blockers (Figma placeholders; `getCartErrorMessage` final strings) — track via A2 if deferred | P1 | A2 |
| A6 | Run `review-discovery` on cart; close every blocking gap | P0 | A1–A5, B13, C15 |
| A7 | Tag cart docs `v1.0-canon`; mark `status: Canonical` in frontmatter | P0 | A6 |
| A8 | Trim `research/legacy-analysis.md` to decision-driving sections; move inventory to an appendix or drop | P2 | A7 |

## Stream B — Extract patterns to `architecture/patterns/`

| ID | Task | Priority | Depends on |
|---|---|---|---|
| B1 | Finalise pattern extraction candidate list from `domain/cart/design.md` §9 | P0 | — |
| B2 | Write `architecture/patterns/state-ownership-boundary.md` | P1 | B1 |
| B3 | Write `architecture/patterns/bff-integration.md` | P0 | B1 |
| B4 | Write `architecture/patterns/rsc-islands.md` | P1 | B1 |
| B5 | Write `architecture/patterns/modules.md` (module scaffold + dual barrels) | P0 | B1 |
| B6 | Write `architecture/patterns/api-routes.md` (`runCartMutation` shape) | P0 | B1 |
| B7 | Write `architecture/patterns/client-mutations.md` (`useOptimistic` + structural rollback) | P1 | B1 |
| B8 | Write `architecture/patterns/observability.md` | P1 | B1 |
| B9 | Write `architecture/patterns/caching-security.md` | P1 | B1 |
| B10 | Write `architecture/patterns/zustand-ui-state.md` (UI-coordination boundary) | P1 | B1 |
| B11 | Write `architecture/patterns/error-taxonomy.md` | P1 | B1 |
| B12 | Write `architecture/patterns/testing.md` (test policy + fixture builder pattern) | P2 | B1 |
| B13 | Update `domain/cart/design.md` §2 to reference patterns rather than re-explain; keep domain-specific deltas | P0 | B2–B11 |
| B14 | Write `architecture/patterns/README.md` (index, per-pattern owner, quarterly review cadence) | P0 | B1 |

## Stream C — Skills package enhancement

### C.1 Conventions & structure

| ID | Task | Priority | Depends on |
|---|---|---|---|
| C1 | Write ADR in `horizon/skills/` for the `{verb}-{topic}` naming convention + canonical verb list | P0 | — |
| C2 | Rename bare-topic skills: `adr`→`write-adr`, `design`→`write-design`, `requirements`→`write-requirements` | P0 | C1 |
| [x] C3 | Document the skill package structure (`SKILL.md` + `template.md` + `examples/` + `scripts/`) in `horizon/skills/README.md` | P0 | C1 |
| C21 | Publish `horizon/skills/INDEX.md` grouping skills by category (Discovery / Decisions / Work package / Reviews / Patterns) | P1 | C1 |

### C.2 Discovery skills (new or migrate)

| ID | Task | Priority | Depends on |
|---|---|---|---|
| C4 | Build `write-product` skill (scope arg: `platform` / `domain`); cart product.md as example | P0 | A7, C3 |
| C5 | Build `write-roadmap` skill (scope arg) | P1 | C3 |
| C6 | Build `write-metrics` skill | P1 | C3 |
| C7 | Update `write-requirements` skill with template + examples; cart requirements.md as example | P0 | A7, C2, C3 |
| C8 | Update `write-design` skill with template + examples + pattern-reference enforcement | P0 | A7, C2, C3, B14 |
| C9 | Build `write-contracts` skill | P0 | A7, C3 |
| C10 | Build `write-backlog` skill (scope arg: `domain` / `work-package`) | P0 | A7, C3 |
| C11 | Build `write-legacy-analysis` skill (migrate from `crew-library/activities/legacy-analysis`) | P1 | C3 |
| C14 | Build `plan-discovery` orchestration skill (migrate from `crew-library/activities/discovery-brief`) | P0 | C4–C10 |

### C.3 Decision skills

| ID | Task | Priority | Depends on |
|---|---|---|---|
| C12 | Finalise `write-adr` skill (rename from `adr`; verify output format against existing ADRs) | P0 | C2 |
| C13 | Build `plan-adr` skill (migrate from `crew-library/activities/adr-plan`) | P1 | C3 |

### C.4 Work-package & implementation skills

| ID | Task | Priority | Depends on |
|---|---|---|---|
| C18 | Build `plan-work-package` skill (outputs `work/{pkg}/design.md` + `backlog.md`) | P0 | A7, C3 |
| C17 | Build `extract-pattern` skill (graduate a design section from a domain to `architecture/patterns/`) | P1 | B14 |
| C19 | Build `write-retrospective` skill (migrate from `crew-library/activities/retrospective`) | P2 | C3 |
| C20 | Build `update-docs-post-sprint` skill | P1 | C3 |

### C.5 Review & gate skills

| ID | Task | Priority | Depends on |
|---|---|---|---|
| C15 | Build `review-discovery` skill (end-of-discovery holistic review against G2 DoD) | P0 | C3, D1, D2, D3 |
| C16 | Build `validate-discovery` skill (phase-gate verification; outputs G0–G3 report) | P0 | D1, D2 |

### C.6 Skill migration tracker

| ID | Task | Priority | Depends on |
|---|---|---|---|
| C22 | Publish migration tracker mapping `crew-library/activities/*` → new skills; mark owners | P1 | C1 |

## Stream D — Gates & Definition of Done

| ID | Task | Priority | Depends on |
|---|---|---|---|
| D1 | Publish `horizon/skills/gates.md` with G0–G3 gate definitions and G2.n work-package mini-gate | P0 | C1 |
| D2 | Publish per-artifact DoD checklists (`product`, `roadmap`, `metrics`, `requirements`, `design`, `contracts`, `backlog`, `legacy-analysis`, `work-package`) | P0 | C3 |
| D3 | Publish richness-floor minimums table (min FR count, min guardrails, min risks, etc.) | P0 | D2 |
| D4 | Create `architecture/contracts/index.md` scaffold for cross-domain contract tracking; cart is the first entry | P1 | A7 |

## Stream E — Governance

| ID | Task | Priority | Depends on |
|---|---|---|---|
| E1 | Document doc-in-PR discipline; add MR template + pre-merge check for files referenced by design/contract docs | P0 | — |
| E2 | Document end-of-sprint review cadence (run `review-docs` + `update-docs-post-sprint`) | P0 | C15, C20 |
| E3 | Assign owner + quarterly review cadence per `architecture/patterns/*.md` | P1 | B14 |
| E4 | Publish template versioning policy (how a template bump propagates; domains pin versions) | P1 | C3 |
| E5 | Deprecate `crew-library/activities/*` entries as their skill migration closes; leave redirect stubs | P2 | C22 |

## Critical path

```
A1 → A2/A3/A4/A5 → A6 → A7          (cart benchmark)
                    ↓
B1 → B2..B12 → B13 → B14            (patterns)
                    ↓
C1 → C2/C3 → C4..C18                (skills)
       ↓
D1/D2/D3 → C15/C16                  (gates + review skills)
              ↓
             E1/E2                   (governance lands)
```

## Minimum viable slice (if scope-pressured)

If you need the smallest coherent release that proves the model:

- **A1, A2, A4, A6, A7** — cart frozen
- **B1, B3, B5, B6, B13, B14** — the 4 highest-value patterns extracted + index
- **C1, C2, C3** — naming + structure decided
- **C4, C7, C8, C9, C10, C14, C15** — the skills needed to scaffold checkout end-to-end
- **D1, D2, D3** — gates + DoD exist
- **E1** — doc-in-PR discipline in place

Total: 20 tasks. Enough to start the checkout discovery against the new template.