# Artefact Model

How a Space workspace organises its documents — what artefacts exist, where they live, what each one owns, and how they relate to each other.

## Workspace tiers

Every artefact lives at one of three tiers. The tier determines the save path and what the document is responsible for.

| Tier         | `scope:`       | Save path                      | What it describes                                                                     |
| ------------ | -------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Portfolio    | `portfolio`    | `product/{artefact}.md`        | A collection of related products — their thesis, sequencing, and commercial model     |
| Product      | `product`      | `product/{name}/{artefact}.md` | A single product — strategy, roadmap, and epic backlog                                |
| Domain       | `domain`       | `domain/{name}/{artefact}.md`  | A bounded context within a product — its architecture, contracts, and sprint backlogs |
| Work package | `work-package` | `work/{wp}/{artefact}.md`      | A sprint-scoped implementation unit                                                   |

Each artefact carries a `parent:` field pointing one tier up:

```yaml
# product/space/product.md
parent: product/product.md

# product/space/roadmap.md
parent: product/space/product.md

# domain/cart/solution.md
parent: product/product.md       # in a single-product workspace
# or
parent: product/storefront/product.md  # in a portfolio workspace
```

## Artefact types and their `type:` values

```yaml
type: Product Strategy    # product.md at any tier
type: Product Roadmap     # roadmap.md at any tier
type: Backlog             # backlog.md at any tier
type: Solution            # solution.md (architecture/solution.md in space repo)
type: Backlog             # backlog.md at work-package scope too
```

## The six core artefacts

### `product.md` — Strategy

Answers: **Why build this? For whom? What is in and out of scope?**

Written before epics exist. It is the anchor everything else references. Two modes:

- **Pitch** (Phase 0, ≤2 pages) — Problem, Appetite, Sketch, Rabbit holes, No-gos
- **Product** (Phase 2+, ≤5 pages) — extends the pitch with Target users, Outcome metrics, Principles, Stakeholders, Relationship to parent

### `roadmap.md` — Sequencing

Answers: **What capabilities ship in what order? What does "done" mean for each phase?**

Written after the product strategy is approved, before epics are decomposed. Maps capabilities to phases with exit criteria. Never lists epic IDs — those belong in the backlog.

### `backlog.md` — Delivery queue

Answers: **What is the team actually building? In what order? Against what acceptance criteria?**

Two scopes:

- **Domain scope** — epic-level list with estimates, dependencies, and work-package paths
- **Work-package scope** — story-level list with EARS + Gherkin acceptance criteria

### `solution.md` — Architecture

Answers: **How does the system work? What decisions have been made? What are the risks?**

Uses arc42-lite structure. Two modes:

- **Stub** (Phase 0, ≤2 pages) — §1 Context + §2 Quality goals; remaining sections scaffolded as `[NEEDS CLARIFICATION]`
- **Full** (Phase 2+, 8–12 pages) — all eleven sections including graduation candidates

### `contracts.md` — Executable types

Answers: **What are the exact TypeScript / Zod / OpenAPI shapes at every boundary?**

Load-bearing: agents hallucinate type shapes when contracts are not pinned. Content is executable code fences only, not prose.

### `metrics.md` — Measurement

Answers: **How do we know if the product is succeeding?**

Written after the walking skeleton walks (never before — baselines require shipped code). Contains north-star metric, input metrics, guardrail metrics.

## Content ownership matrix

One artefact is the authoritative source (**OWN**) for each type of content. Others may reference but not redefine.

| Content type                 | product | solution | roadmap | backlog | contracts | metrics |
| ---------------------------- | :-----: | :------: | :-----: | :-----: | :-------: | :-----: |
| Vision, strategic thesis     | **OWN** |   REF    |   REF   |    —    |     —     |    —    |
| Problem statement            | **OWN** |   REF    |   REF   |   REF   |     —     |    —    |
| Target user segments         | **OWN** |   REF    |    —    |   REF   |     —     |   REF   |
| Product scope (in/out)       | **OWN** |   REF    |   REF   |    —    |     —     |    —    |
| North-star metric targets    | **OWN** |    —     |   REF   |   REF   |     —     |   REF   |
| Metric instrumentation       |    —    |    —     |    —    |    —    |     —     | **OWN** |
| Technical non-goals          |   REF   | **OWN**  |    —    |    —    |     —     |    —    |
| API contracts and schemas    |    —    |   REF    |    —    |   REF   |  **OWN**  |    —    |
| System structure (C4 L2)     |    —    | **OWN**  |    —    |    —    |     —     |    —    |
| Data model                   |    —    | **OWN**  |    —    |    —    |    REF    |    —    |
| Error-handling strategy      |    —    | **OWN**  |    —    |   REF   |    REF    |   REF   |
| Observability strategy       |    —    | **OWN**  |    —    |    —    |    REF    |   REF   |
| Phase sequencing             |   REF   |   REF    | **OWN** |    —    |     —     |    —    |
| Cross-team dependencies      |   REF   |   REF    | **OWN** |   REF   |     —     |    —    |
| User stories + EARS criteria |    —    |    —     |    —    | **OWN** |    REF    |    —    |
| Architectural decisions      |    —    | **OWN**  |    —    |    —    |     —     |    —    |
| Tech stack choices           |    —    | **OWN**  |    —    |    —    |     —     |    —    |
| Technical risks and debt     |    —    | **OWN**  |   REF   |    —    |     —     |    —    |
| Product and market risks     | **OWN** |    —     |   REF   |    —    |     —     |    —    |

## Scope canonicalisation

The same scope boundary tends to appear in four places. To prevent drift:

- `product.md §5` (No-gos) owns the permanent out-of-scope list
- `roadmap.md §Later` owns capabilities deferred to a future phase
- `solution.md §1` owns the technical boundary only — for the full capability list it says "see `product.md §5`"
- `backlog.md §1` does not restate scope — it references the other two

## Roadmap vs backlog seam

|                  | `roadmap.md`                         | `backlog.md`                  |
| ---------------- | ------------------------------------ | ----------------------------- |
| Written          | Before epics exist                   | After roadmap is sequenced    |
| Unit             | Customer capability + exit criterion | Epic + estimate + dependency  |
| Vocabulary       | Outcome, phase, gate                 | Epic, story, points, WP       |
| Cites the other? | Never — no epic IDs                  | Yes — cites the roadmap phase |

The backlog is the many-to-one decomposition of roadmap phases into epics. If a roadmap entry needs an epic ID to make sense, it is not outcome-shaped and must be rewritten.

## Artefact references

Cross-repo references use the `{source}:{path}` URI scheme, where `{source}` maps to a key in `.space/config sources:` and `{path}` is relative to that source's root. Workspace-local paths need no prefix. See `architecture/conventions/artefact-references.md`.
