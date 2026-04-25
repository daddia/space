---
type: Design
scope: work-package
mode: tdd
work_package: 02-skills-v2
epic: SPACE-02
product: space
version: "1.0"
owner: Horizon Platform
status: Draft
last_updated: 2026-04-23
related:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
  - docs/design/space-artefact-model.md
  - work/02-skills-v2/backlog.md
  - work/01-source-sync/design.md
---

# Design -- Space v2 Skill Changeset (SPACE-02)

TDD-mode design for the **Space v2 artefact model: skill changeset** work package at `work/02-skills-v2/`, implementing SPACE-02 from [`docs/backlog.md`](../../docs/backlog.md).

This work package builds on the platform substrate (source sync, scaffolding, package distribution) that SPACE-01 established. Package distribution, `sync-skills`, and the npm release pipeline are stable and not changed here. Domain-wide patterns (skill structure, SKILL.md frontmatter, example conventions) are authoritative in [`docs/solution.md`](../../docs/solution.md) and [`docs/design/space-artefact-model.md`](../../docs/design/space-artefact-model.md) and are not repeated here.

References to artefact-model sections appear inline throughout. The worked exemplar for every template produced here is the cart domain in `storefront-space` (`domain/cart/`, `work/cart/01-foundations/`, `work/cart/02-add-to-cart/`).

## 1. Scope

### 1.1 In scope

Implement the P0 skill changeset from `docs/design/space-artefact-model.md` §7.1:

- **New skill: `write-solution`** — produces `domain/{d}/solution.md` in stub mode (Phase 0) or full arc42-lite mode (Phase 2+). The highest-value missing skill.
- **New skill: `write-contracts`** — produces `domain/{d}/contracts.md` (index) + `domain/{d}/contracts/*.ts` (executable types/schemas). Enforces the "executable, not prose" contract convention.
- **Refactor: `write-product`** — two modes (`--stage pitch` and `--stage product`); negative-constraint block in template; description rewritten to Anthropic rules.
- **Refactor: `write-backlog`** — domain scope now defaults to phase-1-only epic list; EARS + Gherkin locked down in `template-work-package.md`; description rewritten.
- **Refactor: `design`** — renamed to `write-wp-design`; mode parameter (`--mode walking-skeleton` and `--mode tdd`); description rewritten. Backward-compatible rename via an alias entry.
- **Cross-cutting: enriched frontmatter** — add `artefact`, `phase`, `role[]`, `domain`, `stage`, `consumes[]`, `produces[]`, `prerequisites[]`, `related[]`, `tags[]`, `owner` to every SKILL.md. Mirror salient terms in every `description` field (the only routing signal agents see).
- **Cross-cutting: description rewrites** — every SKILL.md description rewritten to Anthropic skill-creator rules: third-person, verb-ing, literal trigger phrases, neighbour disambiguation, 200–500 chars.
- **Cross-cutting: negative-constraint blocks** — add `<!-- DO NOT INCLUDE -->` HTML comment to the top of every `template*.md`. The comment is for the skill generator only; `pnpm lint:docs` (SPACE-03) will assert it does not appear in output artefacts.
- **Release** — publish `@tpw/skills@0.3.0` from the monorepo and validate against the `storefront-space` cart exemplar.

### 1.2 Out of scope

- `space-index` router skill, role views, profiles, description eval loop in CI, `pnpm lint:docs` — SPACE-03.
- `plan-delivery` orchestrator, `refine-docs` sprint-end skill — SPACE-03.
- `space publish jira` / `space publish confluence` — SPACE-04 / SPACE-05.
- Retiring `write-requirements` or marking `write-metrics` / `write-roadmap` as `stage: deferred` — deferred to SPACE-03 when profiles exist.
- Migrating `storefront-space` legacy domains (pdp, checkout) to v2 templates — done at natural phase gates per `docs/design/space-artefact-model.md` §8.

### 1.3 Capabilities this work package delivers

Mapped to the story-level AC in [`./backlog.md`](backlog.md):

