---
type: design
product: space
scope: artefact-model
status: Draft
version: '0.1'
last_updated: 2026-04-23
owner: Horizon Platform
sources:
  - docs/research/research.md
  - docs/product.md
  - docs/design.md
  - docs/backlog.md
supersedes:
  - current packages/skills/write-product/SKILL.md (scope)
  - current packages/skills/write-backlog/SKILL.md (depth)
related:
  - packages/skills/AGENTS.md
  - packages/create-space/AGENTS.md
  - packages/space/AGENTS.md
---

# Space Artefact Model -- Design v0.1

This document defines how `space` structures the documents, skills, and
publish pipeline that a delivery workspace produces. It is the agreed design
that subsequent stories implement against.

It is informed by:

- The storefront-space validation run (cart and pdp domains)
- `docs/research/research.md` (agentic-first delivery research)
- Jonathan Daddia's reference crew-library (60-activity prompt library)
- Shape Up, Cockburn's walking skeleton, arc42-lite, C4, spec-kit, Kiro,
  Anthropic's Agent Skills spec and context-engineering guidance

The non-goals for this document are listed in Section 10. When in doubt,
apply the calibration rule in Section 2.4.

## 1. Context and scope

### 1.1 What this changes

The current model (v0) generates a large document pile per domain before any
code lands. The storefront-space cart validation produced 13+ documents and
~20-30 pages of Markdown before the foundation sprint started, with
significant duplication, technical content in product docs, and no clean
handoff path into an issue tracker.

This design changes four things:

1. **Splits the product-vs-solution seam.** `product.md` owns WHAT/WHY,
   `solution.md` owns HOW. Enforced at generation time via negative
   constraints in templates.
2. **Introduces a Phase 0 / Phase 1 / Phase 2 gating.** Five artefacts at
   Phase 0 (pre-foundation-sprint); the rest emerge with or after the
   walking skeleton.
3. **Reshapes the skills package for LLM routing and human browsability.**
   One package, enriched frontmatter, rewritten descriptions, an index
   router, and generated role views.
4. **Defines a deterministic publish pipeline.** Markdown is the source of
   truth unless `issues.source = jira`, in which case Jira owns issue keys
   and Markdown is a view.

### 1.2 What this does not change

- The three-package monorepo structure (`@tpw/skills`, `@tpw/create-space`,
  `@tpw/space`)
- The Markdown-only nature of `@tpw/skills`
- The postinstall sync pattern that materialises skills into `.cursor/` and
  `.claude/`
- The `space sync` semantics for pulling from external sources

### 1.3 Audience

- **Humans** maintaining the `space` packages
- **Engineers** consuming `space` in a delivery workspace
- **Agents** writing, reviewing, and publishing artefacts in that workspace

### 1.4 Out of scope

- Specific prose of every skill template (tracked per skill)
- The `space-v2` delivery plan (tracked in `docs/backlog.md` and follow-up
  work packages)
- Observability, billing, or distribution strategy for the packages
  themselves

## 2. Design principles

Four principles govern every specific decision in this document. When a
later section appears to conflict with one of these, the principle wins.

### 2.1 WHAT/WHY vs HOW is a hard seam

`product.md` must be readable by a non-technical stakeholder without loss.
`solution.md` must be actionable by an engineer without loss. If a reader
learns the tech stack, service names, database, or deployment topology from
`product.md`, content has leaked. If a reader learns the commercial
rationale, target segments, or strategic thesis from `solution.md`, content
has also leaked.

This rule is enforced at generation time via a `<!-- DO NOT INCLUDE -->`
block at the top of each template, not at review time.

### 2.2 Agentic-first context engineering

Two facts drive this principle:

1. Anthropic's Agent Skills spec pre-loads every skill's `name` +
   `description` into the system prompt at session start; the body is only
   read if the description triggers. **Skill discoverability is LLM routing
   on `description`, not folder layout.**
2. Agents hallucinate type shapes from training-data averages when contracts
   are not pinned. `contracts.md` backed by executable TypeScript / Zod /
   OpenAPI is load-bearing, not documentation.

Consequences: descriptions are authored to Anthropic's rules (Section 3.3);
contracts are mandatory Phase 0 (Section 4); verbose narrative lives in
`/docs/` or Confluence, never in `AGENTS.md`.

### 2.3 Phase gating: produce artefacts only when they generate learning

Pre-sprint artefacts exist to unblock the first walking-skeleton slice.
Documents produced before the skeleton walks encode assumptions the team is
about to invalidate. The research basis is explicit: Cockburn, Ambler's
JBGE, Ries's MVP logic, Shape Up's pitch, and Anthropic's context
engineering all converge on "smallest doc set that generates learning".

