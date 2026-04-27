# Negative Constraints

How to prevent content from leaking between artefacts — the WHAT/WHY vs HOW seam, the enforcement mechanism, and the per-artefact rules.

## The seam

Every artefact in Space has a distinct responsibility. The most important boundary is between `product.md` (WHAT and WHY) and `solution.md` (HOW).

**`product.md` must be readable by a non-technical stakeholder without loss.** If a reader learns the tech stack, service names, database, or deployment topology from `product.md`, content has leaked.

**`solution.md` must be actionable by an engineer without loss.** If a reader learns the commercial rationale, target segments, or strategic thesis from `solution.md`, content has leaked.

The same principle applies at every boundary: each artefact owns certain content and must not redefine content owned by a sibling.

## Enforcement mechanism

Negative constraints live in two places:

1. **The skill's `## Negative constraints` section** — the primary mechanism. The skill reads it every invocation and refuses to emit prohibited content.
2. **The template's DRAFTING AIDE block** — an optional inline reminder for humans editing templates.

```markdown
<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this product.md:
  - File paths, module names, class names             → solution.md
  - API endpoints, HTTP verbs, schemas, type aliases  → solution.md or contracts.md
  - Tech stack names (React, Next.js, Zustand, etc.)  → solution.md
-->
```

The DRAFTING AIDE block must **not** appear in committed output. The `path.relative` lint rule and the doc-lint `negative-constraints` check assert this.

## Per-artefact rules

### `product.md`

Must not contain:
- File paths, module names, or class names → `solution.md`
- API endpoints, HTTP verbs, schemas, or type aliases → `solution.md` or `contracts.md`
- Tech stack names (React, Next.js, Zustand, Postgres, etc.) → `solution.md`
- ADR numbers or decision rationales → `solution.md §9`
- Deployment topology or environment details → `solution.md §8`
- Component or service names → `solution.md §4`

### `solution.md`

Must not contain:
- Commercial rationale or business case → `product.md`
- Target customer segments or personas → `product.md`
- Strategic thesis or product principles → `product.md`
- Positioning or marketing messaging → `product.md`
- User quotes → `product.md`
- Story-level acceptance criteria → `work/{wp}/backlog.md`
- Phase sequencing or epic ordering → `roadmap.md`

### `roadmap.md`

Must not contain:
- Epic IDs, story IDs, or any backlog identifiers — a roadmap names outcomes, not work items
- Story-level deliverables, estimates, or acceptance criteria
- Component names, schemas, file paths, or API names → `solution.md`
- Dates beyond the current "Now" phase — commitments evaporate; phase gates hold
- Inter-epic dependency tables → `backlog.md`

A roadmap entry is a **customer-visible capability** (what customers will be able to do) plus an **exit criterion** (what must be true for the phase to close). Anything else belongs in the backlog.

### `backlog.md`

Must not contain:
- Business-case narrative → `product.md`
- Architecture rationale or pattern definitions → `solution.md` or ADRs
- Phase exit criteria — those live in the roadmap; the backlog references them

### `contracts.md`

Must not contain:
- Prose that describes what a shape means → `solution.md`
- Business rationale for a contract → `product.md`
- Implementation patterns → `solution.md` or `work/{wp}/design.md`

Only executable code fences with one worked example per section. No narrative paragraphs.

### `metrics.md`

Must not contain:
- Metric targets without a baseline
- Business rationale for a metric → `product.md`
- Metric implementation detail → `solution.md`

## Scope canonicalisation

Scope boundary tends to appear in multiple artefacts. To prevent drift, each statement has one canonical home:

| Statement | Canonical home |
| --- | --- |
| Permanent no-gos — capabilities this domain will never own | `product.md §5` |
| Deferred capabilities — in scope but not this phase | `roadmap.md §Later` |
| Technical boundary — what APIs/systems the domain does not own | `solution.md §1` |
| Out-of-scope summary | `backlog.md §1` — references product.md §5 and roadmap.md §Later; adds nothing new |

`solution.md §1` does not restate the full no-gos list — it says "see `product.md §5`" for the complete list.
