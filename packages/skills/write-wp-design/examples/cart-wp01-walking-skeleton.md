---
type: Design
scope: work-package
mode: walking-skeleton
work_package: 01-foundations
epic: CART01
domain: cart
version: "2.0"
owner: Cart & Checkout Squad
status: Done
last_updated: 2026-04-23
related:
  - domain/cart/product.md
  - domain/cart/solution.md
  - domain/cart/contracts.md
  - domain/cart/backlog.md
  - work/cart/01-foundations/backlog.md
---

# Design -- Cart Foundations (CART01)

Walking-skeleton design for the **Cart Foundations** work package at `work/cart/01-foundations/`, which implemented CART01 from [`domain/cart/backlog.md`](../../../domain/cart/backlog.md). Shipped 2026-04-23.

This is the _foundation-sprint_ design: it names the one end-to-end slice CART01 proved, the acceptance gates the slice had to clear, and the files this sprint created. Domain-wide patterns (BFF-first, server-owned state, optimistic-where-safe, error taxonomy) are authoritative in [`domain/cart/solution.md`](../../../domain/cart/solution.md) and are **not** repeated here.

If you are working on a later cart sprint, read this doc for the substrate CART01 left in place, then read the sprint's own `design.md` (TDD mode) for sprint-specific detail.

## 1. The slice

The walking skeleton CART01 landed, in one paragraph:

> **A customer can navigate to `/cart` on the new storefront. The route renders a server-rendered shell with a fixed-height skeleton under Suspense. No real cart data is read yet, but the request flows through the `(cart)` route group and its layout, the skeleton has the same dimensions as the future line items and order summary (so there is no CLS when content swaps in), and the mini-cart popover in the header remains coherent.**

Everything else CART01 built exists to make later epics stand up this surface with real data.

## 2. Files shipped

Every file below references domain patterns by link rather than redefining them. See [`domain/cart/solution.md`](../../../domain/cart/solution.md) Section 4 for the module layout pattern.

### 2.1 Data layer

```text
modules/cart/data/
  clients/
    bff-cart.client.ts        NEW   bffClient calls: getCart() + mutation helpers
    bff-minicart.client.ts    KEEP  existing mini-cart read
    run-cart-mutation.ts      NEW   shared API-route helper (see solution.md §4.3)
  queries/
    get-cart.ts               NEW   React cache() wrapper, 'import server-only'
  mappers/
    cart.mapper.ts            NEW   cartToViewModel with Wave-1 fallbacks
  schemas/
    cart-action-schema.ts     NEW   Zod schemas for AddCartLine / UpdateCartLine / Remove / AddPromo / RemovePromo
    cart.schema.ts            KEEP  existing mini-cart type aliases
  cache/
    cache-tags.ts             NEW   CART_TAG, CHECKOUT_TAG exports
  errors.ts                   NEW   extractCartError (server-only)
```

### 2.2 Logic layer

```text
modules/cart/logic/
  types.ts                    EVOLVE  adds CartViewModel + all slice types + BffCart aliases
  error-messages.ts           NEW     getCartErrorMessage for every CartMutationErrorCode
  constants.ts                NEW     MAX_CART_ITEMS, legacy business-rule constants
  cart-reducer.ts             NEW     reduceCart for optimistic updates (used by CART03+)
  endpoints.ts                KEEP    existing CART_ENDPOINTS
```

### 2.3 UI layer (foundation scaffold only)

```text
modules/cart/ui/
  cart-page/
    CartSkeleton.tsx          NEW     server component; fixed heights matching Figma
  hooks/
    use-revalidate-mini-cart.ts   NEW  the only surface that knows the mini-cart SWR key
  stores/
    use-cart-modal-store.ts       NEW  Zustand (first store; per ADR-0017 + solution.md §3.6)
  mini-cart/                    KEEP   existing popover (untouched by CART01)
  index.ts                      EVOLVE server barrel (CartViewModel types exported)
  client.ts                     EVOLVE client barrel (hooks + client-safe types)
```

### 2.4 Route group

```text
apps/store/src/app/(cart)/
  layout.tsx                   NEW   cart-specific layout (NavigationHeader + MainFooter)
  cart/
    page.tsx                   NEW   RSC shell: Suspense + CartSkeleton + getCart() fallback
    error.tsx                  NEW   route-level error boundary
    loading.tsx                NEW   route-level loading (renders CartSkeleton)
```

### 2.5 API route scaffolding

