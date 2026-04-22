---
type: Backlog
scope: work-package
work_package: 01-foundations
epic: CART01
domain: cart
version: '1.1'
owner: Cart & Checkout Squad
status: Reviewed
last_updated: 2026-04-21
sources:
  - domain/cart/requirements.md
  - domain/cart/design.md
  - domain/cart/contracts.md
  - domain/cart/backlog.md
  - work/cart/01-foundations/design.md
---

# Backlog -- Cart Foundations (CART01)

Sprint-level backlog for the **Cart Foundations** work package implementing
CART01. Source of truth for story-level scope, AC, and delivery tracking.

## 1. Summary

**Epic:** CART01 -- Cart Foundation and Module Scaffold
**Phase:** Alpha
**Priority:** P0 (blocks every other cart epic)
**Estimate:** 18 points

**Scope:** BFF cart client, `CartViewModel` + mapper, cart query, API-route
helper, error-code registry, feature flag, page shell + skeleton,
`useRevalidateMiniCart()`, and Zustand UI-coordination scaffold
(`useCartModalStore`).

**Out of scope:** PDP ATC (CART02), line items / order summary (CART03/04),
concrete mutations beyond the foundational BFF client helpers (CART02+).

**Deliverables:**

- `modules/cart/data/clients/bff-cart.client.ts` — BFF cart client
- `modules/cart/data/mappers/cart.mapper.ts` — `cartToViewModel(BffCart)`
- `modules/cart/data/queries/get-cart.ts` — server-only query with `cache()`
- `app/api/cart/_helpers/run-cart-mutation.ts` — shared route helper
- `modules/cart/logic/error-messages.ts` — error-code registry
- `modules/cart/ui/stores/useCartModalStore.ts` — Zustand modal coordinator
- `modules/cart/ui/hooks/useRevalidateMiniCart.ts` — mini-cart SWR bridge
- `(checkout)/cart/page.tsx` — RSC shell + `CartSkeleton`
- `lib/config/features.ts` — `newCartPage` flag

**Dependencies:** None (prerequisites already satisfied).

**Downstream consumers:** Every subsequent cart work package reads these without modification.

## 2. Conventions

| Convention | Value |
| ---------- | ----- |
| Story ID format | `CART01-{00}` |
| Status values | Not started, In progress, In review, Done, Blocked |
| Priority levels | P0 (must have), P1 (should have), P2 (stretch) |
| Estimation | Fibonacci story points |
| AC convention | Each AC maps to `TC-CART-FR-XX` test ID where applicable |

## 3. Stories

- [ ] **[CART01-01] Cart module scaffold and view-model types**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Deliverable:** `modules/cart/` directory structure evolved to full cart pattern; `logic/types.ts` defining `CartViewModel`, `BffCart` / `BffCartLine` aliases, `CartMutationErrorCode`, `CartMutationResult`.
  - **Acceptance:**
    - [ ] Directory structure exists: `data/clients/`, `data/queries/`, `data/mappers/`, `data/schemas/`, `data/cache/`, `logic/`, `ui/hooks/`, `ui/stores/`, `ui/cart-page/`, `ui/mini-cart/`
    - [ ] `logic/types.ts` exports `CartViewModel`, `CartLineViewModel`, `BffCart`, `BffCartLine`, `CartMutationErrorCode`, `CartMutationResult`
    - [ ] `index.ts` (server barrel) re-exports only server-safe types; `client.ts` re-exports client hooks and view-model types
    - [ ] Compile-only test at `logic/__tests__/types.spec.ts` confirms exports compile

- [ ] **[CART01-02] BFF cart client scaffold**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Dependencies:** CART01-01
  - **Deliverable:** `data/clients/bff-cart.client.ts` with `getCart()` and mutation helpers (`addLineItem`, `changeLineItemQuantity`, `removeLineItem`, `addPromoCode`, `removePromoCode`) via `bffClient` from `@/lib/bff`.
  - **Acceptance:**
    - [ ] `bff-cart.client.ts` starts with `import 'server-only'`
    - [ ] `getCart()` calls `bffClient.json('/carts', { apiVersion: 'v0.1', context: await getBffContext() })` and returns `BffCart | null` (maps 404/empty to `null`)
    - [ ] Each mutation helper calls `bffClient.request('/carts/{cartId}', { method: 'PUT', ... })` with the correct `action` field and returns `BffCart`
    - [ ] Cart module code outside `data/clients/` never imports `bffClient` directly
    - [ ] Existing `bff-minicart.client.ts` left untouched; its tests still pass
    - [ ] Unit tests (`msw`) cover `getCart()` success / 404-null / transport error

