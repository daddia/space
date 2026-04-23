---
type: Roadmap
product: space
version: '1.0'
owner: Horizon Platform
status: Draft
last_updated: 2026-04-23
parent_product: docs/product.md
related:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
---

<!--
DO NOT INCLUDE in this document:
  - Acceptance criteria or story-level detail    (goes to docs/backlog.md and work/*/backlog.md)
  - Component names, schemas, or file paths      (goes to docs/solution.md)
  - Dates beyond "Now"                           (commitments evaporate; phase gates hold)
-->

# Roadmap -- Space

Phased delivery roadmap for Space. Organised as Now / Next / Later
rather than dates, in line with the calibration rule in
`docs/design/space-artefact-model.md` Section 2.3: we sequence by what
has been learnt, not by a plan written before the learning.

- **Now** -- actively in flight; covered by a live work package.
- **Next** -- committed but not started; well-scoped enough to start
  in the next 1-3 sprints.
- **Later** -- identified and deliberately deferred; revisit after the
  Next phase closes.

Phase exit criteria are explicit. A phase is done when its criteria
hold, not when its calendar runs out.

## Now -- Source sync foundation

**Objective.** Make the three-package loop fully working end-to-end:
scaffold a workspace, sync Jira issues, sync Confluence pages, confirm
it against the first real initiative workspace (`storefront-space`).

**Work package.** `work/01-source-sync/backlog.md` -- 16 stories;
current in-flight backlog.

**Scope (in).**

- `@tpw/space` source-sync commands for Jira and Confluence (pull).
- `@tpw/create-space` template hardened: `.space/` directory,
  `@tpw/space` as a dev dependency, working `sync` script.
- `storefront-space` committed source mirrors for Jira (STORE) and
  Confluence (STOREFRONT).
- Unit + integration test suites for all sync paths.

**Scope (out).**

- Publish back to Jira or Confluence (reserved for Next).
- Additional source providers (Slack, Vercel, GitHub issues).
- Multi-project Jira and incremental sync.

**Exit criteria.**

1. `space sync jira` and `space sync confluence` both green from
   `storefront-space`, writing deterministic, idempotent mirrors.
2. `pnpm create @tpw/space` produces a workspace with a working
   `.space/config` and `sync` script on first scaffold.
3. `pnpm validate` (install, build, typecheck, lint, test) clean on
   all three packages.
4. `storefront-space` has one committed sync of each provider's
   mirror as proof-of-life.

## Next -- Space v2 artefact model

**Objective.** Land the artefact-model redesign across `@tpw/skills`
so that `product.md` / `solution.md` / `roadmap.md` / `backlog.md`
become the canonical four-doc set every workspace produces, with
deterministic publish paths into Jira and Confluence.

**Drivers.**

- `docs/design/space-artefact-model.md` (the agreed design).
- This document itself, and the three other exemplar docs, are the
  first consumers of the new model.

**Candidate work packages.** Exact decomposition lives in
`docs/backlog.md`; the Next phase covers:

1. **Skill changeset P0** -- add `write-solution`, refactor
   `write-product`, split `design` into walking-skeleton vs TDD,
   add executable `write-contracts`, add negative-constraint
   comment blocks to every template, rewrite every skill description
   to Anthropic skill-creator rules.
2. **Enriched frontmatter** -- `consumes` / `produces` /
   `phase` / `role` / `stage` on every skill; powers `space-index`
   and workspace profiles.
3. **`space-index` router skill** -- auto-generated in CI from
   sibling frontmatter.
4. **Skill description eval loop in CI** -- `run_loop.py`; 20 queries
   x 3 samples per description; block merge on regression.
5. **Backlog schema lock-down** -- EARS + Gherkin acceptance criteria
   at work-package scope; field mapping consistent with the publish
   pipeline below.

**Exit criteria.**

1. All P0 skill changes merged and published in `@tpw/skills`.
2. At least one initiative workspace (`storefront-space`) has
   adopted the v2 templates and published the new four-doc set for
   at least one domain.
3. CI enforces description eval, docs lint (frontmatter schema, link
   check, budgets), and skill structural lint.

## Next -- Publish pipeline

**Objective.** Close the loop from Markdown to the issue and
knowledge-base systems. Jira becomes addressable from domain and
work-package backlogs; Confluence becomes addressable from
`product.md`, `solution.md`, and work-package `design.md`.

**Candidate work packages.**

1. **`space publish jira`** -- dry-run + apply; source-aware
   (`issues.source: jira | markdown`); key-ownership rule per
   `docs/design/space-artefact-model.md` Section 6.2; sidecar key
   mapping at `.space/sources/jira/mapping.json` in Markdown mode.
2. **`space publish confluence`** -- opt-in write-back per document;
   uses `confluence_page_id` frontmatter; Markdown to storage-XHTML
   conversion; version increment per the Confluence contract.

**Exit criteria.**

1. Round-trip for one Jira epic + five stories works end-to-end from
   `storefront-space` against the STORE project, in both source
   modes.
2. Round-trip for one Confluence page works end-to-end against the
   STOREFRONT space.
3. `space publish --dry-run` output is reviewable by a human.

## Later -- Platform maturity

Identified and deliberately deferred. Revisit after the Next phase's
exit criteria hold.

- **Embedded workspace mode.** A `--mode embedded` flag on
  `create-space` lets a workspace live inside a code repo as a
  top-level subtree rather than a sibling repo. Advantages are that
  code changes and their design docs land in the same MR and agents
  have direct access to the codebase. Sibling mode remains correct
  when the workspace spans multiple code repos, when access controls
  require separating contributors, or when sync output volume would
  pollute the code repo history. Implementation diverges only at the
  file-placement step; the workspace conventions and tooling are
  identical across modes.
- **Additional source providers.** Slack channels and Vercel
  deployments as native-format mirrors under `.space/sources/`.
- **Multi-project Jira sync.** Extend `sources.issues` from a single
  block to an array. Additive schema change.
- **Incremental Jira and Confluence sync.** Delta pulls based on
  `updated` timestamps; full-refresh remains an option.
- **Skill library expansion.** Fill out the delivery lifecycle:
  `write-metrics` (promoted from deferred to stable after first use),
  `review-adr`, `validate`, regulated-domain skills
  (`write-requirements`), operations skills (`retrospective`,
  `incident-response`, `post-deployment`).
- **Workspace profiles at scaffold time.** `create-space --profile`
  materialises only the subset of skills the workspace wants active.
- **`refine-docs` sprint-end skill.** Promotes ADRs into
  `solution.md` at phase close; writes Phase 2 `roadmap.md`,
  `metrics.md`, and full `product.md` from the walking skeleton.
- **`plan-delivery` orchestrator.** Runs the Phase 0 sequence
  (product -> solution stub -> contracts -> backlog -> WP-01 design
  - backlog) as a deterministic multi-step activity.
- **External open-source release.** Only after the model has been
  validated against at least three initiative workspaces.

## Dependencies on other teams

| Dependency                                     | Owner                | Risk if delayed    |
| ---------------------------------------------- | -------------------- | ------------------ |
| Atlassian API availability and rate limits     | Atlassian (external) | Sync reliability   |
| `@tpw/crew` readiness to consume the workspace | Crew team            | Adoption velocity  |
| Initiative workspaces ready to adopt v2        | Each initiative      | Validation cadence |

## Sequencing logic

The phases are ordered by what each unlocks:

- **Now unlocks** a trustworthy reading loop: workspaces can consume
  real program data.
- **Next (artefact model)** unlocks a trustworthy writing loop:
  workspaces produce a canonical doc set that a publisher can act on.
- **Next (publish pipeline)** unlocks a round-trippable loop: Markdown
  and the upstream systems stay in sync deliberately.
- **Later** broadens the loop: more sources, more providers, more
  maturity.

No phase ships until the prior phase's exit criteria hold.
