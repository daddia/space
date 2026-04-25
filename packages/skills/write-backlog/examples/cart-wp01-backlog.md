---
type: Backlog
scope: work-package
work_package: 01-foundations
epic: CART01
domain: cart
version: '2.0'
owner: Cart & Checkout Squad
status: Done
last_updated: 2026-04-23
figma: 'https://www.figma.com/design/ZrCnkba5v8L833qSqkwIOo/Cart-Redesign?node-id=2937-104836'
sources:
  - domain/cart/solution.md
  - domain/cart/contracts.md
  - domain/cart/backlog.md
  - work/cart/01-foundations/design.md
---

# Backlog -- Cart Foundations (CART01)

Sprint-level backlog for the **Cart Foundations** work package at `work/cart/01-foundations/`, implementing CART01 from [`domain/cart/backlog.md`](../../../domain/cart/backlog.md). Shipped 2026-04-23.

Companion artefacts:

- Sprint-scope walking-skeleton design: [`./design.md`](design.md)
- Domain patterns and contracts: [`domain/cart/solution.md`](../../../domain/cart/solution.md), [`domain/cart/contracts.md`](../../../domain/cart/contracts.md)
- Cart-wide epic list: [`domain/cart/backlog.md`](../../../domain/cart/backlog.md)

## 1. Summary

- **Epic.** CART01 -- Cart Foundation and Module Scaffold
- **Phase.** Now / Alpha (see [`domain/cart/roadmap.md`](../../../domain/cart/roadmap.md))
- **Priority.** P0 (blocks every other cart epic)
- **Estimate.** 23 points across 9 stories

**Scope.** Deliver the substrate every other cart epic depends on: module scaffold, BFF cart client, `CartViewModel` + mapper, cart query, `runCartMutation` helper, error-code registry, `(cart)` route group + page shell, `useRevalidateMiniCart` hook, and the first Zustand UI-coordination store.

**Out of scope (this work package).** Concrete cart mutations (CART02+), line-item rendering and interactions (CART03), order summary (CART04), empty state (CART05), reconciliation and error UX (CART06), Figma line polish (CART07), promo code (CART08), postcode (CART09), Purchase Protection (CART10), Save for Later (CART11), express checkout wiring (CART12), analytics verification (CART13), accessibility and CWV quality gate (CART14), basket merge on sign-in.

**Deliverables.** See `./design.md` Section 2 for the exhaustive file list.

**Dependencies.** None. Prerequisites satisfied per [`domain/cart/backlog.md`](../../../domain/cart/backlog.md) Section 1.

**Downstream consumers.** Every later cart work package (`02-add-to-cart`, `03-page-core`, `04-order-summary`, ...) builds on the artefacts this work package ships.

## 2. Conventions

| Convention        | Value                                                                |
| ----------------- | -------------------------------------------------------------------- |
| Story ID          | `CART01-{nn}` (e.g. `CART01-01`)                                     |
| Status            | Not started, In progress, In review, Done, Blocked                   |
| Priority          | P0, P1, P2, P3                                                       |
| Estimation        | Fibonacci story points                                               |
| Acceptance format | EARS + Gherkin per `docs/design/space-artefact-model.md` Section 5.3 |
| AC placement      | Rendered in Jira description as a checklist + Gherkin code fence     |

## 3. Stories

