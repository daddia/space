---
type: Design
scope: work-package
mode: tdd
work_package: <!-- e.g. 02-add-to-cart -->
epic: <!-- e.g. CART02 -->
domain: <!-- domain name -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
related:
  - domain/{d}/product.md
  - domain/{d}/solution.md
  - domain/{d}/contracts.md
  - domain/{d}/backlog.md
  - work/{d}/01-{prev}/design.md
  - work/{d}/{wp}/backlog.md
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this design.md:
  - Domain-wide patterns, policies, or decisions already in solution.md
    → cite solution.md §{N.M} instead; do not re-narrate
  - Business rationale                  → product.md
  - Phase sequencing                    → roadmap.md
  - Story-level acceptance criteria     → this WP's backlog.md
-->

# Design -- {Domain} {Epic Title} ({EPIC-ID})

TDD-mode design for the **{Epic Title}** work package at `work/{d}/{wp}/`,
implementing {EPIC-ID} from
[`domain/{d}/backlog.md`](../../../domain/{d}/backlog.md).

This work package builds on the substrate the foundation sprint shipped; domain
patterns are authoritative in
[`domain/{d}/solution.md`](../../../domain/{d}/solution.md) and are **not**
repeated here. References to solution sections appear inline.

## 1. Scope

### 1.1 In scope

- <!-- concrete capability or file: one bullet per distinct deliverable -->

### 1.2 Out of scope

- <!-- explicitly deferred to a later WP with its WP identifier -->

### 1.3 Capabilities this work package delivers

Mapped to story-level AC in [`./backlog.md`](backlog.md):

- **{Capability A}** (in full): stories {EPIC-ID}-01 .. {EPIC-ID}-0N.
- **{Capability B}**: story {EPIC-ID}-0M.

## 2. Architecture fit

This WP plugs into the patterns established in the foundation sprint; no new
domain-wide patterns are introduced.

```text
{Actor}
  +-- {Surface}  <-- THIS WP WIRES THIS
      |
      +-- {Hook}()            <-- NEW
            |
            +-- POST /api/{d}/{action}  <-- NEW
                  |
                  +-- run{D}Mutation ({prev WP})
                        |
                        +-- bffClient action {actionName} ({prev WP})
                        +-- revalidateTag({D}_TAG)
            |
            +-- use{Revalidate}() ({prev WP})
            +-- track('{event}', ...)
```

References in [`domain/{d}/solution.md`](../../../domain/{d}/solution.md):

- §{N.M} -- <!-- pattern this WP uses; one line -->
- §{N.M} -- <!-- pattern; one line -->

## 3. Files and components

### 3.1 New files

```text
apps/store/src/
  app/api/{d}/{resource}/
    route.ts                         NEW  <!-- purpose -->
  modules/{d}/
    data/schemas/
      {d}-action-schema.ts           EVOLVE  <!-- what changes -->
    ui/hooks/
      use-{action}.ts                NEW  <!-- purpose -->
    ui/{surface}/
      {Component}.client.tsx         REWIRE  <!-- currently a stub -->
      __tests__/
        {Component}.spec.tsx         NEW
        use-{action}.spec.ts         NEW
```

### 3.2 Files modified

- `modules/{d}/client.ts` — export `use{Action}`.
- `modules/{d}/ui/{surface}/{Component}.client.tsx` — full rewire.

### 3.3 Files NOT modified

- `modules/{d}/data/clients/{bff-client}.ts` — stable from foundation sprint.
- `modules/{d}/data/mappers/{mapper}.ts` — stable.
- `app/api/{d}/_helpers/run-{d}-mutation.ts` — stable (reused verbatim).

## 4. Data contracts

### 4.1 {Action}Schema

```typescript
// File: modules/{d}/data/schemas/{d}-action-schema.ts
import { z } from 'zod';

export const {Action}Schema = z.object({
  id: z.string().min(1).max(64),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
  version: z.number().int().nonnegative().optional(),
});

export type {Action}Request = z.infer<typeof {Action}Schema>;

// Example
const example: {Action}Request = {
  id: '{example-id}',
  quantity: 1,
  idempotencyKey: crypto.randomUUID(),
};
```

### 4.2 Route response

Uses the shared discriminated `{D}MutationResult` from
[`domain/{d}/contracts.md`](../../../domain/{d}/contracts.md) §3.

```typescript
// Success
{ success: true, {entity}: {D}ViewModel }

// Error
{ success: false, code: {D}MutationErrorCode, message: string }
```

### 4.3 `use{Action}()` hook