- **`write-solution` skill** (new, two modes): SPACE-02-01.
- **`write-contracts` skill** (new, executable template): SPACE-02-02.
- **`write-product` refactor** (pitch + product modes, negative constraints): SPACE-02-03.
- **`write-backlog` refactor** (phase-1 default, EARS + Gherkin lock-down): SPACE-02-04.
- **`write-wp-design` skill** (rename + walking-skeleton + TDD modes): SPACE-02-05.
- **Enriched frontmatter** on all 14 skills: SPACE-02-06.
- **Description rewrites** on all 14 skills: SPACE-02-07.
- **Negative-constraint template blocks** on all 14 templates (10 not covered by 01–05): SPACE-02-08.
- **Release 0.3.0 + validation** against the cart exemplar: SPACE-02-09.

## 2. Architecture fit

This WP changes only `packages/skills/` (Markdown only, no build step). The `sync-skills` postinstall bin reads and copies whatever is in that directory — no changes to the bin, to `@tpw/create-space`, or to `@tpw/space`. Consuming workspaces pick up the new and changed skills on the next `pnpm install` or `pnpm update @tpw/skills`.

References in [`docs/solution.md`](../../docs/solution.md):

- §4.2 Level 2 — the `@tpw/skills` package responsibilities and skill directory structure.
- §3.1 Skills are content — why no build step; how portability is maintained.
- §6.4 `SKILL.md` frontmatter schema — the v2 additions this WP implements.

References in [`docs/design/space-artefact-model.md`](../../docs/design/space-artefact-model.md):

- §3.2 — enriched frontmatter field list and what each field does.
- §3.3 — description authoring rules (Anthropic skill-creator format).
- §4.5 — per-artefact negative constraints (the `<!-- DO NOT INCLUDE -->` lists).
- §4.6 — `product.md` pitch vs product stage.
- §4.7 — `solution.md` stub vs full mode.
- §7.1 — the P0 changeset table this WP implements.

## 3. Files and changes

### 3.1 New skill directories

```text
packages/skills/
  write-solution/
    SKILL.md                  NEW
    template-stub.md          NEW   Phase 0: §1–2 only; §3–10 are [NEEDS CLARIFICATION]
    template-full.md          NEW   Phase 2+: all 10 arc42-lite sections
    examples/
      space-solution.md       NEW   platform-scope exemplar (docs/solution.md)
      cart-solution.md        NEW   domain-scope exemplar (storefront-space domain/cart/solution.md)

  write-contracts/
    SKILL.md                  NEW
    template.md               NEW   index page + one TypeScript source block per contract
    examples/
      cart-contracts.md       NEW   from storefront-space domain/cart/contracts.md
```

### 3.2 Modified skill directories

```text
packages/skills/
  write-product/
    SKILL.md                  EVOLVE  description, frontmatter, mode param, quality rules
    template.md               SPLIT   → template-pitch.md + template-product.md
    examples/
      space-product.md        NEW     platform-scope exemplar (docs/product.md)
      cart-product.md         UPDATE  repoint to v2 exemplar

  write-backlog/
    SKILL.md                  EVOLVE  description, frontmatter, phase-1 default doc
    template-domain.md        EVOLVE  add negative-constraint block + phase-1 structure
    template-work-package.md  EVOLVE  lock down EARS+Gherkin story schema
    examples/
      space-domain-backlog.md NEW     platform-scope exemplar (docs/backlog.md)
      cart-domain-backlog.md  UPDATE  repoint to v2 exemplar

  design/
    SKILL.md                  EVOLVE  rename to write-wp-design + mode param + description
    template.md               SPLIT   → template-walking-skeleton.md + template-tdd.md
    examples/
      cart-wp01-walking-skeleton.md  NEW  from work/cart/01-foundations/design.md
      cart-wp02-tdd.md               NEW  from work/cart/02-add-to-cart/design.md

  write-adr/        EVOLVE SKILL.md (frontmatter + description)
  write-roadmap/    EVOLVE SKILL.md (frontmatter + description)
  write-metrics/    EVOLVE SKILL.md (frontmatter + description)
  create-mr/        EVOLVE SKILL.md (frontmatter + description)
  implement/        EVOLVE SKILL.md (frontmatter + description)
  plan-adr/         EVOLVE SKILL.md (frontmatter + description)
  requirements/     EVOLVE SKILL.md (frontmatter + description)
  review-adr/       EVOLVE SKILL.md (frontmatter + description)
  review-code/      EVOLVE SKILL.md (frontmatter + description)
  review-docs/      EVOLVE SKILL.md (frontmatter + description)
  validate/         EVOLVE SKILL.md (frontmatter + description)
```

