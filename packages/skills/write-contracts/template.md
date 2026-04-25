---
type: Contracts
domain: <!-- domain name, or omit for platform -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
related:
  - <!-- domain/{d}/solution.md -->
  - <!-- domain/{d}/backlog.md -->
  - <!-- work/{d}/01-foundations/design.md -->
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in contracts.md:
  - Prose that describes what a shape means              → solution.md
  - Business rationale for a contract                    → product.md
  - Implementation patterns or how shapes are produced   → solution.md or design.md
Only executable code fences + one worked example per section.
-->

# Contracts -- {Domain}

The stable, authoritative interfaces, types, schemas, and codes exposed by the
{domain} domain. This document is the single source of truth for every contract
the domain publishes to other domains, squads, and agents.

Contracts here are **declarative** (what the shape is), not **implementation**
(how it is produced — see `solution.md` and work-package design docs).
Changes are additive by default; breaking changes require explicit deprecation
and coordination with consumers.

## 1. {External API / BFF} types

<!-- One-line preamble: where these types come from and where they live in code -->

```typescript
// {Origin}: generated from {spec-path} or imported from {package}
// File: modules/{domain}/logic/types.ts

// Type aliases over the generated / upstream types
export type {DomainBffType} = {UpstreamGeneratedType};
export type {DomainBffSubType} = {UpstreamGeneratedType}['{field}'];

// Example
const example: {DomainBffType} = {
  id: 'cart-abc123',
  version: 1,
  // ...
};
```

## 2. View-model types

<!-- One-line preamble: the domain's internal UI contract, produced by the mapper -->

```typescript
// File: modules/{domain}/logic/types.ts

export interface {DomainViewModel} {
  id: string;
  // ...derived fields...
  isEmpty: boolean;
  totalQuantity: number;
}

export interface {DomainLineViewModel} {
  id: string;
  // ...
}

// Example: empty {domain} view model
const example: {DomainViewModel} = {
  id: 'cart-abc123',
  isEmpty: true,
  totalQuantity: 0,
};
```

## 3. Error taxonomy

<!-- One-line preamble: closed enum; every mutation returns one of these on failure -->

```typescript
// File: modules/{domain}/logic/types.ts

export type {DomainMutationErrorCode} =
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT'
  | '{DOMAIN_SPECIFIC_CODE}'
  | 'UNKNOWN';

export type {DomainMutationResult} =
  | { success: true; {entity}: {DomainViewModel} }
  | { success: false; code: {DomainMutationErrorCode}; message: string };

// Default HTTP status mapping
// VALIDATION_ERROR → 400, SESSION_EXPIRED → 401, VERSION_CONFLICT → 409
// NETWORK_ERROR → 500, UNKNOWN → 500

// Example: successful mutation result
const success: {DomainMutationResult} = {
  success: true,
  {entity}: { id: 'abc', /* ... */ } as {DomainViewModel},
};
```

## 4. Mutation request schemas

<!-- One-line preamble: Zod schemas for every API route body; co-located in data/schemas/ -->

```typescript
// File: modules/{domain}/data/schemas/{domain}-action-schema.ts
import { z } from 'zod';

export const {ActionName}Schema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
  version: z.number().int().nonnegative().optional(),
});

export type {ActionName}Request = z.infer<typeof {ActionName}Schema>;

// Example
const body: {ActionName}Request = {
  id: 'item-abc',
  quantity: 1,
  idempotencyKey: crypto.randomUUID(),
};
```

## 5. API route contracts

<!-- One-line preamble: every Next.js route handler this domain exposes -->

| Path                            | Method | Request schema       | Response shape           | Error codes                                                                |
| ------------------------------- | ------ | -------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `/api/{domain}/{resource}`      | POST   | `{ActionName}Schema` | `{DomainMutationResult}` | `VALIDATION_ERROR`, `SESSION_EXPIRED`, `VERSION_CONFLICT`, `NETWORK_ERROR` |
| `/api/{domain}/{resource}/[id]` | PATCH  | `{UpdateSchema}`     | `{DomainMutationResult}` | see above                                                                  |
| `/api/{domain}/{resource}/[id]` | DELETE | —                    | `{DomainMutationResult}` | see above                                                                  |

## 6. Analytics event schema

<!-- One-line preamble: typed payloads for every track() call this domain fires -->

```typescript
// File: modules/{domain}/logic/analytics.ts
// Fired via track() from @/lib/analytics

interface {DomainEventEnvelope} {
  {domain}_session_id: string;   // session-scoped correlation ID
  items_count: number;
  subtotal: number;
}

interface {ActionEvent}Payload extends {DomainEventEnvelope} {
  item_id: string;
  quantity: number;
  source: '{surface-a}' | '{surface-b}';
}

// Events fired by this domain
// '{action_taken}' — on successful {action}; payload: {ActionEvent}Payload
// '{action_failed}' — on failed {action}; payload: { code: {DomainMutationErrorCode} }

// Example
track('{action_taken}', {
  {domain}_session_id: 'sess-abc',
  items_count: 3,
  subtotal: 249.95,
  item_id: 'SKU-001',
  quantity: 1,
  source: '{surface-a}',
});
```

## 7. Cache tags and directives

<!-- One-line preamble: server-side cache tags used for targeted revalidation -->

```typescript
// File: modules/{domain}/data/cache/cache-tags.ts

export const {DOMAIN}_TAG = '{domain}-v1' as const;

// Usage: revalidateTag({DOMAIN}_TAG) after every successful mutation
// Route cache-control: Cache-Control: no-store on /{domain} page and /api/{domain}/* routes
```
