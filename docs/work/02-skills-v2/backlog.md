---
type: Backlog
scope: work-package
work_package: 02-skills-v2
epic: SPACE-02
product: space
version: "1.0"
owner: daddia
status: Done
last_updated: 2026-04-23
sources:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
  - docs/design/space-artefact-model.md
  - work/02-skills-v2/design.md
---

# Backlog -- Space v2 Skill Changeset (SPACE-02)

Sprint-level backlog for the **Space v2 artefact model: skill changeset** work package at `work/02-skills-v2/`, implementing SPACE-02 from [`docs/backlog.md`](../../docs/backlog.md).

Companion artefacts:

- Sprint-scope TDD design: [`./design.md`](design.md)
- Artefact-model design (normative): [`docs/design/space-artefact-model.md`](../../docs/design/space-artefact-model.md)
- Package under change: [`packages/skills/`](../../packages/skills/)
- Cart exemplar (validation target): `storefront-space/domain/cart/` and `storefront-space/work/cart/`

## 1. Summary

- **Epic.** SPACE-02 -- Space v2 artefact model: skill changeset (P0)
- **Phase.** Next (see [`docs/roadmap.md`](../../docs/roadmap.md))
- **Priority.** P0
- **Estimate.** 29 points across 9 stories

**Scope.** Implement the P0 changeset from `docs/design/space-artefact-model.md` §7.1. Add two new skills (`write-solution`, `write-contracts`), refactor three skills (`write-product`, `write-backlog`, `design`→`write-wp-design`), enrich frontmatter on all 14 skills, rewrite every description to Anthropic skill-creator rules, add negative-constraint template blocks, and release `@daddia/skills@0.3.0` validated against the cart exemplar.

**Out of scope (this WP).** `space-index` router skill, role views, profiles, CI description eval loop, `pnpm lint:docs`, `plan-delivery`, `refine-docs`, publish pipeline commands, `storefront-space` legacy-domain migration. Those are SPACE-03 and beyond.

**Deliverables.** See [`./design.md`](design.md) §3 for the exhaustive file list.

**Dependencies.** `@daddia/skills@0.2.x` baseline is stable (SPACE-01 closed). The cart exemplar in `storefront-space` (`domain/cart/`, `work/cart/01-foundations/`, `work/cart/02-add-to-cart/`) is the primary template-quality reference.

**Downstream consumers.** SPACE-03 consumes the `produces`/`consumes` frontmatter fields this WP introduces to build the `space-index` router. Consuming workspaces pick up v2 skills on `pnpm update @daddia/skills`.

## 2. Conventions

| Convention | Value |
| --- | --- |
| Story ID | `SPACE-02-{nn}` (e.g. `SPACE-02-01`) |
| Status | Not started, In progress, In review, Done, Blocked |
| Priority | P0, P1, P2 |
| Estimation | Fibonacci story points |
| Acceptance format | EARS + Gherkin per `docs/design/space-artefact-model.md` §5.3 |
| Test framework | Vitest (frontmatter schema tests) |
| Lint | `bin/lint-skills.js` structural lint, extended this sprint |

## 3. Stories

### Stream 1 -- New skills

