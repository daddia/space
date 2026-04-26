---
type: Backlog
scope: work-package
work_package: 03-tooling-v2
epic: SPACE-03
product: space
version: "0.1"
owner: Horizon Platform
status: Draft
last_updated: 2026-04-26
sources:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
  - docs/design/space-artefact-model.md
  - docs/work/03-tooling-v2/design.md
---

# Backlog -- Space v2 Tooling and Router (SPACE-03)

Sprint-level backlog for the **Space v2 artefact model: tooling and router** work package at
`docs/work/03-tooling-v2/`, implementing SPACE-03 from
[`docs/backlog.md`](../../docs/backlog.md).

Companion artefacts:

- Sprint-scope TDD design: [`./design.md`](design.md)
- Artefact-model design (normative): [`docs/design/space-artefact-model.md`](../../docs/design/space-artefact-model.md)
- Packages under change: [`packages/skills/`](../../packages/skills/), [`packages/space/`](../../packages/space/)
- Validation target: `storefront-space` (post-release session)

## 1. Summary

- **Epic.** SPACE-03 -- Space v2 artefact model: tooling and router
- **Phase.** Next (see [`docs/roadmap.md`](../../docs/roadmap.md))
- **Priority.** P1
- **Estimate.** 23 points across 9 stories

**Scope.** Implement the P1 tooling row of `docs/design/space-artefact-model.md` §7.2. Add the `space-index` router meta-skill with a CI-generated body table; generate role views (`pm.md`, `architect.md`, `engineer.md`); add four profile YAMLs; implement `space sync skills --profile X`; add the description eval loop in CI; add `pnpm lint:docs` (eight structural checks); and ship the `plan-delivery` and `refine-docs` skills. Release `@tpw/skills@0.4.0` validated against `storefront-space`.

**Out of scope (this work package).** `space publish jira` / `space publish confluence` (SPACE-04 / SPACE-05). Retiring `write-requirements` from the default profile or marking deferred skills as `stage: deferred` (SPACE-09 or a follow-on PR). `--profile` flag on `create-space` (SPACE-10). MADR-format individual ADR files (SPACE-09). Seeding the eval query set from real `storefront-space` transcripts (later sprint). See [`docs/product.md`](../../docs/product.md) §5 and [`docs/roadmap.md`](../../docs/roadmap.md) §Later for the full no-go list.

**Deliverables.** See [`./design.md`](design.md) §3 for the exhaustive file list.

**Dependencies.** SPACE-02 done (`@tpw/skills@0.3.0` published; all 14 skills have v2 frontmatter; descriptions are in Anthropic format). `storefront-space` available as the validation workspace.

**Downstream consumers.** SPACE-04 (`space publish jira`) depends on the `story-AC-schema` lint that this WP enforces. SPACE-10 (workspace profiles at scaffold) depends on the profile YAMLs this WP ships. Consumer workspaces pick up the four new skills and `space sync skills` on `pnpm update @tpw/skills`.

## 2. Conventions

| Convention        | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| Story ID          | `SPACE-03-{nn}` (e.g. `SPACE-03-01`)                           |
| Status            | Not started, In progress, In review, Done, Blocked              |
| Priority          | P0, P1, P2                                                      |
| Estimation        | Fibonacci story points                                          |
| Acceptance format | EARS + Gherkin per `docs/design/space-artefact-model.md` §5.3  |
| Test framework    | Vitest (unit + snapshot); shell (integration)                   |
| Lint              | `bin/lint-skills.js` (skills); `scripts/lint-docs.js` (docs)   |

## 3. Stories

### Stream 1 -- Skill index and view generators

