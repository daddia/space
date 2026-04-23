---
type: Roadmap
product: space
version: '2.0'
owner: Horizon Platform
status: Draft
last_updated: 2026-04-23
parent_product: docs/product.md
related:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
---

# Roadmap -- Space

The order in which Space will deliver its **consumer-facing
capabilities**. Organised as Now / Next / Later, sequenced by what
each capability unlocks for an initiative workspace, not by calendar.

This roadmap owns outcomes and sequencing. The epic decomposition
that implements each outcome lives in
[`docs/backlog.md`](backlog.md); the sprint-scale design and stories
live under [`work/`](../work/). The roadmap does not list epics.

## Now -- Source sync foundation

**Outcome.** Any initiative workspace can reason over its upstream
program data (Jira issues, Confluence pages) offline. The scaffolder
produces a complete, standards-compliant workspace in one command.
The first initiative workspace (`storefront-space`) is the validation
environment.

**Consumer-visible capabilities.**

- Scaffolding a new workspace via `pnpm create @tpw/space` produces a
  complete layout with identity, team, RACI, skills, and source-mirror
  scaffolding.
- `space sync jira` pulls a Jira project into the workspace in native
  REST format, atomically.
- `space sync confluence` pulls a Confluence space in native storage
  XHTML, atomically.
- `space sync` without a provider dispatches to every configured source.
- Skills are synced into `.cursor/skills/` and `.claude/skills/` by
  postinstall, without ever deleting project-local skills.

**Exit criteria.**

1. An engineer new to the organisation can scaffold a workspace and
   pull program data into it in under thirty minutes, with no manual
   configuration beyond credentials.
2. `space sync jira` and `space sync confluence` are idempotent:
   re-running either produces a byte-identical mirror when upstream
   has not changed.
3. Sync operations never partially corrupt an existing mirror: on
   failure, the previous mirror is untouched and the temp output is
   preserved for inspection.
4. `storefront-space` has a committed Jira and Confluence mirror,
   reviewed by the squad, proven readable by `@tpw/crew` at execution
   time.
5. `pnpm validate` (install, build, typecheck, lint, test) is clean on
   all three packages.

**Out of scope for Now.** Write-back to Jira or Confluence, additional
source providers (Slack, Vercel), multi-project Jira, incremental
sync. Those are delivered in Next or Later.

## Next -- Canonical artefact set + publish pipeline

**Outcome.** Workspaces produce the canonical four-doc set
(`product.md`, `solution.md`, `roadmap.md`, `backlog.md`) from
opinionated skills, with negative constraints that prevent content
leakage between the docs. Those docs can be published back to the
upstream systems deterministically: backlogs become Jira epics and
stories; prose docs become Confluence pages.

**Consumer-visible capabilities.**

- Skills that produce each doc in the canonical set, each enforcing
  its WHAT/WHY vs HOW seam at generation time.
- A router skill that answers "what can I do here?" deterministically
  from sibling skill metadata, avoiding the skill-discovery problem
  as the library grows.
- Role views (`views/pm.md`, `views/architect.md`,
  `views/engineer.md`) generated from the same metadata, filtering
  the library by role without forking it.
- `space publish jira`, respecting an explicit issue-key-ownership
  rule (Jira-source or Markdown-source) per workspace config, with a
  dry-run mode.
- `space publish confluence` for opt-in prose docs, triggered only by
  an explicit `confluence_page_id` frontmatter field.
- A description eval loop in CI that catches skill-router regressions
  before they ship.
- A docs lint (`pnpm lint:docs`) that enforces frontmatter schema,
  link integrity, and per-doc length and content budgets.

**Exit criteria.**

1. At least one initiative workspace (the validation target,
   `storefront-space`) produces the full canonical four-doc set for
   at least one domain, with no manual post-generation editing needed
   to pass `pnpm lint:docs`.
2. Round-trip for one Jira epic plus five stories works end-to-end
   from that workspace, in both issue-source modes.
3. Round-trip for one Confluence page works end-to-end against the
   workspace's Confluence space.