```typescript
export function use{Action}(): {
  {action}: (input: Omit<{Action}Request, 'idempotencyKey'>) => Promise<{D}MutationResult>;
  isPending: boolean;
  error: {D}MutationErrorCode | null;
  reset: () => void;
}
```

## 5. Runtime view

### 5.1 {Key flow 1}

Extends the generic sequence in
[`solution.md`](../../../domain/{d}/solution.md) §5.1 with this WP's concrete
surface:

```text
{Actor} {action}
  -> {Component}.client.tsx
     -- {validation step}
     -- generate idempotencyKey
     -> use{Action}()
        -> POST /api/{d}/{resource}  (Next.js route)
           -> run{D}Mutation
              -> Zod parse {Action}Schema
              -> bffClient.request(...)
              -> revalidateTag({D}_TAG)
              -> {D}MutationResult
  -> on success:
     -- use{Revalidate}() triggers SWR mutate()
     -- track('{event}', payload)
  -> on error:
     -- inline error + retry
     -- track('{event}_failed', { code })
```

## 6. Cross-squad coordination

<!-- Omit this section if no cross-squad interface exists. -->

| Interface                  | Owner         | Notes                                                       |
| -------------------------- | ------------- | ----------------------------------------------------------- |
| `{ComponentName}` location | {This squad}  | Lives in `modules/{d}/ui/{surface}/`; {consumer} imports it |
| `{Shape}` fields consumed  | {Other squad} | Stable; no changes for {EPIC-ID}                            |

A contract test in the {other} squad's test suite asserts that the required
fields are present. Failure blocks {other} CI before the {d} domain is affected.

## 7. Error paths

`{D}MutationErrorCode` coverage for this WP (copy per foundation sprint):

| Code               | {Surface} treatment                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `NETWORK_ERROR`    | Inline error + Retry; Retry generates a new idempotencyKey                                                  |
| `{DOMAIN_CODE}`    | <!-- surface-specific treatment -->                                                                         |
| `SESSION_EXPIRED`  | Redirect to `/signin?from={surface}&id=...`; persist pending action to `sessionStorage` (5-min TTL, no PII) |
| `VERSION_CONFLICT` | One silent retry inside the route; on repeat, reload and retry                                              |
| `UNKNOWN`          | Inline generic + Retry; log with full context                                                               |

## 8. Observability

Per [`domain/{d}/solution.md`](../../../domain/{d}/solution.md) §7.2.

This WP adds:

- Trace span `{d}.action.{actionName}` with attributes `{id}`, `{qty}`,
  `source`, `idempotency_key`, `version`, `error_code` (on failure),
  `duration_ms`.
- RED metrics under action name `{actionName}`.
- RUM custom event `{d}.{action}_submitted` with `source` attribute.
- Log line on every 4xx / 5xx with correlation context; no PII.

## 9. Testing strategy

| Layer                    | Scope                                                   | Target              |
| ------------------------ | ------------------------------------------------------- | ------------------- |
| Unit (Vitest)            | `{Action}Schema`: valid / invalid / edge cases          | 100% branches       |
| Unit (Vitest)            | `use{Action}`: happy path, each error path, idempotency | 100% branches       |
| Route handler (Vitest)   | `POST /api/{d}/{resource}`: 200, 400, 401, 409, 5xx     | Happy + every error |
| Component (Vitest + RTL) | `{Component}.client.tsx`: pending state, retry          | Happy + error       |
| Integration (Playwright) | Real navigation: {surface} -> {action} -> {result}      | Phase 1 happy       |
| Contract test            | `track('{event}', payload)` matches `contracts.md` §6   | Blocks CI           |
| Accessibility (axe-core) | `{Component}` + inline error states                     | Pass on every PR    |

## 10. Acceptance gates (Alpha subset for this WP)

- A {user} can {action} and {result} within 1 s.
- {Action} success rate > 99% in dev (CM-G{N} from `solution.md §2.1`).
- `{event}` fires with typed payload per contracts.
- {Validation} against `{config}` works on mobile tap and desktop keyboard.
- Idempotency: simulating double-{action} fires one mutation.
- axe-core passes on `{Component}` including inline error states.
- `pnpm typecheck && pnpm test && pnpm lint` clean.

## 11. Handoff to later WPs

When {EPIC-ID} closes, the following surface is stable:

- `POST /api/{d}/{resource}` route — pattern extends to later epics' routes.
- `use{Action}` exported from the client barrel.
- Idempotency pattern proven end-to-end; later WPs reuse verbatim.

## 12. Open questions for this WP

1. **{Question}.** {Context}; default: <!-- default approach -->.
2. **{Question}.** {Context}; confirm with {owner} before {EPIC-ID} ships.