- [x] **[CART01-01] Cart module scaffold and view-model types**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:scaffold
  - **Depends on:** -
  - **Deliverable:** `modules/cart/` directory evolved to the full cart pattern; `logic/types.ts` defines `CartViewModel` and all slice types.
  - **Design:** [`./design.md#21-data-layer`](design.md#21-data-layer), [`./design.md#22-logic-layer`](design.md#22-logic-layer)
  - **Acceptance (EARS):**
    - WHEN a developer imports from the cart module server barrel, THE SYSTEM SHALL expose `CartViewModel`, `CartLineViewModel`, `PromoViewModel`, and every slice type listed in [`contracts.md`](../../../domain/cart/contracts.md) Section 3.
    - THE SYSTEM SHALL provide a client barrel that exports only client-safe hooks and view-model types.
    - THE SYSTEM SHALL provide JSDoc summaries for each slice type.
    - WHEN `pnpm test modules/cart/logic` runs, THE SYSTEM SHALL confirm the exports compile.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Server barrel exposes the canonical view model
      Given the cart module is installed
      When a server component imports { CartViewModel } from '@/modules/cart'
      Then the import resolves to the type defined in logic/types.ts
      And it matches contracts.md Section 3 exactly
    ```

- [x] **[CART01-02] BFF cart client scaffold**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:integration
  - **Depends on:** CART01-01
  - **Deliverable:** Server-only BFF cart client (`data/clients/bff-cart.client.ts`) exposing `getCart()` and typed mutation helpers via `bffClient`. The only BFF boundary for cart module code.
  - **Design:** [`./design.md#21-data-layer`](design.md#21-data-layer); [`domain/cart/solution.md#32-bff-first-integration`](../../../domain/cart/solution.md#32-bff-first-integration)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL declare `import 'server-only'` at the top of the client file.
    - WHEN `getCart()` is called, THE SYSTEM SHALL call `bffClient.json('/carts', ...)` and return `BffCart | null` (mapping 404 / empty-cart to `null`).
    - WHEN a mutation helper is called, THE SYSTEM SHALL dispatch `bffClient.json('/carts/{cartId}', { method: 'PUT', ... })` with the canonical action body.
    - THE SYSTEM SHALL validate `cartId` against `^[A-Za-z0-9_-]+$` before path interpolation.
    - THE SYSTEM SHALL leave the existing mini-cart client untouched.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Add-line mutation reaches the BFF with a typed body
      Given a server route calls addLineItem({ sku, qty, idempotencyKey, cartVersion })
      When the helper executes
      Then bffClient.json is called with method PUT and path /carts/{cartId}
      And the body is { action: 'addLineItem', sku, qty, idempotencyKey, version }

    Scenario: Invalid cartId is rejected before network
      Given a cartId of "../etc/passwd"
      When any mutation helper is invoked
      Then the helper throws before calling bffClient
    ```

- [x] **[CART01-03] Cart mapper with safe fallbacks**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 5
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:mapper
  - **Depends on:** CART01-01
  - **Deliverable:** `data/mappers/cart.mapper.ts` transforming `BffCart` (`Cart_v0_1`) into `CartViewModel` with Wave-1 fallback values for every field gated on BFF uplift.
  - **Design:** [`./design.md#21-data-layer`](design.md#21-data-layer); [`domain/cart/solution.md#35-cartviewmodel-as-the-single-ui-contract`](../../../domain/cart/solution.md#35-cartviewmodel-as-the-single-ui-contract)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL export `cartToViewModel(cart: BffCart): CartViewModel`.
    - THE SYSTEM SHALL format money values using `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })`.
    - WHEN a Wave-1-gap field is absent, THE SYSTEM SHALL map to `null`, empty array, or a documented default (e.g. `maxQuantity = 99`, `stockState = 'in_stock'`).
    - THE SYSTEM SHALL thread `version` from `BffCart.version` to `CartViewModel.version`.
    - THE SYSTEM SHALL derive `isEmpty`, `totalQuantity`, `hasOnlyOutOfStock`, `checkoutCtaEnabled`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Empty cart maps to the canonical empty view model
      Given a BffCart with items = []
      When cartToViewModel(cart) runs
      Then the result has isEmpty = true
      And totalQuantity = 0
      And checkoutCtaEnabled = false

    Scenario: Missing Wave-1-gap field falls back cleanly
      Given a BffCart with no savings field
      When cartToViewModel(cart) runs
      Then viewModel.savings is null
      And the order summary renders without a savings line
    ```

- [x] **[CART01-04] Cart query with request-scoped cache**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 2
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:query
  - **Depends on:** CART01-02, CART01-03
  - **Deliverable:** `data/queries/get-cart.ts` as the single entry point for reading the cart in server components; wrapped in React `cache()` for request-scoped dedupe.
  - **Design:** [`./design.md#21-data-layer`](design.md#21-data-layer); [`domain/cart/solution.md#31-server-owned-cart-state`](../../../domain/cart/solution.md#31-server-owned-cart-state)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL declare `import 'server-only'`.
    - THE SYSTEM SHALL call the BFF cart client and pipe the result through `cartToViewModel`.
    - THE SYSTEM SHALL return `CartViewModel | null`.
    - THE SYSTEM SHALL log BFF / mapper failures via `@tw/logging` with correlation context; only the empty-cart path returns `null`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Two getCart calls in one request dedupe
      Given React cache() wraps the query
      When two server components call getCart() in the same request
      Then bffClient.json is invoked exactly once
    ```

- [x] **[CART01-05] Error-code registry and copy**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 2
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:error
  - **Depends on:** CART01-01
  - **Deliverable:** `logic/error-messages.ts` + `data/errors.ts` implementing the error taxonomy from [`contracts.md`](../../../domain/cart/contracts.md) Section 4.
  - **Design:** [`./design.md#22-logic-layer`](design.md#22-logic-layer); [`domain/cart/solution.md#71-error-taxonomy`](../../../domain/cart/solution.md#71-error-taxonomy)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL provide `getCartErrorMessage(code)` (client-safe; no `'server-only'`) that returns non-empty copy for every `CartMutationErrorCode`.
    - THE SYSTEM SHALL provide `extractCartError(error)` mapping transport / BFF errors to `CartMutationErrorCode`: no response -> `NETWORK_ERROR`; 401 -> `SESSION_EXPIRED`; 404 -> `CART_NOT_FOUND`; 409 -> `VERSION_CONFLICT`; 400 + `code: VALIDATION_ERROR` -> `VALIDATION_ERROR`; else `UNKNOWN`.
    - THE SYSTEM SHALL record a `TODO(BFF-CART-08)` reference where the mapping depends on the future machine-readable error codes.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Out-of-stock renders Figma-confirmed copy
      Given code = 'OUT_OF_STOCK'
      When getCartErrorMessage(code) is called
      Then the returned string is
        "This item is out of stock. Please remove it from your cart."
    ```

- [x] **[CART01-06] Cart page shell and skeleton**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:ui
  - **Depends on:** CART01-04
  - **Deliverable:** `(cart)` route group with its own layout; `cart/page.tsx` RSC shell with Suspense + `CartSkeleton` fallback; access control at Cloudflare worker (no application-level flag).
  - **Design:** [`./design.md#24-route-group`](design.md#24-route-group); [`domain/cart/solution.md#74-feature-flag-and-rollout`](../../../domain/cart/solution.md#74-feature-flag-and-rollout)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL render `NavigationHeader` + `MainFooter` via `(cart)/layout.tsx` with `<main id="main-content">`.
    - THE SYSTEM SHALL set `robots: noindex,nofollow` and `title: 'Shopping Cart'` via `generateMetadata`.
    - THE SYSTEM SHALL classify `/cart` as `Cache-Control: no-store` via the security-config middleware.
    - WHEN `CartContent` is pending, THE SYSTEM SHALL render `CartSkeleton` with fixed heights matching the final layout, preventing CLS on content swap.
    - THE SYSTEM SHALL leave the `(checkout)` route group untouched.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: /cart returns 200 with no-store
      When a customer requests GET /cart on mobile
      Then the response status is 200
      And the Cache-Control header includes no-store
      And the response renders within the (cart) layout

    Scenario: Skeleton prevents layout shift
      Given /cart is requested
      When CartSkeleton renders as the Suspense fallback
      And real content swaps in
      Then CLS (p75, mobile) is under 0.1 in Lighthouse
    ```

- [x] **[CART01-07] Shared API-route helper (`runCartMutation`)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 3
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:helper
  - **Depends on:** CART01-02, CART01-05
  - **Deliverable:** `app/api/cart/_helpers/run-cart-mutation.ts` -- reusable helper parsing request body with Zod, dispatching a `bffClient` mutation, mapping errors to `CartMutationResult`, and returning JSON with correct status codes.
  - **Design:** [`./design.md#25-api-route-scaffolding`](design.md#25-api-route-scaffolding); [`domain/cart/solution.md#43-level-3--cross-cutting-runtime-helper`](../../../domain/cart/solution.md#43-level-3--cross-cutting-runtime-helper)
  - **Acceptance (EARS):**
    - WHEN the request body fails Zod parsing, THE SYSTEM SHALL return 400 with `{ code: 'VALIDATION_ERROR', issues }`.
    - WHEN the mutation callback succeeds, THE SYSTEM SHALL return 200 with `{ success: true, cart: cartToViewModel(bffCart) }`.
    - WHEN the mutation callback throws, THE SYSTEM SHALL map the error via `extractCartError` and return the matching HTTP status.
    - THE SYSTEM SHALL call `flushTelemetryAfterResponse()` on every exit path.
    - THE SYSTEM SHALL remain stable -- CART02 and CART03 reuse it without edits.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: 401 maps to SESSION_EXPIRED
      Given the BFF returns 401 for the mutation
      When runCartMutation completes
      Then the response status is 401
      And the body is { success: false, code: 'SESSION_EXPIRED' }
    ```

- [x] **[CART01-08] `useRevalidateMiniCart()` hook**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 1
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:hook
  - **Depends on:** -
  - **Deliverable:** `ui/hooks/useRevalidateMiniCart.ts` -- shared client hook that revalidates the mini-cart SWR key. The only surface outside the mini-cart module that knows the key.
  - **Design:** [`./design.md#23-ui-layer-foundation-scaffold-only`](design.md#23-ui-layer-foundation-scaffold-only); [`domain/cart/solution.md#35-cartviewmodel-as-the-single-ui-contract`](../../../domain/cart/solution.md#35-cartviewmodel-as-the-single-ui-contract)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL export `useRevalidateMiniCart()` returning a stable `() => Promise<void>`.
    - WHEN the returned function is called, THE SYSTEM SHALL invoke `useSWRConfig().mutate(CART_ENDPOINTS.GET_MINI_CART.path)`.
    - THE SYSTEM SHALL be exported from the client barrel.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Hook invokes SWR mutate with the mini-cart key
      Given a client component uses useRevalidateMiniCart()
      When the returned function is called
      Then useSWRConfig().mutate is called with the mini-cart path
    ```

- [x] **[CART01-09] Zustand UI-coordination scaffold (`useCartModalStore`)**
  - **Status:** Done | **Priority:** P0 | **Estimate:** 1
  - **Epic:** CART01 | **Labels:** phase:alpha, domain:cart, type:store
  - **Depends on:** CART01-01
  - **Deliverable:** First Zustand store in the cart module; tracks which cart-adjacent overlay is dominant. Establishes the pattern `useCartUndoStore` (CART03) and `useSaveForLaterStore` (CART11) will reuse.
  - **Design:** [`./design.md#23-ui-layer-foundation-scaffold-only`](design.md#23-ui-layer-foundation-scaffold-only); [`domain/cart/solution.md#36-narrow-client-state-in-zustand`](../../../domain/cart/solution.md#36-narrow-client-state-in-zustand); ADR-0017
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL add `zustand` (latest 5.x) as a runtime dependency of `apps/store`.
    - THE SYSTEM SHALL declare `'use client'` at the top of the store file.
    - THE SYSTEM SHALL expose `CartModalId` as a closed string-union of cart-adjacent overlay IDs.
    - WHEN `openModal(id)` is called, THE SYSTEM SHALL replace any currently open overlay (at most one dominant at a time).
    - WHEN `closeModal()` is called with no argument, THE SYSTEM SHALL close any open overlay; with an argument it closes only the matching overlay.
    - THE SYSTEM SHALL omit `persist` and `devtools` middleware; state is memory-only.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Only one overlay is dominant at a time
      Given the modal store is empty
      When openModal('mini-cart-popover') is called
      And openModal('purchase-protection-tooltip') is called
      Then the dominant overlay is 'purchase-protection-tooltip'

    Scenario: closeModal with a stale id is a no-op
      Given the dominant overlay is 'undo-toast'
      When closeModal('mini-cart-popover') is called
      Then the dominant overlay is still 'undo-toast'
    ```

## 4. Traceability

### Stories to solution sections

| Story     | `domain/cart/solution.md` section                                        |
| --------- | ------------------------------------------------------------------------ |
| CART01-01 | 4.2 Level 2 -- module, 6.2 Types and schemas                             |
| CART01-02 | 3.2 BFF-first integration, 4.2 Level 2                                   |
| CART01-03 | 3.5 `CartViewModel` as the single UI contract, 6.3 Legacy business rules |
| CART01-04 | 3.1 Server-owned cart state, 7.5 Cache and routing                       |
| CART01-05 | 7.1 Error taxonomy                                                       |
| CART01-06 | 5.5 Cart page load, 7.4 Rollout control, 7.5 Cache and routing           |
| CART01-07 | 4.3 Level 3 cross-cutting runtime helper                                 |
| CART01-08 | 3.5 `CartViewModel` as the single UI contract                            |
| CART01-09 | 3.6 Narrow client state in Zustand                                       |

### Stories to product outcomes

| Story           | Outcome (from [`domain/cart/product.md`](../../../domain/cart/product.md) Section 7) |
| --------------- | ------------------------------------------------------------------------------------ |
| CART01-01 .. 04 | "A customer can complete the full browse-to-checkout journey" (substrate)            |
| CART01-05, 07   | Error UX + observability: every `CartMutationErrorCode` has tested customer copy     |
| CART01-06       | Cart page LCP p75 < 2.5 s; no CLS from skeleton -> content swap                      |
| CART01-08, 09   | Mini-cart coherence = 100% across mutation origins                                   |

## 5. Definition of Done

A story in this backlog is done when:

- [x] All EARS acceptance statements hold and every Gherkin scenario passes.
- [x] Unit and integration tests pass locally (`pnpm test modules/cart`, `pnpm test app/api/cart`) and in CI; coverage on new files >= 80%.
- [x] `pnpm typecheck` passes with zero `any` (except where JSDoc-justified against a BFF shape).
- [x] `pnpm lint` passes with no new warnings.
- [x] Story ID and solution section links appear in the commit message body.
- [x] Code review approved by at least one other squad engineer.
- [x] PR merged into `main`.

The epic (CART01) is done when every story is done **and** the Alpha exit criteria in [`domain/cart/roadmap.md`](../../../domain/cart/roadmap.md) Now phase hold.

**Validation (2026-04-23):** all nine stories complete. 178 test files pass (1502 tests) across `src/modules/cart`, `src/app/api/cart`, and `src/app/(cart)`.

## 6. Risks (work-package specific)

| ID  | Risk                                                                                              | Likelihood | Impact | Mitigation                                                                   |
| --- | ------------------------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------- |
| F1  | `@tpw/bff-client-types` drifts from the `storefront-bff` OpenAPI spec during the initial scaffold | Low        | Medium | Regenerate at sprint start; pin version; update fixture builders in lockstep |
| F2  | `/cart` mis-classification causes caching                                                         | Low        | High   | CART01-06 asserts `Cache-Control: no-store` via smoke test                   |

Broader cart-domain risks are in [`domain/cart/backlog.md`](../../../domain/cart/backlog.md) Section 10.

## 7. Handoff

Contracts CART01 leaves stable for later work packages:

- `CartViewModel` + all slice types + `BffCart` aliases.
- `bff-cart.client.ts` (server-only helpers for `getCart()` and every cart mutation action).
- `getCart()` query.
- `cartToViewModel` mapper.
- `runCartMutation` API-route helper.
- `extractCartError` + `getCartErrorMessage`.
- `useRevalidateMiniCart()` hook.
- `useCartModalStore` Zustand store.
- `(cart)/cart/page.tsx` shell + `CartSkeleton`; `(cart)/layout.tsx`.

Next work packages:

1. [`work/cart/02-add-to-cart/`](../02-add-to-cart/) -- CART02 PDP add-to-cart flow.
2. `work/cart/03-page-core/` -- CART03 line items, qty, remove.
3. `work/cart/04-order-summary/` -- CART04 pricing card + CTA.