Consequences: `roadmap.md`, full `solution.md`, and `metrics.md` are
deferred to Phase 2 (after the foundation sprint). Phase 0 gets a
pitch-form `product.md`, a stub `solution.md`, `contracts.md`, a domain
`backlog.md`, and the work-package pair (`design.md` + `backlog.md`) for
the foundation sprint only.

### 2.4 The calibration rule

> **If removing a document wouldn't block Story 1 from starting on Monday,
> that document belongs to Phase 1 or Phase 2, not Phase 0.**

This is the acceptance test for any proposed Phase 0 artefact. It applies
recursively: a section inside a Phase 0 document that fails the test
belongs in a later phase too.

## 3. Skills package model

### 3.1 One package, flat layout

`@tpw/skills` remains the sole publishable skills package. No role-based
sub-packages. Rationale: the LLM router pre-loads all descriptions
regardless of folder; splitting into `@tpw/skills-pm`,
`@tpw/skills-architect`, etc. would multiply changelog, CI, and eval
burden without improving routing, and would break cross-role handoffs
(PM writes `product.md`, engineer's agent needs to read it).

### 3.2 Enriched frontmatter

Every `SKILL.md` frontmatter gains the following fields. They are not
consumed by the LLM router directly; they power the `space-index` skill,
the `plan-delivery` orchestrator, CI checks, and role views.

```yaml
---
name: write-solution
description: >
  Drafts solution.md during DISCOVERY or REFINE phases from a product.md
  and any emerging ADRs. Use when the user mentions "architecture",
  "solution design", "system design", "high-level design", "how will this
  work". Produces solution.md in stub mode (Phase 0) or full mode (Phase 2).
  Do NOT use for detailed TDDs -- use `write-wp-design` for work-package
  sprints. Do NOT use for product strategy -- use `write-product`.
when_to_use: Phase 0 stub or Phase 2 full; domain scope.
allowed-tools: [Read, Write, Glob, Grep]
artefact: solution.md
phase: discovery        # discovery | definition | delivery | operation
role: [architect, engineer]
domain: architecture    # product | architecture | engineering | ops | qa
stage: stable           # experimental | beta | stable | deprecated
consumes: [product.md, contracts.md]
produces: [solution.md]
prerequisites: [product.md]
related: [write-product, write-adr, write-contracts, write-wp-design]
tags: [architecture, arc42, c4, solution]
version: '0.1'
owner: '@horizon-platform'
---
```

The `consumes` / `produces` pair is the handoff graph and is the highest-
value addition. It lets `space-index` answer "I have product.md, what's
next?" deterministically.

### 3.3 Description authoring rules

The `description` field carries the entire routing load. Rules borrowed
directly from Anthropic's `skill-creator` guidance:

- Third person, lead with a verb-ing clause (`Drafts...`, `Reviews...`)
- Enumerate literal trigger phrases users actually type
- Disambiguate neighbours explicitly (`Do NOT use for X -- use skill-Y`)
- Mention artefact names verbatim (`product.md`, not "the product spec")
- Be mildly pushy when under-triggering is the risk
- 1-3 sentences, 200-500 characters
- Do not rely on `when_to_use`, `tags`, or `role` to trigger -- they are
  tooling metadata, not router input

Every existing skill description is rewritten in the migration plan
(Section 8). This is the single highest-ROI change in the v2 set.

### 3.4 Description eval loop in CI

Adopt Anthropic's `run_loop.py` from `skill-creator`: 20 representative
queries x 3 samples per skill description; measure trigger rate; block
merge on regression. This is the discipline that prevents description
collision as the library grows past 20 skills.

Seed the query set from real workspace session transcripts once
`storefront-space` has >100 sessions on record.

### 3.5 `space-index` router skill

A meta-skill whose body is an auto-generated table of every sibling
`SKILL.md`'s frontmatter, regenerated in CI. Its `description` triggers on
vague requests:

> "Routes the user to the right skill in the space. Use when the user's
> intent matches multiple skills or no skill clearly, or when they ask
> 'what skills exist here?', 'which skill should I use?', 'help me plan',
> or 'what can I do here?'."

This is a deterministic alternative to Anthropic's experimental Tool
Search (reported ~56-60% retrieval at 4,000+ tools). At space's scale
(15-40 skills) a generated index beats embedding search on reliability
and cost.

### 3.6 Role views as generated tables

Human browsability by role is solved by generated Markdown filter tables,
not directories:

```text
packages/skills/
  views/
    pm.md                 # filtered by role includes 'pm' or 'founder'
    architect.md          # role includes 'architect'
    engineer.md           # role includes 'engineer'
    delivery.md           # role includes 'delivery'
```

Generated in CI from sibling frontmatter. Zero duplication, zero fork-
skew. Matches the ESLint-preset pattern (one package, named lists).

### 3.7 Profile selection at workspace creation

`create-space` asks which starter profile the new workspace wants. A
profile is a YAML file listing active skills:

```text
packages/skills/
  profiles/
    minimal.yaml          # implement, review-code, create-mr, write-adr
    domain-team.yaml      # + write-product, write-solution, write-backlog, write-contracts
    platform.yaml         # + plan-adr, review-adr
    full.yaml             # all skills
```

`space sync skills` materialises only the profile's skills into
`.cursor/skills/` and `.claude/skills/`. Workspaces may edit
`.space/profile.yaml` post-scaffold.

## 4. Document set and ownership

### 4.1 Phase 0 artefacts (pre-foundation-sprint)

Five artefacts per domain, plus the pair per work package. This is the
complete pre-code set.

| # | Artefact                                    | Scope      | Length | Purpose                                     |
| - | ------------------------------------------- | ---------- | ------ | ------------------------------------------- |
| 1 | `domain/{d}/product.md` (pitch stage)       | Domain     | <=2 pp | Why, who, problem, appetite, no-gos         |
| 2 | `domain/{d}/solution.md` (stub)             | Domain     | <=2 pp | Context + quality goals; rest `[CLARIFY]`   |
| 3 | `domain/{d}/contracts.md` + `contracts/*.ts`| Domain     | src +1 | Executable types/schemas for skeleton slice |
| 4 | `domain/{d}/backlog.md`                     | Domain     | 1-2 pp | Phase-1 epic list; later = placeholders     |
| 5 | `work/{d}/01-foundations/design.md`         | WP (sprint)| 2-4 pp | Walking-skeleton sketch + acceptance gates  |
| 6 | `work/{d}/01-foundations/backlog.md`        | WP (sprint)| 3-5 pp | Sprint-1 stories with EARS+Gherkin AC       |

Plus always-on agent context: `AGENTS.md` at space root +
`domain/{d}/AGENTS.md` overrides where domain conventions differ.

Total: ~10-15 pages of Markdown plus executable contract source.

### 4.2 Phase 1 artefacts (during foundation sprint, emergent)

Written just-in-time as the skeleton walks. None are prescribed upfront.

- `decisions/ADR-NNNN-*.md` as decisions arise (MADR format)
- `errors.md` rationale as the error registry crystallises in code
- New skills only once a pattern has been used twice (Ambler JBGE)
- CI pipeline, `/examples/` directory

### 4.3 Phase 2 artefacts (after foundation sprint closes)

Only now does the team know enough to author these usefully.

- `domain/{d}/product.md` (product stage) -- extended with outcomes,
  quality goals, positioning
- `domain/{d}/solution.md` (full 10-section arc42-lite) -- reverse-
  engineered from the skeleton that walked
- `domain/{d}/roadmap.md` -- Now / Next / Later; phases, exit criteria
- `domain/{d}/metrics.md` -- what the team will actually measure, with
  baselines from the skeleton
- Additional work-package pairs (`work/{d}/02-.../design.md` +
  `backlog.md`) in TDD mode (Section 5.2)
- `dependencies/*.md` only when a real cross-squad ask exists
- `research/legacy-analysis.md` only for replacement projects

### 4.4 Content-ownership matrix

Legend: **OWN** = authoritative source; REF = may reference but not
redefine; `-` = excluded (a smell if it appears here).

| Content type                                   | product | solution | roadmap | backlog | contracts | metrics |
| ---------------------------------------------- | :-----: | :------: | :-----: | :-----: | :-------: | :-----: |
| Vision, strategic thesis                       | **OWN** |   REF    |   REF   |    -    |     -     |    -    |
| Target user segments, personas                 | **OWN** |   REF    |    -    |   REF   |     -     |   REF   |
| Problem statement, opportunity                 | **OWN** |   REF    |   REF   |   REF   |     -     |    -    |
| Commercial / business rationale                | **OWN** |    -     |   REF   |    -    |     -     |    -    |
| Outcome metric targets (North Star, KPIs)      | **OWN** |    -     |   REF   |   REF   |     -     |   REF   |
| Outcome metric instrumentation, dashboards     |    -    |    -     |    -    |    -    |     -     | **OWN** |
| Operational / SLO metrics (latency, uptime)    |    -    |   REF    |    -    |    -    |    REF    | **OWN** |
| Product scope (in / out)                       | **OWN** |   REF    |   REF   |    -    |     -     |    -    |
| Technical non-goals                            |   REF   | **OWN**  |    -    |    -    |     -     |    -    |
| Feature flags (intent vs mechanism)            |   REF   | **OWN**  |   REF   |   REF   |    REF    |   REF   |
| API contracts and schemas                      |    -    |   REF    |    -    |   REF   |  **OWN**  |    -    |
| Component decomposition (C4 L2-L3)             |    -    | **OWN**  |    -    |    -    |     -     |    -    |
| Data model, domain model                       |    -    | **OWN**  |    -    |    -    |    REF    |    -    |
| Integration, BFF, anti-corruption layer        |    -    | **OWN**  |    -    |    -    |    REF    |    -    |
| Error-handling strategy (taxonomy, retry)      |    -    | **OWN**  |    -    |   REF   |    REF    |   REF   |
| Observability strategy                         |    -    | **OWN**  |    -    |    -    |    REF    |   REF   |
| Phasing, sequencing                            |   REF   |   REF    | **OWN** |    -    |     -     |    -    |
| Dependencies                                   |   REF   |   REF    | **OWN** |   REF   |     -     |    -    |
| Product / market risks                         | **OWN** |    -     |   REF   |    -    |     -     |    -    |
| Technical risks, debt                          |    -    | **OWN**  |   REF   |    -    |     -     |    -    |
| User stories, acceptance criteria (EARS)       |    -    |    -     |    -    | **OWN** |    REF    |    -    |
| NFRs, quality goals                            |   REF   | **OWN**  |    -    |   REF   |    REF    |   REF   |
| Architectural decisions (ADRs, log)            |    -    | **OWN**  |    -    |    -    |     -     |    -    |
| Technology selections                          |    -    | **OWN**  |    -    |    -    |     -     |    -    |
| Rollout, migration plan                        |   REF   | **OWN**  |   REF   |   REF   |     -     |   REF   |
| Experiments, A/B tests                         | **OWN** |   REF    |   REF   |   REF   |     -     |   REF   |
| Glossary, ubiquitous language                  |   REF   | **OWN**  |    -    |    -    |    REF    |    -    |
| Stakeholders, RACI                             | **OWN** |   REF    |    -    |    -    |     -     |    -    |
| Constraints (regulatory, org, technical)       |   REF   | **OWN**  |    -    |    -    |     -     |    -    |

### 4.5 Per-artefact negative constraints

Each template begins with a `<!-- DO NOT INCLUDE -->` block. This is the
enforcement mechanism for the WHAT/WHY vs HOW seam.

**`product.md`** must not contain:

- File paths, module names, class names
- API endpoints, HTTP verbs, schemas, type aliases
- Tech stack names (React, Zustand, Next.js, etc.)
- ADR numbers or decision rationales
- Deployment topology or environment details
- Component or service names

**`solution.md`** must not contain:

- Commercial rationale or business case
- Target customer segments or personas
- Strategic thesis or product principles
- Positioning or messaging
- User quotes

**`roadmap.md`** must not contain:

- Acceptance criteria or story-level detail
- Component names, schemas, or file paths
- Dates beyond "Now"

**`backlog.md`** must not contain:

- Business-case narrative (belongs in product.md)
- Architecture rationale (belongs in solution.md or ADRs)
- Pattern definitions (belongs in solution.md)

**`contracts.md`** must not contain:

- Prose that describes shapes; only executable code with one worked
  example per contract
- Business rationale for a contract (belongs in product.md)

**`metrics.md`** must not contain:

- Target values without a baseline
- Business rationale for a metric (belongs in product.md)

### 4.6 product.md -- pitch stage vs product stage

The `write-product` skill takes a `--stage` argument.

**Pitch stage (Phase 0, <=2 pages)**, Shape Up format:

1. Problem (2-4 sentences)
2. Appetite (how much time are we willing to spend?)
3. Sketch (Figma link or ASCII diagram; not a solution)
4. Rabbit holes (known risks to avoid)
5. No-gos (explicit out-of-scope, a ruthlessly useful section)

**Product stage (Phase 2+, <=5 pages)**, extended with sections 6-10:

1. Target user segments
2. Outcome metrics (targets only; instrumentation lives in metrics.md)
3. Product principles
4. Stakeholders and RACI
5. Relationship to the parent product

### 4.7 solution.md -- stub mode vs full mode

The `write-solution` skill takes a `--stage` argument.

**Stub mode (Phase 0, <=2 pages)**, only two sections filled:

1. Context and scope (C4 Level 1 diagram, upstream/downstream systems)
2. Quality goals and constraints (top 3-5 NFRs, org / regulatory
   constraints)

Sections 3-10 are present as headings with `[NEEDS CLARIFICATION]`
markers. This gives the team an architectural anchor without inventing
solution content.

**Full mode (Phase 2+, 8-12 pages)**, ten sections (arc42-lite):

1. Context and scope
2. Quality goals and constraints
3. Solution strategy (architectural style, key tech choices)
4. Building block view (C4 L2, selectively L3)
5. Runtime view (2-5 key sequences)
6. Data model and ubiquitous language
7. Cross-cutting concepts (observability, error taxonomy, security,
   feature flags, caching, i18n, a11y, testing)
8. Deployment and environments
9. Architectural decisions (ADR log, linked MADR entries)
10. Risks, technical debt, open questions

## 5. Work-package model

### 5.1 Two-tier design

The work package is the sprint-scale unit of delivery.

```text
domain/{d}/
  solution.md              # durable, domain-wide
  ...

work/{d}/01-foundations/
  design.md                # walking-skeleton sketch
  backlog.md               # sprint-1 stories

work/{d}/02-.../
  design.md                # detailed TDD
  backlog.md               # sprint-N stories
```

Work-package design **always** references `domain/{d}/solution.md` rather
than re-narrating it. The single quality rule:

> The work-package design MUST cite `domain/{d}/solution.md#section` for
> any pattern, policy, contract, or decision that applies beyond this
> sprint. It MUST NOT redefine them. If a pattern is specific to this WP
> only, it lives here; if it will apply to later WPs, promote it to
> `solution.md` at sprint close via `refine-docs`.

This is the rule that prevents the 595-line WP design problem observed
in storefront-space.

### 5.2 Foundation-sprint design vs later-sprint design

The `write-wp-design` skill takes a `--mode` argument.

**Walking-skeleton mode (foundation sprint, 2-4 pages)**:

- The one end-to-end slice in one paragraph
- File layout to be created (exact paths)
- Acceptance gates: CI green, one real request round-trips, observability
  hook fires, error path exercised
- No detailed sequence diagrams or deep sequence flows yet

**TDD mode (sprint 2+, 5-10 pages)**:

- References `solution.md` sections (durable patterns)
- References prior WP `design.md` sections (WP-specific extensions)
- Sequence diagrams for the flows this WP enables
- Exact function signatures, Zod schemas, error paths introduced
- Test strategy for this WP
- 1:1 map to stories in the WP backlog

### 5.3 WP backlog schema

Story blocks in `work/{d}/{wp}/backlog.md` follow a fixed schema so the
publish pipeline can parse them deterministically.

```markdown
- [ ] **[CART01-01] Cart module scaffold and view-model types**
  - **Status:** Not started
  - **Priority:** P0
  - **Estimate:** 3
  - **Epic:** CART01
  - **Labels:** phase:alpha, domain:cart
  - **Depends on:** CART01-00
  - **Deliverable:** <one paragraph>
  - **Design:** work/cart/01-foundations/design.md#2-module-structure
  - **Acceptance (EARS):**
    - WHEN a developer imports from `modules/cart`, THE SYSTEM SHALL
      expose `CartViewModel` via `logic/types.ts`.
    - WHEN `pnpm typecheck` runs, THE SYSTEM SHALL pass with zero `any`.
  - **Acceptance (Gherkin):**
    - Given the cart module
      When `pnpm test modules/cart` runs
      Then all type tests pass
```

`[CART01-01]` is canonical in Markdown unless `issues.source = jira`,
in which case the Jira key replaces it (Section 6.2).

Domain `backlog.md` carries a shorter epic schema:

```markdown
- **[CART01] Cart Foundation and Module Scaffold**
  - **Phase:** Alpha
  - **Priority:** P0
  - **Points:** 19
  - **Depends on:** -
  - **Work package:** work/cart/01-foundations/
  - **Status:** In progress
  - **Summary:** <one paragraph>
```

## 6. Publish pipeline

### 6.1 Doc-to-destination mapping

| Space artefact                            | Destination system | Jira type     | Notes                                         |
| ----------------------------------------- | ------------------ | ------------- | --------------------------------------------- |
| `docs/product.md` (platform)              | Confluence         | -             | Portfolio context page                        |
| `docs/roadmap.md` (platform)              | Jira Plans + Conf  | Initiative    | Phases become fix versions                    |
| `domain/{d}/product.md`                   | Confluence         | -             | Domain context page                           |
| `domain/{d}/solution.md`                  | Confluence         | -             | Architecture page; linked from every Epic     |
| `domain/{d}/contracts.md`                 | Confluence         | -             | Index page; links to source files             |
| `domain/{d}/roadmap.md`                   | Jira Plans         | Phase labels  | Fix-version or release                        |
| `domain/{d}/backlog.md`                   | Jira               | **Epic**      | One per row                                   |
| `work/{d}/{wp}/design.md`                 | Confluence         | -             | Linked from the Jira Epic as design page      |
| `work/{d}/{wp}/backlog.md`                | Jira               | **Story**     | Under the Epic; AC rendered per config        |

Rule: **Confluence owns prose, Jira owns work.**

### 6.2 Issue key ownership

Configured in `.space/config`:

```yaml
issues:
  source: jira                  # jira | markdown
  provider: jira-cloud
  project: STORE
  ac_format: ears+gherkin       # ears | gherkin | ears+gherkin
  ac_placement: description     # description | subtasks | custom_field:AC
  key_canonical: jira           # jira | local
```

**When `source: jira`**: Jira is authoritative. The Jira key is the
canonical identifier in Markdown. Local aliases (e.g. `CART01-01`) are
optional and, if used, stored as labels on the Jira issue
(`space:CART01-01`). `space publish jira` only reconciles updates; it does
not create issues from Markdown alone.

**When `source: markdown`**: Markdown is authoritative. Local IDs are
canonical. `space publish jira` creates and updates Jira issues and writes
the Jira key back to a sidecar at `.space/sources/jira/mapping.json`.
Local IDs survive Jira project renames.

### 6.3 `space publish jira` behaviour

```text
space publish jira --dry-run
  reads domain/{d}/backlog.md (epics) and work/{d}/{wp}/backlog.md (stories)
  parses per the schemas in Section 5.3
  diffs against .space/sources/jira/issues.json
  prints a plan: N creates, N updates, N no-ops
  exits without calling Jira

space publish jira
  applies the plan
  (markdown-source mode) writes jira_key mapping back to the sidecar
  (jira-source mode) refuses to create new issues; logs a warning and skips
  writes the updated mirror to .space/sources/jira/
```

`space publish confluence` is analogous for prose docs (Phase 2 of the
`space-v2` work).

### 6.4 Field mapping

| Markdown field | Jira field                                         |
| -------------- | -------------------------------------------------- |
| `[ID]`         | External ID on first sync; key on subsequent       |
| Title          | Summary                                            |
| Status         | Status (via workflow transitions)                  |
| Priority       | Priority                                           |
| Estimate       | Story points                                       |
| Epic           | Parent (Epic link)                                 |
| Labels         | Labels                                             |
| Depends on     | Issue link: `blocks` / `is blocked by`             |
| Deliverable    | Description (first paragraph)                      |
| Design         | Description (remote link to Confluence page)       |
| Acceptance     | Description (checklist) or sub-tasks, per config   |

## 7. Skill changeset

The complete set of changes to `packages/skills/`. Ordered by priority.

### 7.1 P0 -- seam and routing

| Action                                                                  | Skill                       |
| ----------------------------------------------------------------------- | --------------------------- |
| **Add** arc42-lite `write-solution` skill with stub and full modes      | `write-solution/`           |
| **Refactor** `write-product`: pitch mode (Phase 0) + product mode (P2)  | `write-product/`            |
| **Refactor** `write-backlog` domain scope: phase-1-only epic list       | `write-backlog/`            |
| **Split** `design` into walking-skeleton and TDD modes                  | `design/` (rename/extend)   |
| **Add** executable `write-contracts` skill                              | `write-contracts/`          |
| **Add** negative-constraint comment blocks to every template            | all `template*.md`          |
| **Rewrite** every skill description to Anthropic's rules                | all `SKILL.md`              |
| **Lock down** backlog schema (EARS + Gherkin) in both templates         | `write-backlog/template*`   |
| **Add** enriched frontmatter schema across all skills                   | all `SKILL.md`              |

### 7.2 P1 -- tooling, orchestration, views

| Action                                                                  | Skill / location            |
| ----------------------------------------------------------------------- | --------------------------- |
| **Add** `space-index` router skill; body auto-generated in CI           | `space-index/`              |
| **Add** generated role views: `pm.md`, `architect.md`, `engineer.md`    | `packages/skills/views/`    |
| **Add** profile YAMLs and `space sync skills --profile X`               | `packages/skills/profiles/` |
| **Add** description eval loop (`skill-creator run_loop.py`) in CI       | tooling                     |
| **Add** `pnpm lint:docs`: frontmatter schema, link check, budgets       | tooling                     |
| **Add** `plan-delivery` orchestrator for Phase-0 artefact sequencing    | `plan-delivery/`            |
| **Add** `refine-docs` sprint-end skill (promote ADRs -> solution.md)    | `refine-docs/`              |
| **Add** `space publish jira` with source-aware behaviour + dry-run      | `packages/space/`           |

### 7.3 P2 -- optional and regulated-only

| Action                                                                  | Skill / location            |
| ----------------------------------------------------------------------- | --------------------------- |
| **Retire** `write-requirements` from default profile; keep as optional  | `requirements/`             |
| **Mark** `write-metrics`, `write-roadmap` as `stage: deferred`          | both `SKILL.md`             |
| **Add** `space publish confluence` for prose docs                       | `packages/space/`           |
| **Add** nested `AGENTS.md` template: root + per-domain                  | `packages/create-space/`    |
| **Add** `write-adr` standalone skill (separate from `plan-adr`)         | `write-adr/`                |

## 8. Migration plan for storefront-space

Storefront-space is the v0 validation workspace. It has live artefacts
under `domain/cart/`, `domain/pdp/`, and `domain/checkout/` that must not
be invalidated. The migration is phased to minimise disruption.

### 8.1 Migration phases

#### Phase A -- land the v2 skills (no workspace changes)

1. Ship the P0 skill changes to `@tpw/skills` in a single minor release
   (0.3.0). Publish; no workspace needs to re-sync yet.
2. Storefront-space pins `@tpw/skills@~0.2.0` until it explicitly opts in.

#### Phase B -- opt-in storefront-space

1. Bump `storefront-space` to `@tpw/skills@^0.3.0`.
2. Run `space sync skills --profile domain-team`.
3. For **new** domains (e.g. checkout if not started), use the v2
   templates from the start.
4. For **in-flight** domains (cart, pdp), leave existing docs in place.
   Mark them `version: '1.x (legacy-v0)'` and do not regenerate.

#### Phase C -- fold in-flight domains forward at natural boundaries

1. When a domain reaches a phase gate (e.g. cart finishes Alpha), run
   `refine-docs` to produce the v2 artefact set from the actual shipped
   code:
   - Extract `solution.md` (full) from the domain's current
     `design.md` + ADRs.
   - Extract `roadmap.md` (Now/Next/Later) from `backlog.md` + what
     actually shipped.
   - Trim `product.md` to pitch-or-product-stage content per Section 4.5.
2. Archive v0 documents under `domain/{d}/_legacy/`.
3. Re-parent work-package docs to reference the new `solution.md`.

#### Phase D -- publish-pipeline dogfood

1. Configure `.space/config` with `issues.source: jira` (storefront
   already uses Jira as source of truth).
2. Run `space publish jira --dry-run` against the new schema.
3. Fix any schema drift in domain + WP backlogs.
4. Go live.

### 8.2 What to do with cart specifically

Cart is the most diverged domain (13 docs, 20-30 pages). Recommended fold-
forward actions at the next phase gate:

| Current file                                   | Action                                                         |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `domain/cart/product.md` (175 lines)           | Trim to pitch + product-stage sections; strip tech content     |
| `domain/cart/design.md` (425+ lines)           | Promote to `domain/cart/solution.md` (full mode)               |
| `domain/cart/contracts.md`                     | Keep; align to executable schema                               |
| `domain/cart/requirements.md` (381+ lines)     | Archive to `_legacy/`; AC already lives in WP backlogs         |
| `domain/cart/metrics.md`                       | Keep; verify baselines are measured, not aspirational          |
| `domain/cart/roadmap.md`                       | Trim to Now/Next/Later; remove epic-level detail               |
| `domain/cart/backlog.md` (429+ lines)          | Trim to Alpha-phase epics; later phases -> placeholders        |
| `domain/cart/dependencies/*.md`                | Keep as-is; these are real cross-squad artefacts               |
| `domain/cart/decisions/proposed-adrs.md`       | Split into individual `ADR-NNNN-*.md` files                    |
| `domain/cart/research/legacy-analysis.md`      | Keep as-is (one-off input artefact)                            |
| `work/cart/01-foundations/design.md` (595 ln)  | Trim aggressively: reference `solution.md`, don't re-narrate   |
| `work/cart/01-foundations/backlog.md`          | Normalise to the Section 5.3 schema                            |

## 9. Open questions

These are deliberately parked, not resolved in this document. Each should
be decided before the corresponding skill or change ships.

1. **Jira AC placement default.** `description` (lower Jira noise) or
   `subtasks` (per-AC tracking)? Recommendation: `description` default,
   `subtasks` opt-in. Confirm with the first consuming team.
2. **Local vs Jira key visibility.** When `key_canonical: jira`, should
   the local alias still appear in Markdown (as a code-block tag) or be
   elided entirely? Recommendation: elided; rely on Jira key alone.
3. **Profile naming.** `minimal / domain-team / platform / full` vs
   role-named profiles (`pm / architect / engineer`). Recommendation:
   scope-named (current), because role-named profiles would need N ways
   to say "domain-team + platform".
4. **`write-adr` vs `plan-adr`.** Today `plan-adr` exists; a standalone
   `write-adr` is listed P2. Confirm whether the orchestrator plus a
   single skill is enough, or both are needed.
5. **Walking-skeleton naming.** Keep `work/{wp}/design.md` with mode
   parameter, or introduce a distinct `walking-skeleton.md` at foundation
   sprint scope? Recommendation: keep `design.md` with mode to minimise
   path changes.
6. **`AGENTS.md` scope.** Space root + per-domain is agreed. Should
   `packages/*/AGENTS.md` also roll up into the root, or stay
   package-local (current)? Recommendation: stay package-local.

## 10. Non-goals

Stated so this document does not drift in future revisions.

- **Multi-package split** of `@tpw/skills` by role. Rejected in Section
  3.1.
- **Embedding search / Tool Search tool** for skill routing. Rejected in
  Section 3.5.
- **Separate `human_description` field** on skills. Rejected; would drift
  from `description` over time.
- **Speculative ADRs** written before decisions arise. Rejected per
  Ambler JBGE (Section 2.3).
- **Full pre-sprint `requirements.md`** at domain scope. Retired except
  for regulated / contractual domains (Section 7.3).
- **Constitution as a first-class artefact** at this stage. Can revisit
  if agent drift on non-negotiables becomes measurable; excluded for now
  to keep the Phase 0 set at five domain-scope artefacts.
- **Work-package design as a re-narration** of domain design. Rejected
  explicitly in Section 5.1.
- **Cross-workspace skill distribution** (workspace A's skills in
  workspace B). Out of scope; `space sync skills` pulls from npm only.

---

## Appendix A -- Glossary

- **Phase 0** -- Before the foundation sprint starts. Pre-code.
- **Phase 1** -- During the foundation sprint. Walking-skeleton walks.
- **Phase 2** -- After the foundation sprint. Team has learnt.
- **Foundation sprint** -- The sprint that lands the walking skeleton.
- **Walking skeleton** -- Cockburn's thinnest end-to-end slice that can
  be automatically built, deployed, and tested.
- **Work package (WP)** -- A sprint-scale unit of delivery under
  `work/{domain}/{nn}-name/`.
- **Domain** -- A sub-product owned by a squad, under `domain/{name}/`.
- **Pitch stage** -- Phase 0 mode of `product.md` (Shape Up, <=2 pages).
- **Product stage** -- Phase 2+ mode of `product.md` (<=5 pages).
- **Stub mode** -- Phase 0 mode of `solution.md` (two sections).
- **Full mode** -- Phase 2+ mode of `solution.md` (ten sections).
- **Walking-skeleton mode** -- Foundation-sprint WP `design.md` (2-4 pp).
- **TDD mode** -- Sprint 2+ WP `design.md` (5-10 pp).
- **Issue source** -- `.space/config.issues.source`; `jira` or
  `markdown`. Determines key ownership.

## Appendix B -- Acceptance test for this design

This document has itself been calibrated against the rule in Section 2.4.
Sections in this document that fail the test are deferred to later
revisions, not removed:

- Specific template prose -> deferred; tracked per skill
- Detailed migration story AC -> deferred to `docs/backlog.md` entries
- Exact frontmatter JSON Schema -> deferred to `pnpm lint:docs`
  implementation

This design is complete when, and only when, the reader can answer these
questions from it without consulting another document:

1. What five artefacts does my domain need before sprint 1? (Section 4.1)
2. What is the seam between product and solution? (Sections 2.1, 4.4)
3. Where does technical content go if not in `product.md`? (Section 4.5)
4. How does my work-package design differ at sprint 1 vs sprint N?
   (Section 5.2)
5. Who owns the issue key, my Markdown or Jira? (Section 6.2)
6. How does the skills package scale from 15 to 40 skills? (Section 3)

If any answer is unclear, this design has failed its own calibration rule
and must be tightened, not expanded.
