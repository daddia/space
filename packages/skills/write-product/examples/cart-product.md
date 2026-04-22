---
type: Product
domain: cart
version: '1.1'
owner: Cart & Checkout Squad
status: Reviewed
last_updated: 2026-04-21
parent_product: product/product.md
related:
  - domain/cart/roadmap.md
  - domain/cart/metrics.md
  - domain/cart/requirements.md
  - domain/cart/design.md
  - domain/cart/contracts.md
  - domain/cart/backlog.md
---

# Product -- Cart

## 1. Executive summary

The cart is the bridge between browsing and buying. It is the surface where
a customer commits to purchase intent: reviewing selections, adjusting
quantities, applying promotions, and deciding to proceed to checkout. Within
the Temple & Webster storefront, the cart is the commercial hinge that converts
traffic into revenue; it also defines the `CartViewModel` contract every other
cart-adjacent surface renders from.

This document defines the cart as a sub-product of the storefront: its problem,
strategic thesis, scope, users, and commercial boundaries. It is the anchor for
`domain/cart/roadmap.md`, `domain/cart/metrics.md`, and
`domain/cart/backlog.md`.

**Squad ownership:** Cart & Checkout squad. The BFF squad owns the
`storefront-bff` API contract the cart module calls.

## 2. Problem

The new storefront cannot complete an end-to-end transaction:

- **No full-cart BFF wiring.** No `getCart()` query, no mutation routes, no
  `CartViewModel`. Only a read-only mini-cart popover exists.
- **Add-to-cart on the PDP is a stub.** Every click logs a TODO.
- **The cart page is a placeholder.** `/cart` renders static text and `$0.00`.
- **Cart state is not reactive.** Changes from one surface do not propagate.
- **Abandonment cannot be measured.** No functional cart means no baseline.

The legacy basket is a ~25,000-line PHP monolith that cannot be meaningfully
improved without replacing it.

## 3. Opportunity

1. **Prove the full mutation pipeline** end-to-end: PDP -> API route ->
   `bffClient` -> BFF -> mini-cart refresh -> cart page render.
2. **Establish the `CartViewModel` contract** the Checkout domain builds against.
3. **Deliver conversion improvements** from the Cart Redesign Figma: trust
   signals, savings clarity, free-delivery progress, mobile sticky CTA.
4. **Provide the telemetry substrate** personalisation and visual commerce need.

## 4. Strategic thesis

1. **Server-owned state.** Cart is authoritative on the BFF. No client-side
   state machine. `react-hook-form` + `useOptimistic` + SWR cover every flow.
2. **BFF-first integration.** All reads and mutations go through `bffClient`
   from `@/lib/bff`. No direct backend calls from module code.
3. **Server-first rendering with surgical client islands.** The cart page is an
   RSC. Only interactive controls (stepper, remove, promo, postcode, PP) are
   client components. LCP is non-negotiable.
4. **Optimistic where safe, honest where not.** Line-level edits use
   `useOptimistic` for zero perceived latency. Cart-level pricing mutations
   surface pending state and wait for the server.

## 5. Value claim

1. Unblocks end-to-end commerce — no purchase is possible without this.
2. Maintains or improves cart-to-checkout step rate vs legacy baseline.
3. Establishes the experimentation substrate for Phase 4 personalisation.
4. Reduces maintenance cost by collapsing four legacy rendering paths into one.

## 6. Target users

### Primary

- **Anonymous shopper on mobile.** Largest segment. Needs sub-2.5s LCP, sticky
  bottom CTA, and ergonomic quantity controls.
- **Anonymous shopper on desktop.** Higher AOV. Sticky right-column summary,
  free-delivery progress drives add-to-cart behaviour.
- **Authenticated shopper.** Cross-device persistence, stored credit,
  faster checkout path. Basket merge on sign-in must preserve quantities.

### Secondary

- **Authenticated trade customer.** Trade Program row; full trade-quote flow
  deferred to CART15.

### Out of scope for this product

- Subscription / recurring-purchase customers
- NZ market customers (deferred to Phase 6)
- Customers transacting in currencies other than AUD

## 7. Scope

### In scope

- Full redesigned `/cart` page replacing the current placeholder
- PDP add-to-cart flow replacing the stub
- Mini-cart popover coherence after mutations
- `CartViewModel` as the single data↔UI contract
- Line items, quantity stepper, remove with undo
- Order summary with subtotal, savings, shipping, discounts, total
- Promo code entry (all states)
- Empty cart state and Trade Program row
- Cart analytics and observability
- Accessibility: WCAG 2.1 AA

### Out of scope

- Checkout flow (owned by the Checkout domain)
- Cart-level cross-sell powered by personalisation (Phase 4)
- Trade / commercial pricing and project organisation (Phase 6)
- NZ-specific cart (Phase 6)
- Cart abandonment recovery email (marketing layer)

### Adjacent surfaces

- **PDP.** Origin of most add-to-cart events. Consumes the cart's API route
  contract; does not model cart state.
- **Mini-cart popover.** Calls `bffClient` at `GET /carts?view=mini`. Kept
  coherent by `useRevalidateMiniCart()` after every mutation.
- **Checkout.** Consumes `CartViewModel` and BFF-derived types.
- **BFF squad.** Owns `storefront-bff` schema; cart schema uplift tracked in
  `domain/cart/dependencies/bff-contract-uplift.md`.

## 8. Ownership and interfaces

| Interface | Counterparty | Obligation |
| --------- | ------------ | ---------- |
| `CartViewModel` (data-to-UI contract) | Checkout domain | Stable; additive-only; no breaking changes without coordination |
| `storefront-bff` `GET /carts` + `PUT /carts/{cartId}` | BFF squad | Cart reads and mutations; schema uplift tracked in `bff-contract-uplift.md` |
| `POST /api/cart/items` (add-to-cart route) | Shopping Experience (PDP) | Typed request + `CartMutationResult` response; stable |
| Mini-cart SWR key (`/api/cart/mini`) | Shared | `useRevalidateMiniCart()` is the only surface that mutates this key |
| Cart analytics events | Analytics squad | Typed payloads via `track()`; event schema owned by Cart |

## 9. Success definition

The cart is **done for this product cycle** when:

1. A customer can complete browse → add → view cart → apply promo → checkout on
   the new storefront behind the `newCartPage` flag, against real BFF data, on
   mobile and desktop.
2. Cart-to-checkout step rate matches or exceeds the legacy baseline (CM-01).
3. Cart page LCP p75 (mobile) < 2.5s; INP p75 < 200ms; CLS p75 < 0.1.
4. Add-to-cart success rate > 99%; mutation p75 round-trip < 800ms.
5. `CartViewModel` is stable; the Checkout domain builds against it without
   contract churn.
6. WCAG 2.1 AA accessibility audit passes.
7. All cart analytics events fire with typed payloads; RED metrics visible.
8. `newCartPage` is enabled for 100% of AU traffic; legacy `/v/checkout/basket`
   path is classified deprecated.

## 10. Relationship to the storefront product

The storefront sequences as: foundation → core shopping → commerce flows →
personalisation → visual commerce. The cart sits at **commerce flows** and is
the prerequisite for everything that follows:

- **Phase 4 (personalisation)** depends on cart behaviour signals.
- **Phase 5 (visual commerce)** depends on a cart surface capable of receiving
  3D / AR-originated add-to-cart events.
- **Phase 6 (trade + NZ)** extends the cart rather than building a parallel one.

The cart is not a standalone product — it is a squad-owned sub-product governed
against the storefront's north-star metric (conversion rate).
