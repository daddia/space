---
type: Design
scope: work-package
mode: tdd
work_package: 03-tooling-v2
epic: SPACE-03
product: space
version: "0.1"
owner: Horizon Platform
status: Draft
last_updated: 2026-04-24
related:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
  - docs/design/space-artefact-model.md
  - docs/work/02-skills-v2/design.md
  - docs/work/03-tooling-v2/backlog.md
---

# Design -- Space v2 Tooling and Router (SPACE-03)

TDD-mode design for the **Space v2 artefact model: tooling and router** work
package at `docs/work/03-tooling-v2/`, implementing SPACE-03 from
[`docs/backlog.md`](../../docs/backlog.md).

This work package builds on the v2 skill set that SPACE-02 shipped. The
`@tpw/skills` package structure, `SKILL.md` frontmatter schema, `sync-skills`
bin, and `@tpw/space` source-sync commands are stable and not changed here.
Domain-wide architecture, quality goals, and cross-cutting concepts are
authoritative in [`docs/solution.md`](../../docs/solution.md) and
[`docs/design/space-artefact-model.md`](../../docs/design/space-artefact-model.md)
and are not repeated here.

The complete P1 changeset this WP implements is defined in
`docs/design/space-artefact-model.md` §7.2.

## 1. Scope

### 1.1 In scope

- **`space-index` router skill** (new): meta-skill with a CI-generated body
  table; description targets vague "which skill?" and "what can I do?"
  requests.
- **Role views** (new): `packages/skills/views/pm.md`,
  `packages/skills/views/architect.md`, `packages/skills/views/engineer.md` —
  generated Markdown tables filtered by the `role` frontmatter field.
- **Profile YAMLs** (new): `packages/skills/profiles/minimal.yaml`,
  `domain-team.yaml`, `platform.yaml`, `full.yaml` — list of active skill
  names per profile.
- **`space sync skills`** (new): new `@tpw/space` subcommand that materialises
  only a profile's skills; reads `--profile` flag or `.space/profile.yaml`
  fallback.
- **Description eval loop** (new): `scripts/eval-descriptions.py` run in CI;
  20 representative queries × 3 samples per skill; blocks merge on
  trigger-rate regression below a configurable threshold.
- **`pnpm lint:docs`** (new): monorepo-root script backed by
  `scripts/lint-docs.js`; eight checks from `artefact-model.md` §4.10.
- **`plan-delivery` skill** (new): Phase-0 orchestrator that sequences the
  five pre-sprint artefacts for a new domain.
- **`refine-docs` skill** (new): sprint-end skill that promotes WP-local ADR
  candidates into `solution.md` and archives superseded WP design sections.
- **Release** `@tpw/skills@0.4.0` with the four new skills and supporting
  generators.

### 1.2 Out of scope

- `space publish jira` / `space publish confluence` — SPACE-04 / SPACE-05.
- Retiring `write-requirements` from the default profile or marking
  `write-metrics` / `write-roadmap` as `stage: deferred` — deferred to when
  profiles are live (this WP ships profiles, so this can happen in a
  follow-on PR within SPACE-03 if capacity allows, or deferred to SPACE-09).
- Workspace profiles at scaffold (`--profile` flag on `create-space`) —
  SPACE-10.
- MADR-format individual ADR files under `architecture/decisions/` —
  SPACE-09.
- Seeding the eval query set from real `storefront-space` transcripts — the
  seed set ships as a static file in this WP; the seed is updated in a later
  sprint once > 100 sessions have been recorded.

### 1.3 Capabilities this work package delivers

Mapped to story-level AC in [`./backlog.md`](backlog.md):

- **`space-index` router skill with CI-regenerated body** (SPACE-03-01).
- **Role views: `pm.md`, `architect.md`, `engineer.md`** (SPACE-03-02).
- **Profile YAMLs** (SPACE-03-03).
- **`space sync skills --profile X`** (SPACE-03-04).
- **Description eval loop in CI** (SPACE-03-05).
- **`pnpm lint:docs`** with all eight checks from `artefact-model.md` §4.10
  (SPACE-03-06).