### 3.3 Package metadata

```text
packages/skills/
  package.json    BUMP  0.2.x → 0.3.0
  CHANGELOG.md    ADD   v0.3.0 entry
```text

No changes to `bin/`, `profiles/`, `views/` (those land in SPACE-03).

## 4. Per-skill design

### 4.1 `write-solution` (new)

**Purpose.** Produces `domain/{d}/solution.md` in two modes controlled by a `--stage` argument.

**Stub mode (`--stage stub`, Phase 0, ≤2 pages):**

Only §1 and §2 are filled. Sections §3–10 are scaffolded as headings with `[NEEDS CLARIFICATION]` placeholders. The team gets an architectural anchor without inventing solution content before the walking skeleton walks.

```markdown
## 1. Context and scope
<!-- C4 Level 1: what this domain owns vs consumes; upstream/downstream systems -->

## 2. Quality goals and constraints
<!-- Top 3–5 NFRs + org/regulatory constraints -->

## 3. Solution strategy
[NEEDS CLARIFICATION]
...
## 10. Risks, technical debt, open questions
[NEEDS CLARIFICATION]

## 11. Graduation candidates
[NEEDS CLARIFICATION]
```text

**Full mode (`--stage full`, Phase 2+, 8–12 pages):**

All ten arc42-lite sections plus §11 Graduation candidates (see `artefact-model.md` §4.7 for section definitions). The skill is passed the walking-skeleton design doc and any emergent ADRs as context; it reverse-engineers the formal solution from what actually shipped.

**Negative-constraint block (in both templates):**

```html
<!--
DO NOT INCLUDE in solution.md:
  - Commercial rationale or business case       → product.md
  - Target customer segments or personas        → product.md
  - Strategic thesis or product principles      → product.md
  - Positioning or messaging                    → product.md
  - User quotes                                 → product.md
-->
```

**Frontmatter additions:**

```yaml
artefact: solution.md
phase: discovery        # stub mode
# or
phase: definition       # full mode
role: [architect, engineer]
domain: architecture
stage: stable
consumes: [product.md, contracts.md]
produces: [solution.md]
prerequisites: [product.md]
related: [write-product, write-adr, write-contracts, write-wp-design]
```

**Description (rewritten to Anthropic rules, 200–500 chars):**

```text
Drafts solution.md for a domain in stub mode (Phase 0, two sections) or full
arc42-lite mode (Phase 2+, ten sections). Use when the user mentions "solution
design", "architecture", "how will this work", or "what should we build". Stub
mode generates an architectural anchor with placeholders; full mode
reverse-engineers from a shipped walking skeleton. Do NOT use for business
strategy — use write-product for that. Do NOT use for sprint-level TDD — use
write-wp-design for that.
```text

**Exemplar files:**