- [ ] **[SPACE-03-01] `space-index` router skill and `generate-index.js`**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:skills, type:new-skill
  - **Depends on:** -
  - **Deliverable:** New skill directory `packages/skills/space-index/` with `SKILL.md` (v2 frontmatter; static description; CI-generated body table between sentinel markers) and `template.md` (source-of-truth template the generator fills in). New generator `packages/skills/bin/generate-index.js` that walks all `packages/skills/*/SKILL.md` frontmatter, builds the body table, and writes it between the `<!-- BEGIN GENERATED -->` / `<!-- END GENERATED -->` sentinels in `space-index/SKILL.md`. A husky pre-push hook and CI step enforce that committed output is never stale.
  - **Design:** [`./design.md#space-index-router-skill-with-ci-regenerated-body-space-03-01`](design.md#13-capabilities-this-work-package-delivers)
  - **Acceptance (EARS):**
    - WHEN `pnpm generate:index` runs, THE SYSTEM SHALL walk all `packages/skills/*/SKILL.md` files and write the generated table into `space-index/SKILL.md` between the `<!-- BEGIN GENERATED -->` and `<!-- END GENERATED -->` sentinel markers.
    - THE SYSTEM SHALL exclude skills with `stage: deprecated` from the generated table.
    - WHEN the committed `space-index/SKILL.md` matches the generator output, THE SYSTEM SHALL exit 0; WHEN the output differs, THE SYSTEM SHALL exit 1 and print "Generated file out of date — run pnpm generate:index locally".
    - THE SYSTEM SHALL include `artefact`, `phase`, `role`, `stage: stable`, `consumes`, `produces` in the `space-index/SKILL.md` frontmatter per the v2 schema.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for the `space-index` skill directory with zero errors.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Generator populates the index table with all stable skills
      Given 17 SKILL.md files in packages/skills/ with stage: stable
      And one SKILL.md with stage: deprecated (the design alias)
      When pnpm generate:index runs
      Then space-index/SKILL.md contains a table with 17 rows
      And no row corresponds to the deprecated design alias

    Scenario: Stale committed output fails CI
      Given space-index/SKILL.md body was generated before a new skill was added
      When the CI step runs pnpm generate:index
      Then the command exits with code 1
      And the output includes "Generated file out of date — run pnpm generate:index locally"
    ```

- [ ] **[SPACE-03-02] Role views and `generate-views.js`**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:skills, type:generator
  - **Depends on:** -
  - **Deliverable:** New generator `packages/skills/bin/generate-views.js` that reads all `SKILL.md` frontmatter and writes three role-filtered Markdown tables: `packages/skills/views/pm.md`, `views/architect.md`, `views/engineer.md`. Each file contains a header and a generated table of skills whose `role` array includes the target role. A CI step enforces freshness with the same stale-detection pattern as `generate-index`.
  - **Design:** [`./design.md#role-views-pmmdarchimdengineermd-space-03-02`](design.md#13-capabilities-this-work-package-delivers)
  - **Acceptance (EARS):**
    - WHEN `pnpm generate:views` runs, THE SYSTEM SHALL write `views/pm.md`, `views/architect.md`, and `views/engineer.md` each containing a table of skills filtered by the `role` frontmatter field (case-sensitive).
    - THE SYSTEM SHALL exclude skills with `stage: deprecated` from all role views.
    - WHEN a skill has `role` containing `pm` or `founder`, THE SYSTEM SHALL include it in `views/pm.md`.
    - WHEN the committed view files match the generator output, THE SYSTEM SHALL exit 0; WHEN any view file differs, THE SYSTEM SHALL exit 1 with "Generated file out of date — run pnpm generate:views locally".
    - THE SYSTEM SHALL ensure every stable skill appears in at least one of the three role views.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: engineer.md contains only skills with the engineer role
      Given a fixture set of 3 SKILL.md files:
        one with role [engineer], one with role [pm], one with role [architect, engineer]
      When pnpm generate:views runs
      Then views/engineer.md contains exactly two rows
      And the skill with role [pm] is absent from views/engineer.md

    Scenario: Every stable skill appears in at least one view
      Given all packages/skills/*/SKILL.md files with v2 frontmatter after SPACE-03
      When pnpm generate:views runs
      Then every skill with stage: stable appears in pm.md, architect.md, or engineer.md
    ```

### Stream 2 -- Skill profiles and sync command

- [ ] **[SPACE-03-03] Profile YAMLs**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:skills, type:config
  - **Depends on:** SPACE-03-01, SPACE-03-07, SPACE-03-08 (skills must exist to be listed)
  - **Deliverable:** Four profile YAML files at `packages/skills/profiles/`: `minimal.yaml` (implement, review-code, create-mr, write-adr), `domain-team.yaml` (adds write-product, write-solution, write-backlog, write-contracts, write-wp-design, plan-delivery, refine-docs), `platform.yaml` (adds plan-adr, review-adr, space-index), `full.yaml` (all stable skills). Schema: `name` and `skills` required; `description` optional. The lint step asserts all skill names resolve to an existing directory and have `stage: stable`.
  - **Design:** [`./design.md#41-profile-yaml-schema`](design.md#41-profile-yaml-schema)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL add four profile YAML files at `packages/skills/profiles/` matching the skill lists in `design.md §4.1`.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL validate that every skill name in each profile YAML matches an existing directory under `packages/skills/`.
    - THE SYSTEM SHALL assert all skill entries in every profile have `stage: stable`.
    - THE SYSTEM SHALL require `name` and `skills` as mandatory fields in each profile YAML.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: minimal.yaml references exactly the four foundation skills
      Given packages/skills/profiles/minimal.yaml is loaded
      When the skills array is read
      Then it contains exactly implement, review-code, create-mr, and write-adr
      And all four directories exist under packages/skills/

    Scenario: full.yaml references all stable skills
      Given packages/skills/profiles/full.yaml is loaded
      When the skills array is compared to packages/skills/ directories with stage: stable
      Then every stable skill directory is present in the skills array
    ```

- [ ] **[SPACE-03-04] `space sync skills --profile X`**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:space-cli, type:feature
  - **Depends on:** SPACE-03-03
  - **Deliverable:** New `sync skills [--profile X]` subcommand in `packages/space/src/commands/sync.ts`. The command: (1) resolves the profile from `--profile` flag → `.space/profile.yaml` → `full` default; (2) reads the profile YAML from `node_modules/@tpw/skills/profiles/{name}.yaml`; (3) writes a transient `.space/.skill-filter.json`; (4) invokes the existing `sync-skills` bin; (5) deletes `.space/.skill-filter.json` in a finally block. The updated `sync-skills` reads `.space/.skill-filter.json` when present and skips skills not in the list.
  - **Design:** [`./design.md#44-space-sync-skills-command-interface`](design.md#44-space-sync-skills-command-interface)
  - **Acceptance (EARS):**
    - WHEN `space sync skills --profile domain-team` is run, THE SYSTEM SHALL resolve the profile from `node_modules/@tpw/skills/profiles/domain-team.yaml`, write `.space/.skill-filter.json`, invoke `sync-skills`, then delete `.space/.skill-filter.json`.
    - WHEN no `--profile` flag is given and `.space/profile.yaml` exists, THE SYSTEM SHALL use `.space/profile.yaml` as the profile source.
    - WHEN neither `--profile` nor `.space/profile.yaml` is present, THE SYSTEM SHALL default to the `full` profile (all stable skills).
    - WHEN the named profile YAML is not found, THE SYSTEM SHALL exit non-zero with "Profile '{name}' not found in @tpw/skills/profiles/".
    - WHEN a skill name in the profile YAML does not match any directory in `@tpw/skills`, THE SYSTEM SHALL warn to stderr "Skill '{name}' listed in profile not found in source; skipped" and continue.
    - WHEN `sync-skills` fails, THE SYSTEM SHALL delete `.space/.skill-filter.json` in a finally block before exiting non-zero.
    - WHEN the sync succeeds, THE SYSTEM SHALL print "space: synced N skills (profile: {name})".
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Profile flag materialises only the profile's skills
      Given storefront-space has @tpw/skills installed
      When space sync skills --profile minimal is run
      Then exactly four skill directories exist in skills/: implement, review-code, create-mr, write-adr
      And no other @tpw/skills directories are added or removed
      And stdout prints "space: synced 4 skills (profile: minimal)"

    Scenario: Unknown profile name exits non-zero
      Given no profile named "custom-profile" exists in @tpw/skills/profiles/
      When space sync skills --profile custom-profile is run
      Then the command exits with code 1
      And stderr contains "Profile 'custom-profile' not found in @tpw/skills/profiles/"

    Scenario: skill-filter.json is cleaned up on sync-skills failure
      Given sync-skills throws during execution
      When space sync skills runs
      Then .space/.skill-filter.json does not exist after the command exits
    ```

### Stream 3 -- New skills

- [ ] **[SPACE-03-07] `plan-delivery` orchestrator skill**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:skills, type:new-skill
  - **Depends on:** -
  - **Deliverable:** New skill directory `packages/skills/plan-delivery/` with `SKILL.md` (v2 frontmatter; Phase-0 orchestrator description; step-by-step instructions for sequencing the five pre-sprint artefacts for a new domain) and `template.md` (structured delivery plan output). The skill is included in the `domain-team` and `platform` profiles.
  - **Design:** [`./design.md#plan-delivery-skill-space-03-07`](design.md#13-capabilities-this-work-package-delivers)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL add `packages/skills/plan-delivery/` with `SKILL.md` and `template.md` implementing the Phase-0 delivery orchestrator.
    - THE SYSTEM SHALL set `phase: discovery`, `stage: stable`, and include `role`, `consumes`, and `produces` in the frontmatter per the v2 schema.
    - THE SYSTEM SHALL write a `description` field of 200–500 characters containing at least two literal trigger phrases and one `Do NOT use` neighbour disambiguation.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for the `plan-delivery` skill directory with zero errors.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: plan-delivery is listed in the domain-team profile
      Given packages/skills/profiles/domain-team.yaml is loaded
      When the skills array is read
      Then plan-delivery is present
      And the directory packages/skills/plan-delivery/ exists

    Scenario: Lint passes for plan-delivery
      Given packages/skills/plan-delivery/SKILL.md with full v2 frontmatter
      When bin/lint-skills.js runs
      Then zero errors are reported for the plan-delivery directory
    ```

- [ ] **[SPACE-03-08] `refine-docs` sprint-end skill**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:skills, type:new-skill
  - **Depends on:** -
  - **Deliverable:** New skill directory `packages/skills/refine-docs/` with `SKILL.md` (v2 frontmatter; sprint-end refinement description; step-by-step instructions for promoting WP-local ADR candidates into `solution.md` and archiving superseded WP design sections) and `template.md` (structured refine session output). The skill is included in the `domain-team` and `platform` profiles.
  - **Design:** [`./design.md#refine-docs-sprint-end-skill-space-03-08`](design.md#13-capabilities-this-work-package-delivers)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL add `packages/skills/refine-docs/` with `SKILL.md` and `template.md` implementing the sprint-end docs promotion skill.
    - THE SYSTEM SHALL set `phase: delivery`, `stage: stable`, and include `role`, `consumes`, and `produces` in the frontmatter per the v2 schema.
    - THE SYSTEM SHALL write a `description` field of 200–500 characters containing at least two literal trigger phrases and one `Do NOT use` neighbour disambiguation that distinguishes `refine-docs` from `review-docs`.
    - WHEN `bin/lint-skills.js` runs, THE SYSTEM SHALL pass for the `refine-docs` skill directory with zero errors.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: refine-docs is listed in the domain-team profile
      Given packages/skills/profiles/domain-team.yaml is loaded
      When the skills array is read
      Then refine-docs is present
      And the directory packages/skills/refine-docs/ exists

    Scenario: Lint passes for refine-docs
      Given packages/skills/refine-docs/SKILL.md with full v2 frontmatter
      When bin/lint-skills.js runs
      Then zero errors are reported for the refine-docs directory
    ```

### Stream 4 -- CI and tooling

- [ ] **[SPACE-03-05] Description eval loop in CI**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:ci, type:tooling
  - **Depends on:** SPACE-03-01 (space-index must exist to be evaluated)
  - **Deliverable:** `scripts/eval-descriptions.py` (Anthropic SDK; evaluates each skill's description against the query set), `scripts/eval-queries.json` (seed set of ≥20 representative queries with `expected` skill names), and a CI step in the PR pipeline that runs the eval on any PR touching `packages/skills/*/SKILL.md`. The default `EVAL_THRESHOLD` is 0.75 for the first release; raised to 0.85 after one sprint of baseline data. The eval step is skipped on docs-only PRs.
  - **Design:** [`./design.md#54-ci-description-eval-loop-on-pr`](design.md#54-ci-description-eval-loop-on-pr)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL add `scripts/eval-queries.json` containing at least 20 representative queries, each mapping `query` to `expected` skill name.
    - WHEN `python scripts/eval-descriptions.py` runs, THE SYSTEM SHALL evaluate each skill's trigger rate across the query set (3 samples per skill) using the Anthropic API and output one JSON result line per skill.
    - WHEN any skill's `trigger_rate` is below `EVAL_THRESHOLD`, THE SYSTEM SHALL exit non-zero and report the failing skill and its trigger rate to stderr.
    - WHEN all skills meet or exceed the threshold, THE SYSTEM SHALL exit 0.
    - THE SYSTEM SHALL skip the eval CI step on PRs that touch only non-skill files.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Passing eval exits zero with per-skill results
      Given a valid ANTHROPIC_API_KEY in the CI environment
      And all skills have trigger_rate >= EVAL_THRESHOLD
      When python scripts/eval-descriptions.py runs
      Then the command exits with code 0
      And one JSON line per skill is printed to stdout with pass: true

    Scenario: Failing skill triggers a non-zero exit
      Given a SKILL.md whose description produces trigger_rate < EVAL_THRESHOLD
      When python scripts/eval-descriptions.py runs
      Then the command exits with code 1
      And stderr reports the skill name and its measured trigger_rate
    ```

- [ ] **[SPACE-03-06] `pnpm lint:docs` with eight structural checks**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:ci, type:tooling
  - **Depends on:** -
  - **Deliverable:** `scripts/lint-docs.js` implementing the eight checks from `docs/design/space-artefact-model.md §4.10` (`frontmatter-schema`, `link-check`, `budget`, `id-resolution`, `no-repeated-scope`, `negative-constraints`, `no-speculative-epic-ids`, `story-AC-schema`). Root `package.json` gains a `lint:docs` script. A CI step runs the check on any PR touching `docs/**` or `work/**`. The check passes with zero findings against the current committed `docs/` and `docs/work/` tree.
  - **Design:** [`./design.md#53-ci-pnpm-lintdocs-on-pr`](design.md#53-ci-pnpm-lintdocs-on-pr)
  - **Acceptance (EARS):**
    - WHEN `pnpm lint:docs` runs, THE SYSTEM SHALL execute `scripts/lint-docs.js` implementing all eight checks from `artefact-model.md §4.10`.
    - WHEN any finding is produced, THE SYSTEM SHALL exit 1 and print one line per finding in the format `[{check}] {file}: {message}`.
    - WHEN zero findings are produced, THE SYSTEM SHALL exit 0.
    - WHEN `pnpm lint:docs` runs against the committed `docs/` and `docs/work/` tree at the time SPACE-03 closes, THE SYSTEM SHALL produce zero findings.
    - THE SYSTEM SHALL add `"lint:docs": "node scripts/lint-docs.js"` to the root `package.json` scripts section.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Broken link produces a finding
      Given a Markdown file in docs/ with a [[path]] reference to a non-existent file
      When pnpm lint:docs runs
      Then the command exits with code 1
      And a finding is printed with check: link-check and the broken target path

    Scenario: WP backlog story missing a required field produces a finding
      Given a work-package backlog.md with a story that has no Acceptance (EARS) section
      When pnpm lint:docs runs
      Then a finding is printed with check: story-AC-schema and the offending story ID

    Scenario: Clean docs tree passes
      Given the committed docs/ and work/ files as they stand when SPACE-03 closes
      When pnpm lint:docs runs
      Then the command exits with code 0
      And zero findings are reported
    ```

### Stream 5 -- Release and validation

- [ ] **[SPACE-03-09] Release `@tpw/skills@0.4.0` and validate against `storefront-space`**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Epic:** SPACE-03 | **Labels:** phase:next, domain:release, type:release
  - **Depends on:** SPACE-03-01, SPACE-03-02, SPACE-03-03, SPACE-03-04, SPACE-03-05, SPACE-03-06, SPACE-03-07, SPACE-03-08
  - **Deliverable:** `packages/skills/package.json` bumped to `0.4.0`; `CHANGELOG.md` updated with the v0.4.0 entry; `@tpw/skills@0.4.0` published to npm. All ten acceptance gates in `design.md §10` confirmed before the tag is cut. One human validation session in `storefront-space` exercising `plan-delivery` and `refine-docs` against the cart exemplar and confirming `space sync skills --profile domain-team` materialises exactly 11 skill directories.
  - **Design:** [`./design.md#10-acceptance-gates`](design.md#10-acceptance-gates)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL update `packages/skills/package.json` to version `0.4.0` and add the v0.4.0 entry to `CHANGELOG.md`.
    - WHEN `pnpm validate` runs from the monorepo root, THE SYSTEM SHALL exit 0 (install, build, typecheck, lint, test all pass).
    - WHEN `pnpm lint:skills` runs, THE SYSTEM SHALL pass with zero errors across all 18 skills (14 existing + `space-index`, `plan-delivery`, `refine-docs`, plus `design` alias).
    - THE SYSTEM SHALL confirm all ten acceptance gates in `design.md §10` hold before the 0.4.0 tag is cut.
    - THE SYSTEM SHALL publish `@tpw/skills@0.4.0` to the npm registry.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Full monorepo validation passes before release
      Given all SPACE-03 stories are Done
      When pnpm validate runs from the monorepo root
      Then the command exits with code 0
      And packages/skills/package.json shows version 0.4.0

    Scenario: space-index body table includes all stable skills and excludes deprecated
      Given @tpw/skills@0.4.0 installed
      When space-index/SKILL.md body table is read
      Then it contains 17 rows (all stable skills including space-index, plan-delivery, refine-docs)
      And the deprecated design alias row is absent

    Scenario: storefront-space validation session passes
      Given @tpw/skills@0.4.0 installed in storefront-space
      When space sync skills --profile domain-team runs
      Then exactly 11 skill directories are materialised in skills/
      And a human reviewer confirms plan-delivery produces an accepted sequenced plan for the cart exemplar
    ```

## 4. Traceability

### Stories to solution sections

| Story        | `docs/solution.md` section                                                      |
| ------------ | ------------------------------------------------------------------------------- |
| SPACE-03-01  | §4.2 Level 2 -- @tpw/skills (skill directory layout the generators walk)        |
| SPACE-03-02  | §4.2 Level 2 -- @tpw/skills (published file patterns and sync-skills algorithm) |
| SPACE-03-03  | §6.1 Glossary (Profile definition); §7.6 Feature flags and stages               |
| SPACE-03-04  | §4.4 Level 2 -- @tpw/space (sync command group); §5.1 Install-time skill sync   |
| SPACE-03-05  | §7.4 Testing strategy -- @tpw/skills (description eval loop)                   |
| SPACE-03-06  | §8.2 CI/CD shape (per-PR checks: lint and docs lint)                            |
| SPACE-03-07  | §4.2 Level 2 -- @tpw/skills (skill directory layout and verb set)               |
| SPACE-03-08  | §4.2 Level 2 -- @tpw/skills (skill directory layout and verb set)               |
| SPACE-03-09  | §8.1 Build and release (changeset-driven; pnpm validate gate)                  |

### Stories to product outcomes

| Story                      | Outcome (from [`docs/product.md`](../../docs/product.md) §7)                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| SPACE-03-01, SPACE-03-02   | "Skill improvements adopted across teams without manual migration" (router lowers skill-finding friction) |
| SPACE-03-03, SPACE-03-04   | "Time from zero to a fully operational agent-ready workspace <= 30 minutes" (profile sync is one command) |
| SPACE-03-05                | "Cross-tool portability of skills — 100% of skills" (eval loop enforces routing quality across tools) |
| SPACE-03-06                | "Agents produce higher-quality artefacts in a space than outside one" (doc-lint enforces schema correctness that downstream publish depends on) |
| SPACE-03-07, SPACE-03-08   | "Agents produce higher-quality artefacts in a space than outside one" (plan-delivery + refine-docs close the Phase-0 and sprint-end loops) |
| SPACE-03-09                | "Horizon initiatives running current skill library version >= 80% within 30 days" (version bump + npm publish unlocks adoption) |

## 5. Definition of Done

A story in this backlog is done when:

- [ ] All EARS acceptance statements hold and every Gherkin scenario passes.
- [ ] `pnpm validate` passes from the monorepo root (install, build, typecheck, lint, test).
- [ ] `pnpm lint:skills` passes with zero errors for every skill directory touched.
- [ ] `pnpm lint:docs` passes with zero findings against `docs/` and `work/` (required from SPACE-03-06 onward).
- [ ] `pnpm generate:index && pnpm generate:views` produce no diff against committed output (required from SPACE-03-01 / SPACE-03-02 onward).
- [ ] Description length is 200–500 chars for any `SKILL.md` added or modified.
- [ ] Changeset created (`pnpm changeset`) for any change to `packages/skills/` or `packages/space/`.
- [ ] PR merged into `main`.

The epic (SPACE-03) is done when every story is done **and** `@tpw/skills@0.4.0` is published and all ten acceptance gates in [`./design.md §10`](design.md#10-acceptance-gates) are confirmed.

## 6. Dependency graph

```text
SPACE-03-01 (space-index + generate-index) ------+
                                                  |
SPACE-03-02 (role views + generate-views) --------+
                                                  |
SPACE-03-07 (plan-delivery skill) ----------------+---> SPACE-03-03 (profile YAMLs)
                                                  |           |
SPACE-03-08 (refine-docs skill) ------------------+           v
                                                        SPACE-03-04 (space sync skills)
SPACE-03-05 (eval loop) --------------------------+
                                                  |
SPACE-03-06 (lint:docs) --------------------------+---> SPACE-03-09 (release 0.4.0)
```

SPACE-03-01, SPACE-03-02, SPACE-03-05, SPACE-03-06, SPACE-03-07, and SPACE-03-08 are independent and can run in parallel. SPACE-03-03 depends on SPACE-03-01, SPACE-03-07, and SPACE-03-08 being complete so that all profile skill names resolve. SPACE-03-04 depends on SPACE-03-03. SPACE-03-09 is a sequential blocker that waits for all other stories.

## 7. Risks (work-package specific)

| ID  | Risk                                                                                         | Likelihood | Impact | Mitigation                                                                                         |
| --- | -------------------------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------- |
| R1  | Eval loop Python dependency conflicts with CI toolchain (monorepo is otherwise TypeScript)    | Medium     | Low    | Confirm Python is acceptable before scheduling SPACE-03-05; default is Python per `design.md §12.1` |
| R2  | Generator staleness enforcement requires CI write access to committed files                  | Low        | Medium | Option (a) from `design.md §12.2` is the default; confirm model before SPACE-03-01 starts         |
| R3  | `.space/.skill-filter.json` approach requires modifying `sync-skills` read path              | Low        | Low    | Transient file approach from `design.md §12.3` avoids changing the bin's CLI; confirm before SPACE-03-04 |
| R4  | `EVAL_THRESHOLD = 0.75` may still block merges if descriptions perform poorly at launch      | Medium     | Medium | Set threshold at 0.75 for first release; raise to 0.85 after one sprint of baseline data (`design.md §12.4`) |

Technical risks (Confluence sync volume, incremental Jira sync, publish mechanics) are in [`docs/solution.md`](../../docs/solution.md) §10.1 and are not repeated here.

## 8. Handoff

When SPACE-03 closes, the following are stable:

- `space-index` skill is live; the router body is auto-maintained by CI on every PR that touches `packages/skills/`.
- `views/pm.md`, `views/architect.md`, `views/engineer.md` are generated and kept fresh by CI.
- Four profile YAMLs (`minimal`, `domain-team`, `platform`, `full`) are published with `@tpw/skills@0.4.0`.
- `space sync skills --profile X` is the canonical way for workspaces to adopt a subset of skills.
- `pnpm lint:docs` enforces all eight structural checks; artefact violations block CI from this sprint onward.
- Description eval loop is in CI; description regressions are caught on every PR that touches a skill.
- `plan-delivery` and `refine-docs` are available for the next domain onboarding session.

Next work packages:

1. [`docs/work/04-publish-jira/`](../04-publish-jira/) -- SPACE-04: `space publish jira` (source-aware Markdown-to-Jira publish pipeline; can assume `story-AC-schema` lint is enforced from this WP).
2. [`docs/work/05-publish-conf/`](../05-publish-conf/) -- SPACE-05: `space publish confluence`.