- **`plan-delivery` orchestrator skill** (SPACE-03-07).
- **`refine-docs` sprint-end skill** (SPACE-03-08).
- **Release 0.4.0 + validation** against `storefront-space` (SPACE-03-09).

## 2. Architecture fit

This WP touches `packages/skills/` (Markdown + generators), `packages/space/`
(new subcommand), and the monorepo root (new `lint:docs` script). No changes to
`@tpw/create-space`, the `sync-skills` postinstall bin, or the existing
`@tpw/space` sync commands.

References in [`docs/solution.md`](../../docs/solution.md):

- §3 — file-system convention as the integration point; why the three packages
  share no runtime imports.
- §4.2 Level 2 — `@tpw/skills` skill directory layout the generators walk.
- §4.4 Level 2 — `@tpw/space` CLI structure; the new `sync skills` subcommand
  slots under the existing `sync` command group.
- §7.4 — testing strategy per package.

References in
[`docs/design/space-artefact-model.md`](../../docs/design/space-artefact-model.md):

- §3.2 — enriched frontmatter fields (`role`, `consumes`, `produces`) that the
  generators and `space-index` body consume.
- §3.4 — description eval loop: 20 representative queries × 3 samples, block
  on regression.
- §3.5 — `space-index` description and generated body shape.
- §3.6 — role views as generated filter tables.
- §3.7 — profile YAML format and `space sync skills --profile X` behaviour.
- §4.10 — the eight `pnpm lint:docs` checks and their failure messages.

Architecture diagram: new pieces in context.

```text
@tpw/skills (packages/skills/)
  space-index/        <-- NEW skill (static description, CI-generated body)
  views/              <-- NEW generated role views (pm.md, architect.md, engineer.md)
  profiles/           <-- NEW profile YAMLs (minimal, domain-team, platform, full)
  plan-delivery/      <-- NEW skill
  refine-docs/        <-- NEW skill
  bin/
    generate-index.js <-- NEW reads all SKILL.md frontmatter, writes space-index body
    generate-views.js <-- NEW reads all SKILL.md frontmatter, writes views/*.md
    lint-skills.js    existing (SPACE-02)

@tpw/space (packages/space/)
  src/commands/
    sync.ts           EVOLVE -- add `sync skills [--profile X]` subcommand

monorepo root (package.json)
  scripts.lint:docs   <-- NEW entry running scripts/lint-docs.js

scripts/              <-- NEW directory
  lint-docs.js        <-- NEW eight doc-lint checks
  eval-descriptions.py<-- NEW description eval loop (Python + Anthropic SDK)
  eval-queries.json   <-- NEW seed query set (20 representative queries)
```

The generators (`generate-index.js`, `generate-views.js`) run in CI on every
PR that touches `packages/skills/**`. They write to committed files and fail CI
if the committed output is stale. This is the same pattern the ESLint preset
uses for its auto-generated index.

## 3. Files and components

### 3.1 New files

```text
packages/skills/
  space-index/
    SKILL.md                    NEW  router meta-skill; static description, generated body
    template.md                 NEW  source-of-truth template the generator fills in
  plan-delivery/
    SKILL.md                    NEW  Phase-0 orchestrator skill
    template.md                 NEW  sequenced delivery plan output
  refine-docs/
    SKILL.md                    NEW  sprint-end docs promotion skill
    template.md                 NEW  structured refine session output
  views/
    pm.md                       NEW  generated: skills where role includes pm or founder
    architect.md                NEW  generated: skills where role includes architect
    engineer.md                 NEW  generated: skills where role includes engineer
  profiles/
    minimal.yaml                NEW  implement, review-code, create-mr, write-adr
    domain-team.yaml            NEW  + write-product, write-solution, write-backlog,
                                     write-contracts, write-wp-design, plan-delivery, refine-docs
    platform.yaml               NEW  + plan-adr, review-adr, space-index
    full.yaml                   NEW  all stable skills
  bin/
    generate-index.js           NEW  walks SKILL.md files; writes space-index/SKILL.md body
    generate-views.js           NEW  walks SKILL.md files; writes views/*.md

scripts/
  lint-docs.js                  NEW  eight lint:docs checks from artefact-model.md §4.10
  eval-descriptions.py          NEW  Anthropic description eval loop
  eval-queries.json             NEW  20 seed queries for eval loop
```

