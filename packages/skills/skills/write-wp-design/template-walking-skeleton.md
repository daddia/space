---
type: Design
scope: work-package
mode: walking-skeleton
work_package: <!-- e.g. 01-foundations -->
epic: <!-- e.g. CART01 -->
domain: <!-- domain name -->
version: '0.1'
owner: <!-- Squad name -->
status: Done
last_updated: <!-- YYYY-MM-DD -->
related:
  - domain/{d}/product.md
  - domain/{d}/solution.md
  - domain/{d}/contracts.md
  - domain/{d}/backlog.md
  - work/{d}/{wp}/backlog.md
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this design.md:
  - Domain-wide patterns, policies, or decisions already in solution.md
    → cite solution.md §{N.M} instead
  - Business rationale                  → product.md
  - Phase sequencing                    → roadmap.md
  - Story-level acceptance criteria     → this WP's backlog.md
-->

# Design -- {Domain} {Epic Title} ({EPIC-ID})

Walking-skeleton design for the **{Epic Title}** work package at
`work/{d}/{wp}/`, which implemented {EPIC-ID} from
[`domain/{d}/backlog.md`](../../../domain/{d}/backlog.md). Shipped <!--
YYYY-MM-DD -->.

This is the _foundation-sprint_ design: it names the one end-to-end slice
{EPIC-ID} proved, the acceptance gates the slice had to clear, and the files
this sprint created. Domain-wide patterns are authoritative in
[`domain/{d}/solution.md`](../../../domain/{d}/solution.md) and are **not**
repeated here.

If you are working on a later sprint, read this doc for the substrate {EPIC-ID}
left in place, then read the sprint's own `design.md` (TDD mode) for
sprint-specific detail.

## 1. The slice

The walking skeleton {EPIC-ID} landed, in one paragraph:

> **<!-- What end-to-end path does the skeleton prove? What can a user do or
> observe that they could not before? What does NOT yet work? Keep to one
> short paragraph. -->**

Everything else {EPIC-ID} built exists to make later epics stand up this
surface with real data.

## 2. Files shipped

Every file below references domain patterns by link rather than redefining
them. See [`domain/{d}/solution.md`](../../../domain/{d}/solution.md) §4 for
the module layout pattern.

### 2.1 Data layer

```text
modules/{d}/data/
  clients/
    {bff-client}.ts       NEW   <!-- what it does -->
    {other-client}.ts     KEEP  existing (untouched)
  queries/
    {query}.ts            NEW   <!-- what it does -->
  mappers/
    {mapper}.ts           NEW   <!-- what it does -->
  schemas/
    {schema}.ts           NEW   <!-- what it does -->
  cache/
    cache-tags.ts         NEW   <!-- exports -->
  errors.ts               NEW   <!-- what it does -->
```

### 2.2 Logic layer

```text
modules/{d}/logic/
  types.ts                EVOLVE  adds {ViewModel} + slice types + aliases
  error-messages.ts       NEW     getErrorMessage for every {ErrorCode}
  constants.ts            NEW     {CONSTANT_NAME} and legacy business-rule values
  {d}-reducer.ts          NEW     reduce{D} for optimistic updates (used by later WPs)
```

### 2.3 UI layer (foundation scaffold only)

```text
modules/{d}/ui/
  {surface}/
    {Surface}Skeleton.tsx  NEW     server component; fixed heights matching Figma
  hooks/
    use-revalidate-{key}.ts  NEW   the only surface that knows the {key} SWR key
  stores/
    use-{d}-modal-store.ts   NEW   Zustand (first store; per solution.md §3.6)
  index.ts                 EVOLVE  server barrel
  client.ts                EVOLVE  client barrel
```

### 2.4 Route group

```text
apps/store/src/app/({d})/
  layout.tsx               NEW   {d}-specific layout
  {surface}/
    page.tsx               NEW   RSC shell: Suspense + {D}Skeleton + get{D}() fallback
    error.tsx              NEW   route-level error boundary
    loading.tsx            NEW   route-level loading
```

### 2.5 API route scaffolding

<!-- Describe what was and was NOT created. If no routes shipped, say so. -->

No {domain} mutation routes ship in {EPIC-ID}. The `run{D}Mutation` helper is
present and tested; concrete routes ship with later epics.

## 3. Acceptance gates

Foundation-sprint acceptance is narrower than a TDD-sprint set. The slice
passes if all of the following hold:

### 3.1 End-to-end path

- `GET /{surface}` returns 200 on mobile and desktop, rendering the skeleton.
- Request flows through the `({d})` route group and its layout; header and footer render.
- `Cache-Control: no-store` is set on the response.
- The <!-- existing popover or mini-surface --> remains coherent (unchanged).

### 3.2 Observability hook fires

- One server trace span `{d}.page.render` emits per request.
- One `route.{d}.page` log line emits per request with correlation id and
  hashed entity id (when session has an entity).

### 3.3 Error path is exercised

- When the BFF returns a non-200 for the (future) `get{D}()` call, `error.tsx`
  renders the typed error surface. {EPIC-ID} triggers this via a controlled
  path; real error paths ship with later epics.

### 3.4 Scaffolds are complete

- `{entityTo}ViewModel({BffEntity})` compiles with exhaustive type coverage.
- The revalidation hook is the only symbol outside its module that knows the
  SWR key; grep verifies.
- The first Zustand store is the only Zustand store shipped.

### 3.5 Quality gates (Alpha subset)

- `pnpm typecheck` passes with zero `any` in the {d} module.
- `pnpm test modules/{d}` passes (unit tests for mapper, reducer, schemas, and
  error extractor).
- `axe-core` passes on `/{surface}` rendering the skeleton.
- Lighthouse on a seeded `/{surface}` hits the quality-goal bars in
  [`solution.md`](../../../domain/{d}/solution.md) §2.1.

## 4. What {EPIC-ID} did NOT deliver

Stated so later sprints do not assume they can lean on work that was not done:

- No real `get{D}()` call is made in production yet — the page renders the
  skeleton and a placeholder. The next content-rendering epic replaces this.
- No {d} mutation routes are live. The route folder is created,
  `run{D}Mutation` is implemented and tested, but no concrete routes ship.
- No analytics events fire from the {surface} page.
- No version-conflict retry or error-recovery UX. Error code mapping exists;
  UX lands with a later reliability epic.
- No {basket/entity} merge on sign-in. The helper is present but not wired.

## 5. Open questions closed during {EPIC-ID}

Captured for the domain's historical record.

- **{Question}.** Decision: <!-- what was decided and why -->.
- **{Question}.** Decision: <!-- what was decided and why -->.

## 6. Handoff to next WP

The next WP picks up the scaffold. What it can assume is ready:

- `{bff-client}.ts` is present with `get{D}()` and typed mutation helpers.
- `run{D}Mutation` is the shared route-handler pattern (stable, tested).
- The mapper returns a complete `{D}ViewModel` with Wave-1 fallback behaviour.
- The revalidation hook is exported from the client barrel.
- `error-messages.ts` covers every `{D}MutationErrorCode`.
- Route group, skeleton, and layout are in place; later WPs need no flag plumbing.

The stories the next WP implements are in
[`work/{d}/02-{slug}/backlog.md`](../02-{slug}/backlog.md).