No cart mutation routes ship in CART01. The `runCartMutation` helper is present so later sprints add routes as three-line files. A placeholder mutation route is **not** added (no premature surface).

## 3. The acceptance gates the slice had to clear

Foundation-sprint acceptance is narrower than a TDD-sprint acceptance set. The slice passes if all of the following hold:

### 3.1 End-to-end path

- `GET /cart` returns 200 on both mobile and desktop from the new storefront, rendering the skeleton.
- Request flows through the `(cart)` route group and its layout; header and footer render.
- `Cache-Control: no-store` is set on the response.
- The mini-cart popover in the header remains coherent (unchanged from pre-CART01).

### 3.2 Observability hook fires

- One server trace span `cart.page.render` emits per request.
- One `route.cart.page` log line emits per request, with correlation id and hashed cart id (when session has a cart).

### 3.3 Error path is exercised

- When the BFF returns a non-200 for the (future) `getCart()` call, `error.tsx` renders the typed error surface (copy from `error-messages.ts`). CART01 triggers this via a feature-flagged induced-failure endpoint; real error paths ship with CART03+.

### 3.4 Scaffolds are complete

- `cartToViewModel(BffCart)` compiles with exhaustive type coverage on `CartViewModel` and every slice type in [`contracts.md`](../../../domain/cart/contracts.md) Section 3.
- `useRevalidateMiniCart()` is the only symbol outside the mini-cart module that knows the mini-cart SWR key; grep verifies.
- `useCartModalStore` is the only Zustand store shipped; `zustand` added as a runtime dep of `apps/store`.

### 3.5 Quality gates (Alpha subset)

- `pnpm typecheck` passes with zero `any` in the cart module.
- `pnpm test modules/cart` passes (unit tests for mapper, reducer, schemas, and error extractor).
- `axe-core` passes on `/cart` rendering the skeleton.
- Lighthouse on a seeded `/cart` hits `CM-G01..04` (LCP, INP, CLS, JS bundle).

## 4. What CART01 did NOT deliver

Stated so later sprints do not assume they can lean on work that was not done:

- No real `getCart()` call is made in production yet -- the page renders the skeleton and a "cart coming soon" placeholder under the feature flag. CART03 replaces this with real rendering.
- No cart mutation routes are live (`POST /api/cart/items` etc.). The route folder is created, `runCartMutation` is implemented and tested, but no concrete routes ship.
- No analytics events fire from the cart page. Legacy mini-cart events continue to flow unchanged.
- No version-conflict retry or reconciliation banner. `VERSION_CONFLICT` mapping exists in the error registry; UX lands in CART06.
- No basket merge on sign-in. `useCartRefetch()` helper is present but not wired to `useOnAuthChange()`; the wiring lands alongside the auth-cart-merge epic.

## 5. Open questions closed during CART01

Captured for the cart domain's historical record.

- **Feature-flag placement.** Decision: no application-level `newCartPage` flag. Access to `/cart` is controlled at the Cloudflare worker layer (forwards to legacy until the worker routing flips). Simpler than an in-app flag and keeps middleware clean.
- **`(cart)` vs `(checkout)` route group.** Decision: dedicated `(cart)` group so the cart can carry its own layout without depending on checkout's chrome.
- **Zustand scope.** Decision: modal coordinator first (open / close mini-cart), undo queue and Save-for-Later session store land with CART03 and CART11 respectively. All Zustand usage in the cart module is enumerable and bounded.
- **Mini-cart revalidation surface.** Decision: a single hook (`useRevalidateMiniCart`) is the only surface outside the mini-cart module that knows its SWR key. All later epics call this hook; grep catches drift.

## 6. Handoff to CART02+

CART02 picks up the scaffold and ships the first real mutation. What it can assume is ready:

- `bff-cart.client.ts` is present with a `getCart()` implementation and typed mutation helpers.
- `runCartMutation` is the shared route-handler pattern.
- `cart-action-schema.ts` has `AddCartLineSchema` already defined (CART02 consumes it verbatim).
- `cart.mapper.ts` returns a complete `CartViewModel` with Wave-1 fallback behaviour; CART02 can trust the shape.
- `useRevalidateMiniCart()` is exported from the client barrel.
- `error-messages.ts` covers every `CartMutationErrorCode`; CART02 consumes the copy unchanged.
- Feature-flag + routing substrate is in place; CART02 needs no further flag plumbing.

The stories CART02 implements are in [`work/cart/02-add-to-cart/backlog.md`](../02-add-to-cart/backlog.md).