### 3.2 Modified files

```text
packages/space/src/commands/
  sync.ts                       EVOLVE  add `sync skills [--profile X]` subcommand

packages/skills/
  package.json                  BUMP  0.3.x → 0.4.0; add generate:index, generate:views scripts
  CHANGELOG.md                  ADD   v0.4.0 entry

package.json (monorepo root)    EVOLVE  add lint:docs script
```

### 3.3 Files NOT modified

```text
packages/skills/bin/sync-skills.js        stable from SPACE-02; profile filtering
                                          happens before sync-skills runs, not inside it
packages/skills/bin/lint-skills.js        stable; no new frontmatter fields this WP
packages/space/src/providers/            stable; no provider changes
packages/space/src/config.ts             stable; no new config keys this WP
packages/create-space/                   stable; --profile on create-space is SPACE-10
```

## 4. Data contracts

### 4.1 Profile YAML schema

```yaml
# packages/skills/profiles/domain-team.yaml
name: domain-team
description: Standard domain-team profile — skills for a squad building a new domain.
skills:
  - implement
  - review-code
  - create-mr
  - write-adr
  - write-product
  - write-solution
  - write-backlog
  - write-contracts
  - write-wp-design
  - plan-delivery
  - refine-docs
```

`name` and `skills` are required. `description` is optional. `skills` entries
must match directory names under `packages/skills/`. The linter asserts all
entries resolve; the generator asserts all entries have `stage: stable`.

### 4.2 `space-index` body shape (generated section)

The generator writes the body section between the `<!-- BEGIN GENERATED -->`
and `<!-- END GENERATED -->` sentinels in `space-index/SKILL.md`:

```markdown
<!-- BEGIN GENERATED — do not edit; run `pnpm generate:index` to refresh -->
| Skill | Description (excerpt) | Artefact | Phase | Role | Consumes | Produces |
| --- | --- | --- | --- | --- | --- | --- |
| write-product | Drafts product.md... | product.md | discovery | pm, founder | — | product.md |
| write-solution | Drafts solution.md... | solution.md | discovery | architect, engineer | product.md | solution.md |
...
<!-- END GENERATED -->
```

The generated section is the full table of all skills whose `stage` is not
`deprecated`. Deprecated skills (e.g. the `design` alias) are excluded from
the index table.

### 4.3 Role view shape (generated files)

Each role view is a standalone Markdown file with a header and a generated
table. Example for `views/engineer.md`:

