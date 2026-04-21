---
type: Backlog
scope: domain
domain: cart
version: '2.1'
owner: Cart & Checkout Squad
status: Reviewed
last_updated: 2026-04-21
figma: 'https://www.figma.com/design/ZrCnkba5v8L833qSqkwIOo/Cart-Redesign?node-id=2937-104836'
parent_product: product/product.md
---

# Backlog -- Cart (domain)

Domain-level backlog for the cart. Epic-level only. Story detail lives in
per-work-package backlogs under `work/`.

## 1. Summary

### Objective

Deliver a complete, production-ready Cart experience: working add-to-cart on
the PDP, coherent mini-cart popover, and redesigned `/cart` page matching the
Cart Redesign Figma. Ship in staged increments so each epic produces a visible,
testable slice.

### Delivery approach

Built in **stages**, not as a monolith. 14 epics correspond to those stages.
When an epic becomes active its story backlog lives in `work/{package}/backlog.md`.

**Wave delivery.** Wave 1 ships against today's `Cart_v0_1` schema with safe
fallbacks. Wave 2 turns features on as each BFF schema uplift item lands.
See `domain/cart/dependencies/bff-contract-uplift.md`.

### Prerequisites (complete)

- `@tw/bff-client` and `bffClient` from `@/lib/bff` in place
- `@tpw/bff-client-types` available
- `(checkout)` route group with layout
- Existing mini-cart module (`bff-minicart.client.ts`, popover components)
- BFF `GET /carts` and `PUT /carts/{cartId}` documented in `storefront-bff` spec

### Prerequisites (required before core cart ships)

- **BFF `Cart_v0_1` field completeness (Wave 1, P0)** — tracked in
  `dependencies/bff-contract-uplift.md`
- **Cloudflare Worker `/api/*` forwarding** — status quo; no change required

### Out of scope (cart domain)

- Checkout flow — Checkout domain
- Trade-quote flows — deferred to CART15 follow-up epic
- Personalisation, visual commerce, trade pricing, NZ — later platform phases

## 2. Conventions

| Convention | Value |
| ---------- | ----- |
| Epic ID format | `CART{00}` |
| Story ID format | `CART{00}-{00}` (stored in work-package backlog) |
| BFF ask ID | `BFF-CART-{00}` (tracked in `dependencies/bff-contract-uplift.md`) |
| Status values | Not started, In progress, In review, Done, Blocked |
| Priority levels | P0 (must have), P1 (should have), P2 (stretch), P3 (defer) |
| Estimation | Fibonacci story points (1, 2, 3, 5, 8, 13) |

## 3. Epic breakdown

| Epic | Title | Roadmap phase | Priority | Dependencies | Points | Work package | Status |
| ---- | ----- | ------------- | -------- | ------------ | ------ | ------------ | ------ |
| CART01 | Cart Foundation and Module Scaffold | Phase 1 -- Alpha | P0 | None | 18 | `work/cart/01-foundations/` | Active |
| CART02 | PDP Add to Cart Flow | Phase 1 -- Alpha | P0 | CART01 | 10 | `work/cart/02-add-to-cart/` (planned) | Not started |
| CART03 | Cart Page: Line Items, Quantity, Remove | Phase 1 -- Alpha | P0 | CART01 | 18 | `work/cart/03-page-core/` (planned) | Not started |
| CART04 | Order Summary Core | Phase 2 -- Beta | P0 | CART01, CART03 | 15 | `work/cart/04-order-summary/` (planned) | Not started |
| CART05 | Empty State and Trade Program Row | Phase 2 -- Beta | P0 | CART01 | 8 | `work/cart/05-empty-state/` (planned) | Not started |
| CART06 | Reconciliation and Error Handling | Phase 2 -- Beta | P0 | CART03, CART04 | 13 | `work/cart/06-reliability/` (planned) | Not started |
| CART07 | Line Item Polish | Phase 3 -- Feature-complete | P1 | CART03, BFF-CART-01..03 | 16 | `work/cart/07-line-polish/` (planned) | Not started |
| CART08 | Promo Code Entry | Phase 2 -- Beta | P0 | CART04, BFF-CART-07 | 13 | `work/cart/08-promo/` (planned) | Not started |
| CART13 | Analytics and Observability Verification | Phase 2 -- Beta | P0 | CART02..CART04, CART08 | 5 | `work/cart/13-analytics/` (planned) | Not started |
| CART14 | Accessibility and Core Web Vitals Gate | Phase 2 -- Beta | P0 | CART03..CART06 | 8 | `work/cart/14-quality-gate/` (planned) | Not started |