- Platform scope: `examples/space-solution.md` → points at `docs/solution.md` in this repo (the space's own solution doc is the canonical worked example).
- Domain scope: `examples/cart-solution.md` → points at `storefront-space/domain/cart/solution.md`.

### 4.2 `write-contracts` (new)

**Purpose.** Produces `domain/{d}/contracts.md` (an index page) and `domain/{d}/contracts/*.ts` (executable TypeScript / Zod / OpenAPI). Contracts are always executable; prose descriptions of shapes are prohibited in the output.

**Template structure:**

```markdown
# Contracts -- {Domain}

## 1. BFF types
\`\`\`typescript
// BFF type imports and aliases
\`\`\`

## 2. View-model types
\`\`\`typescript
// CartViewModel + slice types
\`\`\`

## 3. Error taxonomy
\`\`\`typescript
// CartMutationErrorCode enum
\`\`\`

## 4. API route contracts
| Path | Method | Request | Response |
| ---- | ------ | ------- | -------- |

## 5. Analytics event schema
\`\`\`typescript
// event envelope + per-event payloads
\`\`\`

## 6. Cache tags and cache directives
```text

**Negative-constraint block:**

```html
<!--
DO NOT INCLUDE in contracts.md:
  - Prose that describes what a shape means     → solution.md
  - Business rationale for a contract           → product.md
  - Implementation patterns or how shapes are produced → solution.md or design.md
Only executable code + one worked example per contract.
-->
```

**Frontmatter additions:**

```yaml
artefact: contracts.md
phase: discovery
role: [architect, engineer]
domain: architecture
stage: stable
consumes: [solution.md]
produces: [contracts.md]
prerequisites: [solution.md]
related: [write-solution, write-wp-design]
```

**Description:**

```text
Produces contracts.md for a domain as an executable index of types, Zod
schemas, API route contracts, and analytics event payloads. Use when the user
asks for "contracts", "types", "schema", or "interface definitions" for a
domain. Output is TypeScript / Zod / OpenAPI source with one worked example per
contract, not prose. Do NOT use for solution architecture — use write-solution.
Do NOT use for work-package design — use write-wp-design.
```text

### 4.3 `write-product` (refactor)

**Mode split.** The current single template is split into two:

- `template-pitch.md` — Shape Up pitch format (Phase 0, ≤2 pages): Problem / Appetite / Sketch / Rabbit holes / No-gos.
- `template-product.md` — extended product doc (Phase 2+, ≤5 pages): the pitch sections plus Target users / Outcome metrics / Product principles / Stakeholders / Relationship to parent.

The skill body gains a `--stage pitch|product` argument. When no argument is passed the skill asks the caller whether they are pre-foundation-sprint (pitch) or post-foundation-sprint (product).

**Negative-constraint block added to both templates:**

```html
<!--
DO NOT INCLUDE in product.md:
  - File paths, module names, class names             → solution.md
  - API endpoints, HTTP verbs, schemas, type aliases  → solution.md or contracts.md
  - Tech stack names (React, Zustand, Next.js, etc.)  → solution.md
  - ADR numbers or decision rationales                → solution.md §9
  - Deployment topology or environment details        → solution.md §8
  - Component or service names                        → solution.md §4
-->
```text

**Quality rules added to SKILL.md:**

- Must NOT reference file paths, module names, class names, API endpoints, schemas, type aliases, tech stack, ADR numbers, or library names.
- Must read as-is to a non-technical stakeholder without glossary.
- Pitch stage: ≤2 pages. Product stage: ≤3 pages for a domain sub-product, ≤5 pages for a platform product.

**Description rewrite (product stage):**

```text
Drafts product.md for a platform or domain sub-product in pitch mode (Phase 0,
Shape Up format, ≤2 pages) or product mode (Phase 2+, ≤5 pages). Use when the
user mentions "product doc", "PRD", "product strategy", "what are we building",
"why are we building this", or "product brief". Pitch mode is written before any
epics exist; product mode extends it post-foundation-sprint. Do NOT include tech
stack, APIs, or component names — use write-solution for architecture. Do NOT
use for roadmaps — use write-roadmap.
```text

**Examples updated.** `examples/` gains `space-product.md` (pointing at `docs/product.md`); the existing `examples/cart-product.md` is updated to reflect the product-stage shape.

### 4.4 `write-backlog` (refactor)

**Domain scope defaults to phase-1-only.** The current SKILL.md produces all phases in one document. The refactored version produces only the Now phase by default and marks later phases as single-line placeholders:

```markdown
| CART07 | Line item polish | Next | P1 | ... | TBD | planned | Not started |
| CART08 | Promo code       | Next | P1 | ... | TBD | planned | Not started |
```text

The `--depth full` flag produces all phases with full epic detail. This matches `artefact-model.md` §3 calibration rule: if removing a phase would not block Story 1 on Monday, it belongs in Phase 1 or 2 output.

**EARS + Gherkin schema lock-down in `template-work-package.md`.** Every story block in the template gains the canonical schema from `artefact-model.md` §5.3:

```markdown
- [ ] **[{ID}] {Title}**
  - **Status:** Not started
  - **Priority:** {P0|P1|P2}
  - **Estimate:** {fibonacci}
  - **Epic:** {EPIC-ID}
  - **Labels:** {phase:xxx, domain:xxx}
  - **Depends on:** {ID or -}
  - **Deliverable:** {one paragraph}
  - **Design:** {work/path/design.md#section}
  - **Acceptance (EARS):**
    - WHEN ... THE SYSTEM SHALL ...
  - **Acceptance (Gherkin):**
    ```gherkin
    Scenario: ...
      Given ...
      When ...
      Then ...
    ```
```

**Description rewrite:**

```text
Drafts a domain-level epic backlog (domain scope) or sprint-level story
backlog (work-package scope). Use when the user mentions "backlog",
"epic list", "stories", "decompose", or "write the backlog for {domain}".
Domain scope defaults to the Now phase only — use --depth full for all phases.
Work-package scope produces EARS + Gherkin acceptance criteria per the canonical
story schema. Do NOT use for solution architecture — use write-solution. Do NOT
use for roadmaps — use write-roadmap.
```text

**Examples updated.** `examples/space-domain-backlog.md` added (pointing at `docs/backlog.md`); `examples/cart-wp01-backlog.md` updated to v2 EARS+Gherkin schema.

### 4.5 `write-wp-design` (rename + split, was `design`)

**Rename.** The directory `design/` is renamed to `write-wp-design/`. The old `design` name is reserved as an alias (a minimal `SKILL.md` that points callers at `write-wp-design`) so existing workspace references do not break until SPACE-03 cleans them.

**Mode split.** The skill gains a `--mode walking-skeleton|tdd` argument:

**Walking-skeleton mode (`--mode walking-skeleton`, Phase 0 / foundation sprint, 2–4 pages):**

```text
1. The slice (one paragraph: what the walking skeleton proves end-to-end)
2. Files shipped (exact paths, NEW/EVOLVE/KEEP, brief description)
3. Acceptance gates (end-to-end path; observability hook fires; error path exercised; scaffolds are complete; quality gates)
4. What this WP did NOT deliver (for later sprints to read)
5. Open questions closed during the sprint
6. Handoff to next WP
```

**TDD mode (`--mode tdd`, sprint 2+, 5–10 pages):**

```text
1. Scope (in scope, out of scope, capabilities this WP delivers)
2. Architecture fit (references to domain/solution.md sections)
3. Files and components (new files, modified files, files NOT modified)
4. Data contracts (schemas, types — code fences with concrete signatures)
5. Runtime view (sequence diagram or text flow for each key scenario)
6. Cross-squad coordination (if applicable)
7. Error paths (per error code, surface-specific treatment)
8. Observability (spans, metrics, log lines introduced)
9. Testing strategy (layer table)
10. Acceptance gates (subset for this WP)
11. Handoff
12. Open questions
```

**Negative-constraint block added to both templates:**

```html
<!--
DO NOT INCLUDE in this design.md:
  - Domain-wide patterns, policies, or decisions already in domain/solution.md
    → Reference solution.md sections instead (e.g. "per solution.md §3.2")
  - Business rationale                         → product.md
  - Phase sequencing                           → roadmap.md
  - Story-level acceptance criteria            → this WP's backlog.md
-->
```

**Description rewrite:**

```text
Drafts a work-package design document (sprint-level TDD) in walking-skeleton
mode (foundation sprint, 2–4 pages) or TDD mode (sprint 2+, 5–10 pages). Use
when the user mentions "design", "TDD", "technical design", "write the design
for {epic}", or "how should we implement {story}". Walking-skeleton mode names
the end-to-end slice, files shipped, and acceptance gates. TDD mode adds
sequence diagrams, exact signatures, and cross-squad coordination. Do NOT
re-narrate patterns from domain/solution.md — reference it instead. Do NOT
include business context — use write-product.
```text

**Examples added:**

- `examples/cart-wp01-walking-skeleton.md` → `storefront-space/work/cart/01-foundations/design.md`.
- `examples/cart-wp02-tdd.md` → `storefront-space/work/cart/02-add-to-cart/design.md`.

### 4.6 Enriched frontmatter (all 14 skills)

Every `SKILL.md` gains the following fields, per `artefact-model.md` §3.2. The `description` field is also updated to mirror the salient terms from the new frontmatter (because the description is the only routing signal agents see).

```yaml
# Added to every SKILL.md:
artefact: {output filename}       # e.g. product.md, solution.md, backlog.md
phase: {discovery|definition|delivery|operation}
role: [{pm|architect|engineer|delivery|qa}]
domain: {product|architecture|engineering|ops|qa}
stage: {experimental|beta|stable|deprecated}
consumes: [{artefact-filename}]   # inputs the skill reads
produces: [{artefact-filename}]   # outputs the skill writes
prerequisites: [{skill-name}]     # skills that must run first
related: [{skill-name}]           # neighbouring skills
tags: [{keyword}]
owner: "@horizon-platform"
```text

The `consumes` / `produces` pair is the highest-value addition: it encodes the cross-role handoff graph and lets `space-index` (SPACE-03) answer "I have `product.md`; what's next?" deterministically.

The complete mapping per skill:

| Skill | `artefact` | `phase` | `role` | `consumes` | `produces` |
| --- | --- | --- | --- | --- | --- |
| `write-solution` | `solution.md` | discovery / definition | architect, engineer | product.md, contracts.md | solution.md |
| `write-contracts` | `contracts.md` | discovery | architect, engineer | solution.md | contracts.md |
| `write-product` | `product.md` | discovery | pm, founder | — | product.md |
| `write-backlog` | `backlog.md` | definition / delivery | pm, delivery | product.md, solution.md, roadmap.md | backlog.md |
| `write-wp-design` | `work/{wp}/design.md` | delivery | architect, engineer | backlog.md, solution.md | design.md |
| `write-roadmap` | `roadmap.md` | discovery | pm | product.md | roadmap.md |
| `write-adr` | `ADR-NNNN.md` | delivery | architect, engineer | solution.md | adr.md |
| `write-metrics` | `metrics.md` | definition | pm, engineer | product.md | metrics.md |
| `plan-adr` | `adr-plan.md` | delivery | architect | solution.md | adr-plan.md |
| `implement` | — | delivery | engineer | design.md, backlog.md | code |
| `review-adr` | — | delivery | architect | adr.md | review |
| `review-code` | — | delivery | engineer | design.md, backlog.md | review |
| `review-docs` | — | definition | pm, architect, engineer | product.md, solution.md | review |
| `validate` | — | delivery | pm, delivery | backlog.md, solution.md | validation |
| `create-mr` | — | delivery | engineer | — | MR description |
| `requirements` | `requirements.md` | definition | pm, engineer | product.md | requirements.md |

### 4.7 Description authoring rules (applied to all 14 skills)

Rules per `artefact-model.md` §3.3 (Anthropic skill-creator format):

1. Third person, lead with a verb-ing clause (`Drafts…`, `Reviews…`, `Produces…`).
2. Enumerate at least two literal trigger phrases users actually type.
3. Disambiguate at least one neighbour explicitly (`Do NOT use for X — use skill-Y`).
4. Mention artefact names verbatim (`product.md`, not "the product spec").
5. Be mildly pushy when under-triggering is the risk: "Make sure to use this whenever the user mentions…"
6. 1–3 sentences, 200–500 characters.
7. Mirror the most salient `artefact`, `phase`, and `role` frontmatter values in natural language inside the description (because those fields are NOT routed on directly; only `description` is).

### 4.8 Negative-constraint blocks (remaining 10 skills)

The five new/refactored skills (01–05) have their negative-constraint blocks as part of the skill and template redesign above. The remaining 10 skills each have a `<!-- DO NOT INCLUDE -->` comment added to the top of every `template*.md` they ship. For skills with no template (e.g. `implement`, `review-code`, `create-mr`), the negative-constraint content lives in the SKILL.md `## Negative constraints` section instead, per `artefact-model.md` §4.5 rule 1.

## 5. Release and validation

### 5.1 Changeset and version

The skill library ships as a single minor release `0.3.0`. Change summary for `CHANGELOG.md`:

```text
## 0.3.0

### Added
- `write-solution`: new skill for solution.md in stub mode (Phase 0) and full arc42-lite mode (Phase 2+)
- `write-contracts`: new skill for contracts.md with executable TypeScript/Zod/OpenAPI output
- Enriched frontmatter on all skills: artefact, phase, role, domain, stage, consumes, produces, prerequisites, related, tags

### Changed
- `write-product`: refactored to pitch mode (Phase 0) and product mode (Phase 2+); negative-constraint blocks added to templates
- `write-backlog`: domain scope now defaults to phase-1 epics only (--depth full for all phases); work-package template locked to EARS + Gherkin story schema
- `design` → `write-wp-design`: renamed; mode parameter added (walking-skeleton / tdd); examples added for both modes
- All skill descriptions rewritten to Anthropic skill-creator format (third-person, trigger phrases, neighbour disambiguation)

### Deprecated
- `design` skill name: an alias SKILL.md is left in place for one release; callers should migrate to `write-wp-design`
```text

### 5.2 Validation against the cart exemplar

The validation target is the cart domain in `storefront-space`. The four domain docs and two work-package pairs in `domain/cart/` and `work/cart/` were produced using the artefact model we are now encoding as skills. Each new/changed skill is validated by confirming its output on a fresh run would match (or improve on) the corresponding exemplar:

| Skill | Validation input | Expected output | Exemplar file |
| --- | --- | --- | --- |
| `write-product --stage pitch` | Cart problem statement + Figma brief | pitch-stage product.md | `domain/cart/product.md` §1–5 |
| `write-product --stage product` | Same + users + metrics | product-stage product.md | `domain/cart/product.md` full |
| `write-solution --stage stub` | product.md + architecture principles | stub solution.md (2pp) | N/A (new) |
| `write-solution --stage full` | WP-01 design.md + ADRs | full solution.md | `domain/cart/solution.md` |
| `write-backlog domain` | product.md + roadmap.md | phase-1 epic list | `domain/cart/backlog.md` §3 (Now epics) |
| `write-backlog work-package` | domain/backlog.md + WP design | sprint backlog | `work/cart/02-add-to-cart/backlog.md` |
| `write-wp-design --mode walking-skeleton` | epic scope + CART01 story list | walking-skeleton design.md | `work/cart/01-foundations/design.md` |
| `write-wp-design --mode tdd` | solution.md + epic + CART02 scope | TDD design.md | `work/cart/02-add-to-cart/design.md` |
| `write-contracts` | solution.md + BFF types | contracts.md index | `domain/cart/contracts.md` |

Validation method: a human reviews the skill output in a `storefront-space` agent session and confirms the output would require no substantive manual editing to match the exemplar.

## 6. Testing strategy

| Layer | Scope | Target |
| --- | --- | --- |
| Structural lint (`bin/lint-skills.js`) | Every SKILL.md in `packages/skills/` has required frontmatter fields (`name`, `description`, `when_to_use`, `version`, `artefact`, `phase`, `role`, `produces`) | Blocks `pnpm validate` if any field is missing |
| Frontmatter schema test (Vitest) | Every SKILL.md parses against the v2 frontmatter TypeScript interface without error | 100% of skills |
| Description length check | Every `description` field is 200–500 characters | Blocks lint |
| Example file existence | Every skill with an `examples/` directory has at least one example file | Blocks lint |
| `pnpm validate` clean | Full monorepo validate (install, build, typecheck, lint, test) passes after changes | Green before release |
| Manual validation session | One human agent session in `storefront-space` exercising `write-product`, `write-solution`, `write-backlog`, and `write-wp-design` against cart exemplar | Pass before 0.3.0 tag |

## 7. Acceptance gates (this WP)

1. `pnpm validate` clean from the monorepo root after all changes.
2. `bin/lint-skills.js` passes with zero errors across all 14 skills.
3. Every SKILL.md has `description` length 200–500 chars.
4. Every SKILL.md has all required v2 frontmatter fields.
5. Every template has a `<!-- DO NOT INCLUDE -->` block (or the skill has a `## Negative constraints` section for templateless skills).
6. `write-solution`, `write-contracts`, `write-wp-design` are present as new skill directories.
7. `design/` has a backward-compatible alias SKILL.md.
8. `@tpw/skills@0.3.0` is published to the npm registry.
9. One human validation session confirms `write-product`, `write-solution`, `write-backlog`, and `write-wp-design` produce outputs that match the cart exemplar without substantive manual editing.

## 8. Handoff to SPACE-03

When SPACE-02 closes, the following are stable:

- All 14 skills have v2 frontmatter and Anthropic-format descriptions.
- `write-solution` and `write-contracts` are present and validated.
- EARS + Gherkin is the canonical AC format in `template-work-package.md`.
- The cart exemplar in `storefront-space` is the reference for all new examples added this sprint.
- `@tpw/skills@0.3.0` is live.

SPACE-03 picks up: `space-index` router skill (consumes the `produces`/`consumes` frontmatter fields this WP introduces), role views, description eval loop in CI, `pnpm lint:docs`, `plan-delivery` orchestrator.