- [ ] **[CART01-03] Cart mapper with safe fallbacks**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Dependencies:** CART01-01
  - **Deliverable:** `data/mappers/cart.mapper.ts` exporting `cartToViewModel(BffCart): CartViewModel` with Wave-1 fallback defaults.
  - **Acceptance:**
    - [ ] `cartToViewModel` maps all required `Cart_v0_1` fields to `CartViewModel`
    - [ ] Wave-1 gap fields (`brand`, `variantOptions`, `stockState`, `savings`, `freeDelivery`, `notices`) default to `null` / `[]` / safe values when absent
    - [ ] Money values are formatted to display strings (`"$299.00"`) using `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })`
    - [ ] `isEmpty`, `totalQuantity`, `hasOnlyOutOfStock`, `checkoutCtaEnabled` are computed in the mapper
    - [ ] `version` threaded from `BffCart.version` to `CartViewModel.version`
    - [ ] Unit tests cover full / empty / minimum `Cart_v0_1` response, each Wave-1 fallback, derived fields, money formatting, version threading
    - [ ] Fixture file at `__fixtures__/cart.fixtures.ts` exports `buildCart_v0_1()` and `buildCartLineItem()`

- [ ] **[CART01-04] Cart query with request-scoped cache**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 2
  - **Dependencies:** CART01-02, CART01-03
  - **Deliverable:** `data/queries/get-cart.ts` as the single server entry point for reading the cart.
  - **Acceptance:**
    - [ ] Starts with `import 'server-only'`
    - [ ] Exports `getCart()` wrapped in React's `cache()`
    - [ ] Calls `bff-cart.client.ts getCart()`, pipes result through `cartToViewModel`
    - [ ] Returns `CartViewModel | null`
    - [ ] Does not use `"use cache"` (cart route is `no-store`)
    - [ ] Integration tests: populated cart, empty cart (null), transport error propagation

- [ ] **[CART01-05] Error-code registry and copy**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 2
  - **Dependencies:** CART01-01
  - **Deliverable:** `logic/error-messages.ts` (client-safe copy map) and `data/errors.ts` (server-side `extractCartError`).
  - **Acceptance:**
    - [ ] `getCartErrorMessage(code)` returns a non-empty string for every `CartMutationErrorCode`
    - [ ] `OUT_OF_STOCK` uses Figma-confirmed copy: *"This item is out of stock. Please remove it from your cart."*
    - [ ] `extractCartError(error)` maps: 401 → `SESSION_EXPIRED`, 404 → `CART_NOT_FOUND`, 409 → contextual code or `UNKNOWN`, 5xx → `NETWORK_ERROR`, 400 with `code` → `VALIDATION_ERROR`
    - [ ] Until BFF-CART-08 lands, granular 409 paths fall back to `UNKNOWN` with a `// TODO(BFF-CART-08)` comment
    - [ ] Unit tests: every code returns non-empty copy; every HTTP path is covered

- [ ] **[CART01-06] Cart page shell, feature flag, skeleton**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Dependencies:** CART01-04
  - **Deliverable:** `newCartPage` flag, RSC cart page shell with Suspense + `CartSkeleton`.
  - **Acceptance:**
    - [ ] `lib/config/features.ts` gains `newCartPage: false` with dev/preview enabled, staging/production disabled
    - [ ] `(checkout)/cart/page.tsx` reads flag; when false renders legacy placeholder
    - [ ] When true, renders `<Suspense fallback={<CartSkeleton />}><CartContent /></Suspense>`
    - [ ] `generateMetadata` sets `robots: 'noindex,nofollow'` and `title: 'Shopping Cart'`
    - [ ] Smoke test asserts `Cache-Control: no-store` on `/cart` response
    - [ ] `CartSkeleton` renders two-column desktop grid and mobile stacked layout with pulse placeholders (no CLS)

- [ ] **[CART01-07] Shared API-route helper (`runCartMutation`)**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Dependencies:** CART01-02, CART01-05
  - **Deliverable:** `app/api/cart/_helpers/run-cart-mutation.ts` — reusable helper for all cart mutation routes.
  - **Acceptance:**
    - [ ] Parses JSON body, runs Zod validation, returns 400 + `{ code: 'VALIDATION_ERROR', issues }` on failure
    - [ ] `runMutation` callback calls BFF cart client helpers and returns `BffCart`
    - [ ] Maps success to `{ success: true, cart: cartToViewModel(bffCart) }` (200)
    - [ ] Maps errors to `CartMutationErrorCode` via `extractCartError`; returns matching HTTP status
    - [ ] Calls `flushTelemetryAfterResponse()` in `finally`
    - [ ] Unit tests (`msw`): validation failure (400), success (200), 401 → `SESSION_EXPIRED`, 409 → `VERSION_CONFLICT`, 5xx → `NETWORK_ERROR`

- [ ] **[CART01-08] `useCartModalStore` Zustand scaffold**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 2
  - **Dependencies:** CART01-01
  - **Deliverable:** `ui/stores/useCartModalStore.ts` — Zustand modal coordinator; first store in `ui/stores/`.
  - **Acceptance:**
    - [ ] `zustand` added as runtime dependency of `apps/store`
    - [ ] `useCartModalStore` exports `openModal(id)`, `closeModal(id)`, `isOpen(id)`
    - [ ] Store never holds line items, prices, or any BFF-derived cart data
    - [ ] Exported from `client.ts` barrel only
    - [ ] Unit test: `openModal` → `isOpen` returns true; `closeModal` → `isOpen` returns false