## 4. Traceability

### Requirements to epics

| Requirement | Epic(s) |
| ----------- | ------- |
| FR-01 BFF cart client + CartViewModel mapper | CART01 (client + mapper), CART02+ (concrete mutations) |
| FR-02 Cart query + cache strategy | CART01 |
| FR-03 Add-to-cart on PDP | CART02 |
| FR-04 Mini-cart refresh after mutations | CART01 (hook); every mutation epic |
| FR-05 Cart page replaces placeholder | CART01 (shell), CART03 (content) |
| FR-14 Mutation error handling | CART01 (registry); every epic |
| FR-16 Analytics instrumentation | CART02, CART03, CART04, CART08, CART13 |

## 5. Epics

### CART01 -- Cart Foundation and Module Scaffold

**Scope:** BFF cart client, `CartViewModel` + mapper, cart query, API-route
helper, error-code registry, feature flag, cart page shell + skeleton,
`useRevalidateMiniCart()` hook, `useCartModalStore` (Zustand).

**Dependencies:** None.
**Status:** Active.
**Work package:** `work/cart/01-foundations/` — story detail in
`work/cart/01-foundations/backlog.md`.

### CART02 -- PDP Add to Cart Flow

**Scope:** Replace stubbed ATC with a working `addLineItem` flow. Validate
quantity, fire analytics, revalidate mini-cart on success.

**Dependencies:** CART01.
**Status:** Not started.
**Work package:** `work/cart/02-add-to-cart/` (planned).

## 6. Dependency graph

```text
               CART01  Foundation
                  |
        ┌─────────┴──────────┐
        v                    v
     CART02 ATC           CART03 Cart core
                              |
                           CART04 Order summary
                              |
        ┌──────────┬──────────┤
        v          v          v
     CART05     CART06     CART08
     Empty      Reliability Promo

Parallel: BFF-CART-01..10 schema uplift
```

### Critical path

**CART01 → CART02 + CART03 → CART04 → CART06 → CART14**

### Minimum viable slice

CART01 + CART02 + CART03 + CART04 + CART05 + CART06 + CART08 + CART13 + CART14
(~108 points). Cost: no postcode shipping, no Purchase Protection, no Save for Later,
no line-item polish.

## 7. Risks and assumptions

### Assumptions

| ID | Assumption | Impact if wrong |
| -- | ---------- | --------------- |
| A1 | BFF `GET /carts` and `PUT /carts/{cartId}` are reachable via `bffClient` in dev/staging | CART02-04 E2E testing blocks on mocked responses |
| A2 | BFF schema uplift (BFF-CART-01..10) can be planned by BFF squad in parallel | CART07/08/09/10 feature depth blocks until each uplift lands |
| A3 | Cloudflare Worker continues to forward `/api/*` POST requests | API-route pattern breaks; Server Actions pivot required |
| A4 | No finite state machine needed for cart mutation flows; `useOptimistic` + SWR covers all flows | If multi-step client-owned state emerges, reconsider XState for that flow only |

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| -- | ---- | ---------- | ------ | ---------- |
| R1 | BFF schema uplift lands later than expected | High | Medium | Wave-1 mapper fallbacks; each uplift is a single-file mapper change |
| R2 | Multiple cart modals without a coordinator cause UI collisions | Low | Low | `useCartModalStore` (Zustand) lands in CART01 |
| R3 | Optimistic rollbacks on slow networks cause jarring UX | Medium | Medium | `useTransition` + per-line pending state + RUM monitoring |
| R4 | Cart JS bundle exceeds 40KB | Low | Medium | No XState; code-split large components; CART14 enforces budget in CI |