- [x] **[SPACE-02-01] `write-solution` skill (stub + full modes)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 5
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:architecture, type:new-skill
  - **Depends on:** -
  - **Deliverable:** New skill directory `packages/skills/write-solution/` with `SKILL.md`, `template-stub.md`, `template-full.md`, and two example files. Produces `domain/{d}/solution.md` (or `docs/solution.md` for platform scope). Stub mode fills §1 Context + §2 Quality goals only; full mode fills all ten arc42-lite sections plus §11 Graduation candidates.
  - **Design:** [`./design.md#41-write-solution-new`](design.md#41-write-solution-new)
  - **Acceptance (EARS):**
    - WHEN the skill is invoked with `--stage stub`, THE SYSTEM SHALL produce a solution.md with §1 and §2 filled and §3–11 scaffolded as headings with `[NEEDS CLARIFICATION]`.
    - WHEN the skill is invoked with `--stage full`, THE SYSTEM SHALL produce a solution.md with all eleven sections populated from the provided context.
    - THE SYSTEM SHALL add a `<!-- DO NOT INCLUDE -->` block to both templates listing: commercial rationale, target segments, strategic thesis, positioning, user quotes.
    - THE SYSTEM SHALL include `artefact`, `phase`, `role`, `consumes`, `produces` in the SKILL.md frontmatter per the v2 schema.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for the new `write-solution` directory.
    - THE SYSTEM SHALL include two example files: one platform-scope (`space-solution.md`) and one domain-scope (`cart-solution.md`).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Stub mode produces a Phase 0 anchor
      Given a product.md and architecture principles as input
      When write-solution is invoked with --stage stub
      Then the output has ## 1. Context and scope filled
      And ## 2. Quality goals and constraints filled
      And all other sections show [NEEDS CLARIFICATION]
      And the file is <=2 pages

    Scenario: Full mode produces a complete arc42-lite doc
      Given a walking-skeleton design.md and emergent ADRs as input
      When write-solution is invoked with --stage full
      Then the output has all eleven sections populated
      And no section contains [NEEDS CLARIFICATION]
      And the file is between 8 and 12 pages
    ```

- [x] **[SPACE-02-02] `write-contracts` skill (executable template)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:architecture, type:new-skill
  - **Depends on:** SPACE-02-01 (to confirm solution.md section references)
  - **Deliverable:** New skill directory `packages/skills/write-contracts/` with `SKILL.md`, `template.md` (index + executable TypeScript code fences), and one example file (`cart-contracts.md` pointing at `storefront-space/domain/cart/contracts.md`).
  - **Design:** [`./design.md#42-write-contracts-new`](design.md#42-write-contracts-new)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL produce a `contracts.md` containing only executable TypeScript / Zod / OpenAPI code fences and one worked example per contract.
    - THE SYSTEM SHALL add a `<!-- DO NOT INCLUDE -->` block prohibiting prose shape descriptions, business rationale, and implementation patterns.
    - WHEN a consumer of the skill tries to add narrative prose describing a type, THE SYSTEM SHALL NOT include it (quality rule enforced at generation time via the negative-constraint block).
    - THE SYSTEM SHALL include `artefact`, `consumes: [solution.md]`, `produces: [contracts.md]` in the SKILL.md frontmatter.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for the new `write-contracts` directory.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Output contains no prose shape descriptions
      Given a solution.md with BFF types section
      When write-contracts produces contracts.md
      Then every type definition is in a typescript code fence
      And no section contains prose-only descriptions of what the type means
      And each contract section has at least one worked example

    Scenario: Index page links to source files
      Given a contracts.md index and contracts/*.ts source files
      When a developer opens contracts.md
      Then each section links to its corresponding source file
    ```

### Stream 2 -- Refactored skills

- [x] **[SPACE-02-03] `write-product` refactor (pitch + product modes)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:product, type:refactor
  - **Depends on:** -
  - **Deliverable:** `packages/skills/write-product/SKILL.md` evolved with mode param, v2 frontmatter, rewritten description. `template.md` split into `template-pitch.md` (Shape Up, ≤2pp) and `template-product.md` (extended, ≤5pp). Both templates gain `<!-- DO NOT INCLUDE -->` blocks. Two new example files added (`space-product.md`, `cart-product.md` updated).
  - **Design:** [`./design.md#43-write-product-refactor`](design.md#43-write-product-refactor)
  - **Acceptance (EARS):**
    - WHEN invoked with `--stage pitch`, THE SYSTEM SHALL produce a product.md containing only: Problem / Appetite / Sketch / Rabbit holes / No-gos (≤2 pages).
    - WHEN invoked with `--stage product`, THE SYSTEM SHALL produce a product.md with all pitch sections plus Target users / Outcome metrics / Product principles / Stakeholders / Relationship (≤5 pages for a domain sub-product).
    - THE SYSTEM SHALL add a `<!-- DO NOT INCLUDE -->` block to both templates listing: file paths, API names, tech stack, ADR numbers, component names.
    - THE SYSTEM SHALL rewrite the `description` field to 200–500 chars with at least two trigger phrases and one explicit neighbour disambiguation.
    - THE SYSTEM SHALL keep the legacy `template.md` file as an alias pointing at `template-product.md` for one release to avoid breaking existing workspace customisations.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for `write-product`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Pitch mode output passes the non-technical-stakeholder test
      Given a problem statement and appetite as input
      When write-product is invoked with --stage pitch
      Then the output contains no file paths, API names, or tech stack references
      And the output is readable by a non-technical stakeholder without a glossary
      And the file is at most 2 pages

    Scenario: Product mode output extends pitch without tech content
      Given a pitch-stage product.md plus user research and outcome metrics
      When write-product is invoked with --stage product
      Then the output extends the five pitch sections with five additional sections
      And no section contains tech stack names, ADR references, or component names
    ```

- [x] **[SPACE-02-04] `write-backlog` refactor (phase-1 default + EARS+Gherkin)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:engineering, type:refactor
  - **Depends on:** -
  - **Deliverable:** `packages/skills/write-backlog/SKILL.md` evolved with v2 frontmatter, phase-1-only default behaviour, rewritten description. `template-domain.md` updated to produce phase-1 epics by default (later phases as single-line placeholders). `template-work-package.md` updated to enforce the canonical EARS + Gherkin story schema from `artefact-model.md` §5.3. Two new example files added.
  - **Design:** [`./design.md#44-write-backlog-refactor`](design.md#44-write-backlog-refactor)
  - **Acceptance (EARS):**
    - WHEN invoked at domain scope without `--depth full`, THE SYSTEM SHALL produce a backlog where Now-phase epics have full detail and later-phase epics are single-line placeholders.
    - WHEN invoked at domain scope with `--depth full`, THE SYSTEM SHALL produce a backlog with full epic detail for all phases.
    - WHEN invoked at work-package scope, THE SYSTEM SHALL produce a backlog where every story has the required schema fields: Status, Priority, Estimate, Epic, Labels, Depends on, Deliverable, Design, Acceptance (EARS), Acceptance (Gherkin).
    - THE SYSTEM SHALL rewrite the `description` field to Anthropic rules with at least two trigger phrases and neighbour disambiguation against `write-roadmap`.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for `write-backlog`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Domain scope defaults to phase-1 epics only
      Given a product.md and roadmap.md covering three phases
      When write-backlog is invoked at domain scope without --depth full
      Then only Now-phase epics have full Scope / Key deliverables / Dependencies entries
      And Next-phase and Later-phase epics are single rows in the epic table marked as placeholders

    Scenario: Work-package story has all required schema fields
      Given a domain backlog with one epic and a design.md for the WP
      When write-backlog is invoked at work-package scope
      Then every story block in the output has: Status, Priority, Estimate, Epic, Labels, Depends on, Deliverable, Design, and both EARS and Gherkin acceptance sections
    ```

- [x] **[SPACE-02-05] `write-wp-design` skill (rename + walking-skeleton + TDD modes)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:engineering, type:refactor
  - **Depends on:** SPACE-02-01 (solution.md section references used in TDD template)
  - **Deliverable:** New directory `packages/skills/write-wp-design/` with `SKILL.md`, `template-walking-skeleton.md`, `template-tdd.md`, two example files. Legacy `packages/skills/design/SKILL.md` updated to a one-line alias pointing at `write-wp-design`. Both new templates gain `<!-- DO NOT INCLUDE -->` blocks.
  - **Design:** [`./design.md#45-write-wp-design-rename--split-was-design`](design.md#45-write-wp-design-rename--split-was-design)
  - **Acceptance (EARS):**
    - WHEN invoked with `--mode walking-skeleton`, THE SYSTEM SHALL produce a design.md with six sections: slice description, files shipped, acceptance gates, what was not delivered, open questions closed, handoff.
    - WHEN invoked with `--mode tdd`, THE SYSTEM SHALL produce a design.md with sections: scope, architecture fit (referencing `solution.md`), files/components, data contracts (code fences), runtime view, error paths, observability, testing strategy, acceptance gates, handoff, open questions.
    - THE SYSTEM SHALL add a `<!-- DO NOT INCLUDE -->` block prohibiting: domain-wide patterns already in `solution.md`, business rationale, phase sequencing, story-level AC.
    - THE SYSTEM SHALL leave `packages/skills/design/SKILL.md` in place as an alias (directing callers to use `write-wp-design`) for backward compatibility.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for both `write-wp-design` and the alias `design`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Walking-skeleton mode produces a foundation-sprint design
      Given an epic scope description and a list of files to create
      When write-wp-design is invoked with --mode walking-skeleton
      Then the output is between 2 and 4 pages
      And section 2 "Files shipped" lists every file with NEW/EVOLVE/KEEP labels
      And section 3 "Acceptance gates" has end-to-end path, observability, error-path, and quality-gate subsections
      And the output contains no detailed sequence diagrams or TDD-scope content

    Scenario: TDD mode references solution.md instead of redefining patterns
      Given a solution.md for the domain and the epic scope
      When write-wp-design is invoked with --mode tdd
      Then every cross-cutting pattern (error handling, observability, rollout) cites solution.md by section
      And no section re-narrates a pattern already defined in solution.md
    ```

### Stream 3 -- Cross-cutting

- [x] **[SPACE-02-06] Enriched frontmatter on all 14 skills**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:engineering, type:cross-cutting
  - **Depends on:** SPACE-02-01 (to confirm frontmatter values for write-solution, write-contracts)
  - **Deliverable:** `SKILL.md` in all 14 skill directories gains the v2 frontmatter fields: `artefact`, `phase`, `role`, `domain`, `stage`, `consumes`, `produces`, `prerequisites`, `related`, `tags`, `owner`. Values per the mapping table in `design.md` §4.6.
  - **Design:** [`./design.md#46-enriched-frontmatter-all-14-skills`](design.md#46-enriched-frontmatter-all-14-skills)
  - **Acceptance (EARS):**
    - WHEN `bin/lint-skills.js` runs against all skill directories, THE SYSTEM SHALL pass frontmatter validation for all 14 skills.
    - THE SYSTEM SHALL verify that every skill has non-empty `artefact`, `phase`, `role`, `produces` fields.
    - THE SYSTEM SHALL verify that skills with a `consumes` field list artefacts that are produced by other skills in the package (no dangling references).
    - WHEN a downstream tool reads `produces` across all SKILL.md files, THE SYSTEM SHALL be able to reconstruct the full handoff graph deterministically.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Handoff graph is reconstructable from frontmatter
      Given all 14 SKILL.md files with v2 frontmatter
      When a tool reads the consumes and produces fields for every skill
      Then a directed acyclic graph of skill dependencies can be constructed without ambiguity
      And every skill that declares a consumes value points at an artefact produced by at least one other skill

    Scenario: Lint passes for every skill
      Given all 14 SKILL.md files after this story
      When bin/lint-skills.js runs
      Then zero errors are reported
      And all required v2 frontmatter fields are present on every skill
    ```

- [x] **[SPACE-02-07] Description rewrites on all 14 skills**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 5
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:engineering, type:cross-cutting
  - **Depends on:** SPACE-02-06 (frontmatter must be complete so description mirrors the right fields)
  - **Deliverable:** `description` field in all 14 `SKILL.md` files rewritten to Anthropic skill-creator rules: third-person, verb-ing, ≥2 literal trigger phrases, ≥1 explicit neighbour disambiguation, artefact name verbatim, 200–500 chars. The new descriptions mirror `artefact`, `phase`, and `role` values in natural language.
  - **Design:** [`./design.md#47-description-authoring-rules-applied-to-all-14-skills`](design.md#47-description-authoring-rules-applied-to-all-14-skills)
  - **Acceptance (EARS):**
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL assert every `description` field is between 200 and 500 characters.
    - THE SYSTEM SHALL assert every description contains at least one sentence in third-person, verb-ing form.
    - THE SYSTEM SHALL assert every description mentions the output artefact name verbatim (e.g. `product.md`, `solution.md`, `backlog.md`, `design.md`).
    - THE SYSTEM SHALL assert every description contains at least one `Do NOT use` neighbour disambiguation clause.
    - THE SYSTEM SHALL assert no description is identical to or a trivial edit of another (no collision risk in the skill router).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: write-product description triggers on correct user phrases
      Given the rewritten write-product description
      When an LLM agent sees "write the product doc for the checkout domain"
      Then write-product is selected over write-backlog, write-roadmap, and write-solution

    Scenario: write-solution description correctly disambiguates from write-product
      Given the rewritten write-solution description
      When an LLM agent sees "write the architecture for the cart"
      Then write-solution is selected over write-product
      And the description includes a Do NOT use clause pointing at write-product for business strategy

    Scenario: All descriptions pass the 200-500 char lint
      Given all 14 SKILL.md files with rewritten descriptions
      When bin/lint-skills.js runs the description-length check
      Then zero skills fail the check
    ```

- [x] **[SPACE-02-08] Negative-constraint template blocks (remaining 10 skills)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 2
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:engineering, type:cross-cutting
  - **Depends on:** SPACE-02-03 (pattern established by write-product)
  - **Deliverable:** The 10 skills not covered by SPACE-02-01 through SPACE-02-05 (`write-adr`, `write-roadmap`, `write-metrics`, `plan-adr`, `review-adr`, `review-code`, `review-docs`, `validate`, `create-mr`, `requirements`) each have a `<!-- DO NOT INCLUDE -->` HTML comment added to the top of every `template*.md` they ship. For the 5 skills with no template file, the SKILL.md gains a `## Negative constraints` section instead.
  - **Design:** [`./design.md#48-negative-constraint-blocks-remaining-10-skills`](design.md#48-negative-constraint-blocks-remaining-10-skills)
  - **Acceptance (EARS):**
    - WHEN a skill has a `template*.md` file, THE SYSTEM SHALL include a `<!-- DO NOT INCLUDE -->` HTML comment at the top of every such template.
    - WHEN a skill has no template file, THE SYSTEM SHALL include a `## Negative constraints` section in its `SKILL.md` body listing what the skill's output must not contain.
    - THE SYSTEM SHALL NOT include the negative-constraint comment in any skill's generated output (it is a generator directive, not content).
    - WHEN `pnpm lint:docs` runs in SPACE-03, the assertion "no output artefact contains `<!-- DO NOT INCLUDE -->`" SHALL pass against the `storefront-space` cart exemplar (which was produced before this WP and does not contain such comments).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Every template file has a negative-constraint block
      Given all template*.md files in packages/skills/ after this story
      When each file is read
      Then the first non-YAML-frontmatter content is an HTML comment starting with DO NOT INCLUDE
      And the comment lists at least two specific content types to exclude with a destination pointer

    Scenario: Cart exemplar does not contain negative-constraint blocks
      Given the existing storefront-space domain/cart/ and work/cart/ files
      When each file is scanned for DO NOT INCLUDE
      Then zero matches are found
      And this confirms that negative-constraint blocks are a generator directive only
    ```

### Stream 4 -- Release and validation

- [x] **[SPACE-02-09] Release `@daddia/skills@0.3.0` and validate against cart exemplar**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 2
  - **Epic:** SPACE-02 | **Labels:** phase:next, domain:engineering, type:release
  - **Depends on:** SPACE-02-01, SPACE-02-02, SPACE-02-03, SPACE-02-04, SPACE-02-05, SPACE-02-06, SPACE-02-07, SPACE-02-08
  - **Deliverable:** `@daddia/skills@0.3.0` published to npm. `CHANGELOG.md` updated. One human validation session in `storefront-space` confirming `write-product`, `write-solution`, `write-backlog`, and `write-wp-design` produce outputs matching the cart exemplar without substantive manual editing.
  - **Design:** [`./design.md#5-release-and-validation`](design.md#5-release-and-validation)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL update `packages/skills/package.json` version to `0.3.0` and `CHANGELOG.md` with the v0.3.0 entry.
    - WHEN `pnpm validate` runs from the monorepo root, THE SYSTEM SHALL pass with zero errors (install, build, typecheck, lint, test).
    - THE SYSTEM SHALL publish `@daddia/skills@0.3.0` to the npm registry.
    - WHEN `write-product --stage product` is invoked in `storefront-space` using `domain/cart/` context as input, THE SYSTEM SHALL produce a product.md that a human reviewer confirms requires no substantive edits to match the `domain/cart/product.md` exemplar.
    - WHEN `write-solution --stage full` is invoked using `work/cart/01-foundations/design.md` + ADRs as input, THE SYSTEM SHALL produce a solution.md that a human reviewer confirms is structurally equivalent to `domain/cart/solution.md`.
    - WHEN `write-wp-design --mode tdd` is invoked for the CART02 epic, THE SYSTEM SHALL produce a design.md that a human reviewer confirms is structurally equivalent to `work/cart/02-add-to-cart/design.md`.
    - THE SYSTEM SHALL leave a `design/` alias SKILL.md in place directing callers to `write-wp-design`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Release passes full monorepo validation
      Given all SPACE-02 stories complete
      When pnpm validate runs from the monorepo root
      Then the command exits with code 0
      And packages/skills/package.json shows version 0.3.0

    Scenario: write-solution produces a structurally complete solution.md
      Given work/cart/01-foundations/design.md and the cart ADRs as input in a storefront-space session
      When write-solution is invoked with --stage full
      Then the output has all eleven sections
      And a human reviewer confirms no substantive edits are required
      And the output is accepted as the reference for the cart domain solution

    Scenario: Backward-compatible alias for legacy design skill name
      Given the alias SKILL.md in packages/skills/design/
      When a workspace that uses the old "design" skill name runs space sync skills
      Then the alias SKILL.md is copied to skills/design/SKILL.md in the workspace
      And the alias directs the agent to use write-wp-design instead
    ```

## 4. Traceability

### Stories to artefact-model sections

| Story | `docs/design/space-artefact-model.md` section |
| --- | --- |
| SPACE-02-01 | §4.7 solution.md stub vs full; §7.1 (add write-solution) |
| SPACE-02-02 | §4.4 contracts OWN column; §7.1 (add write-contracts) |
| SPACE-02-03 | §4.5 product.md negative constraints; §4.6 pitch vs product; §7.1 (refactor write-product) |
| SPACE-02-04 | §4.8 roadmap/backlog temporal seam; §5.3 WP backlog schema; §7.1 (refactor write-backlog) |
| SPACE-02-05 | §5.1 two-tier design; §5.2 walking-skeleton vs TDD; §7.1 (split design) |
| SPACE-02-06 | §3.2 enriched frontmatter; §6.4 field mapping |
| SPACE-02-07 | §3.3 description authoring rules |
| SPACE-02-08 | §4.5 negative constraints per artefact |
| SPACE-02-09 | §8 migration plan Phase A (land v2 skills) |

### Stories to product outcomes

| Story | Outcome (from [`docs/product.md`](../../docs/product.md) §7) |
| --- | --- |
| SPACE-02-01 .. 05 | "Skills are versioned organisational knowledge -- installed like a dependency, updated like a dependency" |
| SPACE-02-01, 03, 04 | "Any team can stand up an agent-capable workspace from a single command" with correct docs produced |
| SPACE-02-06, 07 | "Skill improvements compound: a better requirements skill benefits every team on the next install" |
| SPACE-02-09 | "Agents operating in a space consistently produce higher-quality artefacts than agents operating without one" |

## 5. Definition of Done

A story in this backlog is done when:

- [ ] All EARS acceptance statements hold and every Gherkin scenario passes.
- [ ] `pnpm validate` passes from the monorepo root (install, build, typecheck, lint, test).
- [ ] `bin/lint-skills.js` passes with zero errors for affected skill directories.
- [ ] Description length is 200–500 chars for any SKILL.md touched.
- [ ] Frontmatter has all required v2 fields for any SKILL.md touched.
- [ ] Changeset created (`pnpm changeset`) for any change to `packages/skills/`.
- [ ] PR merged into `main`.

The epic (SPACE-02) is done when every story is done **and** `@daddia/skills@0.3.0` is published and the human validation session in `storefront-space` passes.

## 6. Dependency graph

```text
SPACE-02-01 (write-solution) ---+
                                 |
SPACE-02-02 (write-contracts) ---+
                                 |
SPACE-02-03 (write-product)      +---> SPACE-02-06 (frontmatter)
                                 |           |
SPACE-02-04 (write-backlog)      |           v
                                 |     SPACE-02-07 (descriptions)
SPACE-02-05 (write-wp-design) ---+           |
                                             v
                                       SPACE-02-08 (neg-constraints)
                                             |
                                             v
                                       SPACE-02-09 (release + validate)
```

SPACE-02-01 through SPACE-02-05 can run in parallel (Streams 1 and 2). SPACE-02-06 depends on 01–05 being complete so that frontmatter values for the new skills are known. SPACE-02-07 depends on 06 so that descriptions mirror the correct frontmatter. SPACE-02-08 and SPACE-02-09 are sequential blockers.

## 7. Risks (delivery-scoped)

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Description rewrites trigger latent routing collisions among skills with similar purposes | Medium | Medium | Write each description against the disambiguation rule (explicit `Do NOT use` clause); human review of all 14 together before 09 |
| R2 | Splitting `design` to `write-wp-design` breaks existing workspace SKILL.md references | Low | Low | Backward-compatible alias `design/SKILL.md` left in place for one release |
| R3 | Cart exemplar drifts before SPACE-02-09 validation runs | Low | Low | Exemplar docs are committed to `storefront-space` and do not change during this sprint |
| R4 | `pnpm changeset` workflow not followed for each story → version bump fails at release | Medium | Medium | Changesets per story are part of DoD; SPACE-02-09 is blocked if any prior story has no changeset |

## 8. Handoff

When SPACE-02 closes:

- `@daddia/skills@0.3.0` is published with two new skills and three refactored skills.
- All 14 skills have v2 frontmatter enabling `space-index` router construction.
- All 14 skills have Anthropic-format descriptions.
- All templates have negative-constraint blocks.
- The cart exemplar has been validated against the new skills.
- The `design/` alias SKILL.md is in place for backward compatibility.

Next work packages:

1. [`work/03-v2-tooling/`](../03-v2-tooling/) -- SPACE-03: `space-index` router, role views, profiles, description eval loop in CI, `pnpm lint:docs`, `plan-delivery`, `refine-docs`.
2. [`work/04-publish-jira/`](../04-publish-jira/) -- SPACE-04: `space publish jira`.