4. `pnpm lint:docs` is green on the canonical set; CI blocks merge
   on a regression.
5. The skill-description eval loop shows no trigger-rate regression
   on the seed query set between releases.
6. No initiative workspace needs to fork skills to ship -- every
   improvement made by one team is available to every other team on
   the next install.

**Out of scope for Next.** Embedded workspace mode, additional source
providers, multi-project or incremental sync, regulated-domain
skills. Those are delivered in Later.

## Later -- Platform maturity

**Outcome.** Space scales to more workspaces, more source providers,
and more initiative shapes without forking the core. New
capabilities integrate with the conventions established in Now and
Next; no conventions break.

**Deferred capabilities.**

- **Embedded workspace mode.** A single-repo option where the
  workspace lives inside the code repository as a top-level subtree.
  Sibling mode remains the default; embedded mode is the add.
- **Additional source providers.** Slack channels and Vercel
  deployments as native-format mirrors under `.space/sources/`.
- **Multi-project Jira and incremental sync.** Extend `sources.issues`
  to an array (additive schema change); add delta pulls based on
  `updated` timestamps.
- **Expanded skill library.** Promote `write-metrics` out of
  deferred, add `review-adr`, `validate`, ops skills
  (`retrospective`, `incident-response`, `post-deployment`).
  Regulated-domain `write-requirements` stays available on opt-in.
- **Workspace profiles at scaffold time.** Let a consumer pick a
  profile (`minimal`, `domain-team`, `platform`, `full`) that
  materialises only the skills that profile activates.
- **Sprint-end `refine-docs` skill.** Promote ADRs into
  `solution.md`; generate Phase-2 `roadmap.md`, `metrics.md`, and
  expanded `product.md` from the walking-skeleton outcomes.
- **Phase-0 `plan-delivery` orchestrator.** Run the canonical Phase-0
  artefact sequence deterministically as a multi-step activity.
- **External open-source release.** Only after Space has been
  validated against at least three independent initiative
  workspaces.

No Later capability is sized or sequenced here. Each is identified
and deliberately deferred until its gating phase opens.

## Sequencing logic

Three reasons Now precedes Next, and Next precedes Later:

1. **Reading precedes writing.** A workspace that can read its
   program context is immediately useful. Generating canonical
   documents that can write back requires the reading loop to be
   trustworthy first; publishing against a stale or partial mirror
   would produce silently wrong Jira or Confluence updates.
2. **The doc set must stabilise before tooling compounds.** The
   artefact model is the contract every later skill and every later
   publisher works against. Shipping the router, eval loop, and
   publish pipelines before the canonical set has been validated in
   at least one workspace would bake in whichever version of the
   model was current at that moment.
3. **Expansion runs on stable foundations.** Embedded mode,
   additional providers, and expanded skills each extend a
   convention established earlier. Extending a convention that is
   itself in flux costs more than waiting.

## Dependencies on other teams

| Dependency                                     | Owner                 | Gates     | Status                                                           |
| ---------------------------------------------- | --------------------- | --------- | ---------------------------------------------------------------- |
| Atlassian API availability and rate limits     | Atlassian (external)  | Now       | Addressed via retry + concurrency cap in the sync implementation |
| `@tpw/crew` readiness to consume the workspace | Crew team             | Now, Next | Content contract stable; Crew integrates on its own schedule     |
| Initiative workspace adoption                  | Each initiative squad | Next      | At least one workspace required for Next exit criteria           |
| Confluence page structure conventions          | Horizon Platform      | Next      | Confirmed before `space publish confluence` ships                |

## Review cadence

- **Monthly, during active phase execution.** Platform-internal
  review of phase progress against exit criteria.
- **Pre-phase gate.** Platform + first-consumer-initiative lead
  review. Go / no-go logged in this document.
- **Quarterly.** Roadmap reviewed and versioned. Material changes
  (reordering, new deferred capability, additions to Now or Next)
  require Platform + consumer-initiative sign-off.