- [ ] **[CART01-09] `useRevalidateMiniCart()` hook**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 1
  - **Deliverable:** `ui/hooks/useRevalidateMiniCart.ts` — revalidates the mini-cart SWR key.
  - **Acceptance:**
    - [ ] Exports `useRevalidateMiniCart()` returning a stable `() => Promise<void>`
    - [ ] Uses `useSWRConfig().mutate(CART_ENDPOINTS.GET_MINI_CART.path)`
    - [ ] Exported from `client.ts` barrel only
    - [ ] Unit test confirms calling the function invokes `mutate` with the mini-cart key

## 4. Traceability

### Stories to domain requirements

| Story | Domain FR(s) |
| ----- | ------------ |
| CART01-01 | FR-01 (`CartViewModel` + BFF type aliases — types only) |
| CART01-02 | FR-01 (BFF cart client — read path) |
| CART01-03 | FR-01 (mapper), FR-04 (Wave-1 fallbacks feed mini-cart coherence) |
| CART01-04 | FR-02 (cart query and cache strategy — in full) |
| CART01-05 | FR-14 (mutation error taxonomy), FR-18c (idempotency pattern) |
| CART01-06 | FR-05 (cart page shell + flag + skeleton) |
| CART01-07 | FR-03 / FR-07 / FR-08 / FR-10 / FR-18c (shared `runCartMutation`) |
| CART01-08 | R2 risk mitigation (modal coordinator per ADR-0017) |
| CART01-09 | FR-04 (mini-cart refresh hook) |

### Stories to design

| Story | Design sections (work-package) | Domain references |
| ----- | ------------------------------ | ----------------- |
| CART01-01 | §2 "Module scaffold" | `domain/cart/design.md` §2.4; `contracts.md` §3 |
| CART01-02 | §3 "BFF cart client scaffold" | `domain/cart/design.md` §2.2, §3 |
| CART01-03 | §4 "Cart view model and mapper" | `contracts.md` §2, §3; `dependencies/bff-contract-uplift.md` |
| CART01-04 | §5 "Cart query" | `domain/cart/design.md` §2.11; `contracts.md` §8 |
| CART01-05 | §7 "Error taxonomy registry" | `contracts.md` §4; `domain/cart/design.md` §2.9 |
| CART01-06 | §8 "Cart page shell, feature flag, skeleton" | `domain/cart/design.md` §2.3, §2.11, §6 |
| CART01-07 | §6 "`runCartMutation`" | `domain/cart/design.md` §2.5; `contracts.md` §4, §5, §7 |
| CART01-08 | §10 "Zustand UI-coordination scaffold" | `domain/cart/design.md` §2.13; ADR-0017 |
| CART01-09 | §9 "`useRevalidateMiniCart`" | `domain/cart/design.md` §2.7 |

## 5. Definition of Done

A story is done when:

- [ ] All acceptance criteria boxes are ticked
- [ ] Unit tests pass in CI; coverage on new files >= 80%
- [ ] TypeScript typecheck passes with no unwarranted `any`
- [ ] ESLint passes with no new warnings
- [ ] Commit message references the story ID and FR IDs
- [ ] Code review approved by at least one other squad engineer
- [ ] PR merged; `newCartPage` flag remains `false` in production

CART01 is done when every story is done **and** the Alpha exit criteria in
`domain/cart/roadmap.md` Phase 1 hold.

## 6. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| -- | ---- | ---------- | ------ | ---------- |
| F1 | `@tpw/bff-client-types` lags the BFF spec | Low | Medium | Regenerate at sprint start; pin version in `package.json` |
| F2 | `/cart` route not classified as `no-store` | Low | High (stale prices) | CART01-06 verifies `Cache-Control: no-store` via smoke test |
| F3 | `newCartPage` flag leaks to production | Low | High | Default `false`; integration test asserts flag state per environment |
| F4 | `zustand` version conflict with other deps | Low | Low | Check `peerDependencies`; verify in `pnpm install --frozen-lockfile` |

## 7. Handoff

When CART01 closes, these contracts are stable for downstream work packages:

- `CartViewModel` + supporting types + `BffCart` / `BffCartLine` aliases (`logic/types.ts`)
- `bff-cart.client.ts` — server-only BFF cart helpers
- `getCart()` query (`data/queries/get-cart.ts`)
- `cartToViewModel` mapper (`data/mappers/cart.mapper.ts`)
- `runCartMutation` helper (`app/api/cart/_helpers/run-cart-mutation.ts`)
- `extractCartError` + `getCartErrorMessage`
- `useCartModalStore` (Zustand) and `useRevalidateMiniCart()` hook
- `newCartPage` feature flag
- `(checkout)/cart/page.tsx` RSC shell + `CartSkeleton`

Next work packages:
1. `work/cart/02-add-to-cart/` — CART02 PDP add-to-cart flow
2. `work/cart/03-page-core/` — CART03 line items, quantity, remove