```markdown
# Skills — Engineer

Generated from `packages/skills/*/SKILL.md` frontmatter. Run
`pnpm generate:views` to refresh.

| Skill | What it does | Artefact | Phase | Consumes | Produces |
| --- | --- | --- | --- | --- | --- |
| implement | Implements code for a story... | code | delivery | design.md, backlog.md | code |
| review-code | Performs a comprehensive code review... | — | delivery | design.md, backlog.md | review |
| write-wp-design | Drafts a work-package design.md... | work/{wp}/design.md | delivery | backlog.md, solution.md | design.md |
...
```

Filtering criterion: `fm.role` array includes `engineer` (case-sensitive).
Skills with `stage: deprecated` are excluded.

### 4.4 `space sync skills` command interface

```typescript
// packages/space/src/commands/sync.ts (extended)
interface SyncSkillsOptions {
  profile?: string; // --profile flag value; overrides .space/profile.yaml
}

// Resolved profile: the skill names to materialise
type SkillProfile = string[]; // skill directory names

// Existing sync-skills bin does the copy; this command resolves the profile
// and passes the list to sync-skills via environment variable or a transient
// filter file.
```

The `space sync skills` command:

1. Resolves the profile: `--profile` flag → `.space/profile.yaml` → `full`
   (all stable skills) as the final default.
2. Reads the profile YAML from `node_modules/@tpw/skills/profiles/{name}.yaml`.
3. Writes a transient `.space/.skill-filter.json` listing the active skills.
4. Invokes `sync-skills` (the existing bin). The updated `sync-skills` reads
   `.space/.skill-filter.json` when present and skips skills not in the list.
5. Deletes `.space/.skill-filter.json` after `sync-skills` exits.

The `.space/.skill-filter.json` approach avoids adding a CLI argument to
`sync-skills` (which is a postinstall bin with no argument handling today).

### 4.5 `pnpm lint:docs` exit contract

```typescript
// scripts/lint-docs.js
interface LintFinding {
  file: string;
  check: string; // frontmatter-schema | link-check | budget | ...
  message: string;
}

// stdout (text): summary line per finding
// exit 0 on all-pass, exit 1 on any finding
```

Eight check IDs (per `artefact-model.md` §4.10):

```text
frontmatter-schema      required keys present per doc type
link-check              every [[path]] resolves to an existing file
budget                  doc length within per-type limit
id-resolution           cited metric / ADR / epic IDs resolve in their owning doc
no-repeated-scope       same capability name in ≤1 scope section
negative-constraints    no artefact contains <!-- DO NOT INCLUDE -->
no-speculative-epic-ids roadmap.md contains no epic IDs
story-AC-schema         every WP backlog story has all required fields
```

### 4.6 Eval loop result schema

```json
// scripts/eval-queries.json (the seed query set)
[
  { "query": "write the product doc for our checkout domain", "expected": "write-product" },
  { "query": "which skill should I use?", "expected": "space-index" },
  { "query": "design the foundation sprint", "expected": "write-wp-design" },
  ...
]
```

```python
# eval-descriptions.py result (logged to stdout as JSON, one line per skill)
{ "skill": "write-product", "trigger_rate": 0.93, "samples": 3, "threshold": 0.85, "pass": true }
```

The CI step fails if any skill's `trigger_rate < threshold` (default 0.85) or
if any skill's description is not triggered by its own `expected` queries.

## 5. Runtime view

### 5.1 `space sync skills --profile domain-team`

```text
developer runs: space sync skills --profile domain-team
  -> packages/space/src/commands/sync.ts: SyncSkillsOptions.profile = "domain-team"
  -> resolveProfile("domain-team")
       reads node_modules/@tpw/skills/profiles/domain-team.yaml
       returns SkillProfile (array of 11 skill names)
  -> writes .space/.skill-filter.json   { "skills": ["implement", "write-product", ...] }
  -> execs sync-skills (postinstall bin)
       sync-skills reads .space/.skill-filter.json
       for each skill in @tpw/skills/:
         if skill not in filter → skip
         if skill in filter → copy to skills/ as before
       writes skills/.sources.json with version + active skill list
  -> deletes .space/.skill-filter.json
  -> prints: "space: synced 11 skills (profile: domain-team)"
```

### 5.2 CI: generate-index and generate-views on PR

```text
PR touches packages/skills/**
  -> CI step: pnpm generate:index
       generate-index.js walks packages/skills/*/SKILL.md
       reads frontmatter of each non-deprecated skill
       writes the generated section into space-index/SKILL.md
       exits 0 if file unchanged, exits 1 if file was modified (stale committed output)
  -> CI step: pnpm generate:views
       generate-views.js same pattern → writes views/pm.md, views/architect.md, views/engineer.md
  -> both steps run before lint:skills
  -> if either exits 1, CI fails with:
       "Generated file out of date — run pnpm generate:index (or generate:views) locally"
```

In practice, developers run `pnpm generate:index && pnpm generate:views` before
pushing; husky pre-push hook enforces this.

### 5.3 CI: `pnpm lint:docs` on PR

```text
PR touches docs/** or work/**
  -> CI step: pnpm lint:docs
       scripts/lint-docs.js
       walks docs/, work/ for Markdown files with YAML frontmatter
       runs eight checks sequentially
       accumulates findings into an array
       exits 0 if findings.length === 0
       exits 1 if any findings, prints one line per finding:
         "[link-check] docs/backlog.md: broken link -> docs/design/missing.md"
```

### 5.4 CI: description eval loop on PR

```text
PR touches packages/skills/*/SKILL.md
  -> CI step: python scripts/eval-descriptions.py
       reads eval-queries.json (20 queries)
       for each skill, runs 3 Anthropic API calls with a prompt that presents
         the full list of descriptions and asks "which skill does this query
         trigger?"
       measures trigger_rate: correct_calls / (queries_for_skill * 3)
       fails if any skill trigger_rate < EVAL_THRESHOLD (default 0.85)
       outputs JSON result per skill
```

The eval loop requires an `ANTHROPIC_API_KEY` environment variable in CI. It
only runs on PRs that touch `SKILL.md` files; it is skipped on docs-only PRs.

## 6. Cross-squad coordination

Not applicable for this WP. All deliverables are internal to the Space monorepo
or published as a new `@tpw/skills` version consumed by `storefront-space`.
`storefront-space` validates the release but has no co-ordination dependency
during development.

## 7. Error paths

### 7.1 `space sync skills` error paths

| Condition | Behaviour |
| --- | --- |
| Profile name not found in `profiles/` | Exit non-zero: "Profile '{name}' not found in @tpw/skills/profiles/" |
| `.space/profile.yaml` present but malformed YAML | Exit non-zero listing parse error; no skills are synced |
| Skill name in profile YAML does not match any directory in `@tpw/skills` | Warn to stderr: "Skill '{name}' listed in profile not found in source; skipped" |
| `sync-skills` fails mid-copy | `.space/.skill-filter.json` is deleted in a finally block; partial write follows existing atomic-rename semantics (`solution.md §7.2`) |
| `@tpw/skills` not installed | Exit non-zero: same message as existing `sync-skills` path |

### 7.2 Generator error paths

| Condition | Behaviour |
| --- | --- |
| A SKILL.md has a malformed frontmatter | Generator exits non-zero listing the offending file and line |
| `space-index/SKILL.md` is missing the sentinel markers | Generator exits non-zero: "space-index/SKILL.md is missing the <!-- BEGIN GENERATED --> sentinel" |
| Views directory not writable | Generator exits non-zero with OS error |

### 7.3 `pnpm lint:docs` error paths

| Condition | Behaviour |
| --- | --- |
| A doc references a path that does not exist | `link-check` finding with the doc path and the broken target |
| A doc exceeds its length budget | `budget` finding: "doc X is N lines; limit is M" |
| A roadmap contains an epic ID pattern | `no-speculative-epic-ids` finding naming the match |
| A generated artefact contains `<!-- DO NOT INCLUDE -->` | `negative-constraints` finding listing the doc path |
| A WP backlog story is missing a required schema field | `story-AC-schema` finding listing story ID and missing field |

## 8. Observability

Per `docs/solution.md` §7.3: CLIs print progress lines to stdout and errors to
stderr. No new telemetry surface is introduced in this WP.

This WP adds:

- `space sync skills` prints: `space: synced N skills (profile: {name})` on
  success; `space: 0 skills synced — profile {name} is empty` as a warning if
  the profile list resolves to zero skills.
- Generator scripts print one summary line per run:
  `generate-index: wrote space-index/SKILL.md (N skills, M lines changed)`.
- `pnpm lint:docs` prints one line per finding in the format
  `[{check}] {file}: {message}` plus a summary count on exit.
- Eval loop prints per-skill JSON result lines to stdout and a pass/fail
  summary to stderr.

## 9. Testing strategy

| Layer | Scope | Target |
| --- | --- | --- |
| Unit (Vitest) | `generate-index.js`: frontmatter walk, sentinel replacement, deprecated exclusion | 100% branches |
| Unit (Vitest) | `generate-views.js`: role filter, table formatting, deprecated exclusion | 100% branches |
| Unit (Vitest) | `lint-docs.js`: each check in isolation using fixture docs | 100% branches |
| Unit (Vitest) | Profile YAML parsing and unknown-skill warning in `space sync skills` | 100% branches |
| Unit (Vitest) | `.skill-filter.json` written and cleaned up (success + error paths) | 100% branches |
| Snapshot (Vitest) | Generated `space-index/SKILL.md` body section against a fixed set of 3 fixture skills | Exact match |
| Snapshot (Vitest) | Generated `views/engineer.md` against the same fixture set | Exact match |
| Integration (shell) | `pnpm generate:index && pnpm lint:skills` passes clean after generation | Green |
| Integration (shell) | `pnpm lint:docs` passes on `docs/` and `docs/work/` as checked in | Green |
| Manual | One `storefront-space` session exercising `plan-delivery` and `refine-docs` against the cart exemplar | Human review pass |
| Manual | `space sync skills --profile domain-team` in `storefront-space` materialises exactly the expected skill directories | Human diff check |

The eval loop (`eval-descriptions.py`) is exercised in CI only; no local Vitest
coverage is required. The CI step is the test.

## 10. Acceptance gates

1. `pnpm validate` clean from the monorepo root after all changes.
2. `pnpm lint:skills` passes with zero errors across all 18 skills (14 existing
   + 4 new: `space-index`, `plan-delivery`, `refine-docs`, and the `design`
   alias continues to pass as deprecated).
3. `pnpm lint:docs` passes with zero findings against the current `docs/` and
   `docs/work/` tree.
4. `pnpm generate:index && pnpm generate:views` produce no diff against the
   committed output (generators are idempotent on a clean tree).
5. `space-index/SKILL.md` body table includes all 17 stable skills and excludes
   the `design` deprecated alias.
6. `views/pm.md`, `views/architect.md`, `views/engineer.md` each contain a
   non-empty table; every skill appears in at least one view.
7. All four profile YAMLs reference only skill names that exist in
   `packages/skills/`.
8. `space sync skills --profile minimal` in `storefront-space` materialises
   exactly four skill directories; no others are added or removed.
9. Description eval loop passes in CI (trigger_rate ≥ 0.85 for all skills)
   before the 0.4.0 tag is cut.
10. `@tpw/skills@0.4.0` is published to the npm registry.

## 11. Handoff to SPACE-04

When SPACE-03 closes, the following are stable:

- `space-index` skill is live; the router body is auto-maintained in CI.
- Role views and profiles are shipped with `@tpw/skills@0.4.0`.
- `space sync skills --profile X` is the canonical way for workspaces to
  adopt a subset of skills.
- `pnpm lint:docs` enforces all eight structural checks; any artefact
  violations block CI from this sprint onward.
- Description eval loop is in CI; description regressions are caught on every
  PR that touches a skill.
- `plan-delivery` and `refine-docs` are available for the next domain onboarding
  session.

SPACE-04 picks up: `space publish jira` with source-aware behaviour and the
Markdown-to-Jira field mapping described in
`docs/design/space-artefact-model.md` §6. It can assume:

- WP backlog schema (`story-AC-schema` lint) is enforced; stories are parseable
  without format negotiation.
- The `consumes`/`produces` handoff graph is clean; the publish pipeline can
  walk it to identify which backlog files to parse.

## 12. Open questions

1. **Eval loop language.** Python is specified (matching Anthropic's
   `skill-creator run_loop.py`). The monorepo is otherwise TypeScript. Confirm
   whether Python is acceptable in CI or whether a TypeScript port of the eval
   loop is preferred before SPACE-03-05 is scheduled.
   Owner: engineering lead. Default: Python as specified in artefact-model §3.4.

2. **Generator staleness enforcement.** Two options: (a) CI runs generators and
   fails if output changed (proposed above), or (b) CI only checks, never
   writes, and developers must run locally. Option (a) is simpler for the
   developer but requires CI write access to the checked-in file. Confirm
   preferred enforcement model before SPACE-03-01 starts.
   Owner: engineering lead. Default: option (a).

3. **`sync-skills` filter mechanism.** Passing the profile filter via a
   transient `.space/.skill-filter.json` (proposed in §4.4) avoids modifying
   the `sync-skills` bin. An alternative is adding a `--filter` argument to
   `sync-skills` and having `space sync skills` pass it. The argument approach
   is cleaner but requires modifying a bin that is also run as a postinstall
   hook. Confirm before SPACE-03-04 starts.
   Owner: engineer. Default: transient file approach.

4. **Eval threshold value.** `EVAL_THRESHOLD = 0.85` is the proposed default.
   This has not been calibrated against real query data. The threshold should be
   set conservatively low for the first release (0.75?) and tightened once
   baseline trigger rates are measured. Confirm before the CI step blocks
   merges.
   Owner: engineer. Default: 0.75 for the first run; raise to 0.85 after one
   sprint of baseline data.
