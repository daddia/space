---
type: Backlog
scope: domain
domain: cart
version: "2.0"
owner: Cart & Checkout Squad
status: Draft
last_updated: 2026-04-23
figma: "https://www.figma.com/design/ZrCnkba5v8L833qSqkwIOo/Cart-Redesign?node-id=2937-104836"
parent_product: domain/cart/product.md
related:
  - domain/cart/product.md
  - domain/cart/solution.md
  - domain/cart/roadmap.md
  - domain/cart/metrics.md
  - domain/cart/contracts.md
  - domain/cart/dependencies/bff-contract-uplift.md
---

# Backlog -- Cart (domain)

Domain-level epic backlog. Lists the epics the cart domain will deliver, their objective, dependencies, status, and the work package that carries each one when active. Story-level detail lives in the per-work-package backlogs under [`work/cart/`](../../work/cart/).

- **Product:** [`domain/cart/product.md`](product.md)
- **Solution:** [`domain/cart/solution.md`](solution.md)
- **Phases, gates, milestones:** [`domain/cart/roadmap.md`](roadmap.md)
- **Metrics, baselines, targets:** [`domain/cart/metrics.md`](metrics.md)
- **BFF contract dependency:** [`domain/cart/dependencies/bff-contract-uplift.md`](dependencies/bff-contract-uplift.md)

## 1. Summary

**Objective.** Deliver a production-ready cart on the new storefront: working add-to-cart on the PDP, coherent mini-cart popover, and redesigned `/cart` page matching the Cart Redesign Figma. Ship in staged increments so each epic produces a visible, testable slice.

**Delivery approach.** Cart is built in stages. Each epic delivers a self-contained, visible increment. Ship Wave 1 against the current `Cart_v0_1` schema with safe fallbacks; Wave 2 features activate as each BFF schema uplift item lands.

**Prerequisites (complete).**

- `bffClient` from `@/lib/bff` available; `@tpw/bff-client-types` generated from the `storefront-bff` OpenAPI spec.
- `@tw/http` (`HttpStatusError`) and `@tw/logging` available.
- Existing mini-cart module (read-only popover) under `modules/cart/ui/mini-cart/`.
- `(checkout)` route group with layout (referenced but not modified by this domain).
- BFF `GET /carts` (full view) and `PUT /carts/{cartId}` (mutations) reachable via `bffClient`.

**Prerequisites (required before core cart ships).**

- BFF `Cart_v0_1` Wave-1 field completeness (gaps tracked in [`dependencies/bff-contract-uplift.md`](dependencies/bff-contract-uplift.md)).
- `/cart` classified as `Cache-Control: no-store` in `lib/security/config.ts`.
- Cloudflare Worker routing confirmed status-quo (`/api/*` POST -> new storefront).

**Out of scope.** The canonical list of cart no-gos lives in [`domain/cart/product.md`](product.md) §5. Phase-gated deferrals (items activating in a future storefront phase) live in [`domain/cart/roadmap.md`](roadmap.md) §Later. This backlog does not restate either.

## 2. Conventions

| Convention        | Value                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Epic ID           | `CART{nn}` (e.g. `CART01`)                                                                   |
| Story ID          | `CART{nn}-{nn}` (lives in the work-package backlog)                                          |
| BFF ask ID        | `BFF-CART-{nn}` (tracked in `dependencies/bff-contract-uplift.md`)                           |
| Status            | Not started, In progress, In review, Done, Blocked                                           |
| Priority          | P0 (must have), P1 (should have), P2 (stretch), P3 (defer)                                   |
| Estimation        | Fibonacci story points (1, 2, 3, 5, 8, 13)                                                   |
| Acceptance format | EARS + Gherkin at work-package scope (see `docs/design/space-artefact-model.md` Section 5.3) |

## 3. Epic breakdown

| Epic      | Title                                               | Phase | Priority | Deps                           | Points   | Work package                               | Status      |
| --------- | --------------------------------------------------- | ----- | -------- | ------------------------------ | -------- | ------------------------------------------ | ----------- |
| CART01    | Cart foundation and module scaffold                 | Now   | P0       | -                              | 18       | `work/cart/01-foundations/`                | Done        |
| CART02    | PDP add-to-cart flow                                | Now   | P0       | CART01                         | 10       | `work/cart/02-add-to-cart/`                | Not started |
| CART03    | Cart page: line items, quantity, remove             | Now   | P0       | CART01                         | 18       | `work/cart/03-page-core/` (planned)        | Not started |
| CART04    | Order summary core (pricing card + checkout CTA)    | Now   | P0       | CART01, CART03                 | 15       | `work/cart/04-order-summary/` (planned)    | Not started |
| CART05    | Empty state and Trade Program row                   | Now   | P0       | CART01                         | 8        | `work/cart/05-empty-state/` (planned)      | Not started |
| CART06    | Reconciliation and error handling                   | Now   | P0       | CART03, CART04                 | 13       | `work/cart/06-reliability/` (planned)      | Not started |
| CART08    | Promo code entry and application                    | Now   | P0       | CART04, BFF-CART-07            | 13       | `work/cart/08-promo/` (planned)            | Not started |
| CART13    | Analytics and observability verification            | Now   | P0       | CART02, CART03, CART04, CART08 | 5        | `work/cart/13-analytics/` (planned)        | Not started |
| CART14    | Accessibility and Core Web Vitals quality gate      | Now   | P0       | CART03..06                     | 8        | `work/cart/14-quality-gate/` (planned)     | Not started |
| CART07    | Line item polish (sale, badges, notices, inclusion) | Next  | P1       | CART03, BFF-CART-01/02/03      | 16       | `work/cart/07-line-polish/` (planned)      | Not started |
| CART09    | Postcode-driven shipping estimate                   | Next  | P1       | CART04, BFF-CART-05            | 13       | `work/cart/09-postcode/` (planned)         | Not started |
| CART10    | Purchase Protection upsell                          | Next  | P1       | CART04, BFF-CART-06            | 10       | `work/cart/10-purchase-protection/` (plan) | Not started |
| CART11    | Save for Later                                      | Next  | P1       | CART03, CART05                 | 10       | `work/cart/11-save-for-later/` (planned)   | Not started |
| CART12    | Express checkout slot integration                   | Next  | P2       | CART04, Checkout payments      | 5        | `work/cart/12-express-checkout/` (planned) | Not started |
| CART15    | Trade-quote flows (follow-up)                       | Later | P3       | Trade backend                  | TBD      | `work/cart/15-trade-quote/` (planned)      | Not started |
| **Total** |                                                     |       |          |                                | **162+** |                                            |             |

Work-package directories listed as "(planned)" do not yet exist; they are created when the epic enters active status.

## 4. Epic detail

### CART01 -- Cart foundation and module scaffold

**Scope.** Build the shared foundation every other cart epic depends on: module structure, BFF cart client, `CartViewModel` and mapper, cart query, `runCartMutation` API-route helper, error-code registry, feature flag, cart page shell with skeleton, mini-cart revalidation bridge, and the first Zustand UI-coordination store.

**Key deliverables.** Module scaffold (`data/`, `logic/`, `ui/`, `ui/stores/`, dual barrel); `bff-cart.client.ts` with `getCart()` + mutation helpers (via `bffClient`); `cartToViewModel(BffCart)` with Wave-1 fallbacks; `runCartMutation` helper; `(cart)` route group + `cart/page.tsx` RSC shell; `CartSkeleton`; `useRevalidateMiniCart()` hook; `useCartModalStore` Zustand store.

**Dependencies.** None (prerequisites satisfied).

**Status.** Done (validated 2026-04-23).

**Work package.** [`work/cart/01-foundations/`](../../work/cart/01-foundations/) -- story detail in its `backlog.md`; sprint-scope design in its `design.md` (walking-skeleton mode).

### CART02 -- PDP add-to-cart flow

**Scope.** Replace the non-functional "Add to cart" button on the PDP with a working request-response flow. Validate quantity via `react-hook-form` against `purchaseConfig`, fire analytics, revalidate the mini-cart on success, render inline error with retry on rejection.

**Key deliverables.** `POST /api/cart/items` route dispatching `addLineItem`; `AddCartLineRequestSchema`; `useAddCartLine()` hook; PDP `PurchaseActions` wiring (client-component conversion coordinated with Shopping Experience squad); `add_to_cart` analytics event; success confirmation (mini-cart open or toast per Figma).

**Dependencies.** CART01.

**Status.** Not started.

**Work package.** [`work/cart/02-add-to-cart/`](../../work/cart/02-add-to-cart/) -- story detail in its `backlog.md`; sprint-scope design in its `design.md` (TDD mode).

### CART03 -- Cart page: line items, quantity, remove

**Scope.** Render `/cart` with real line items, quantity stepper, remove affordance with undo, and optimistic updates with rollback. After this epic a customer can add, view, edit, and remove items end-to-end.

**Key deliverables.** `CartContent.client.tsx` orchestrator; `CartLineItem.client.tsx`; `useUpdateCartLine()` and `useRemoveCartLine()` hooks; change-quantity route (action `changeLineItemQuantity`) and remove route (action `removeLineItem`); `UndoToast.client.tsx` backed by `useCartUndoStore`; `view_cart`, `update_cart_quantity`, `remove_from_cart` events.

**Dependencies.** CART01.

**Status.** Not started. **Work package:** `work/cart/03-page-core/` (planned).

### CART04 -- Order summary core (pricing card + Proceed to Checkout)

**Scope.** The order summary per Figma: subtotal, shipping placeholder, total, "You save" line, "Proceed to checkout" primary CTA, mobile sticky bottom bar, and express-checkout button slots (rendered but inactive until CART12). The promo code row is a collapsed placeholder here (open / apply states in CART08).

**Key deliverables.** `OrderSummary.client.tsx`; `StickyCheckoutBar.client.tsx`; `ExpressCheckoutButtons.client.tsx` slot; Proceed-to-checkout CTA with empty / all-out-of-stock disabled states; `begin_checkout` event.

**Dependencies.** CART01, CART03.

**Status.** Not started. **Work package:** `work/cart/04-order-summary/` (planned).

### CART05 -- Empty state and Trade Program row

**Scope.** The empty-cart experience (signed-in and anonymous variants per Figma), the Trade Program row that appears on both populated and empty cart, and the bottom-of-page static explore slot.

**Key deliverables.** `EmptyCartState.client.tsx` (two variants); `TradeProgramRow.tsx`; `CartPageBottomSection.tsx`; `trade_program_click` event.

**Dependencies.** CART01.

**Status.** Not started. **Work package:** `work/cart/05-empty-state/` (planned).

### CART06 -- Reconciliation and error handling

**Scope.** Stock and price reconciliation on cart load (page-level banner + per-line notices), network / validation / session errors, version-conflict retry, session-expiry re-authentication without losing the cart.

**Key deliverables.** `PageReconciliationBanner.client.tsx`; session-expiry handling; version-conflict retry in mutation hooks; `useCartRefetch()` helper; error surfaces in line-item and cart-level slots.

**Dependencies.** CART03, CART04.

**Status.** Not started. **Work package:** `work/cart/06-reliability/` (planned).

### CART07 -- Line item polish

**Scope.** Figma-driven visual enhancements dependent on BFF uplift: sale pricing (red + strikethrough), "Sale" / "Out of stock" badges, per-line notices (price-change, limited-time collection), and "Added from [brand]" inclusion group headers.

**Key deliverables.** `CartLineBadge.tsx`; sale pricing visuals; `CartLineNotice.client.tsx`; `CartLineCollectionTimer.client.tsx`; `CartLineInclusionGroupHeader.tsx`; disabled stepper for out-of-stock lines.

**Dependencies.** CART03; BFF-CART-01, BFF-CART-02, BFF-CART-03.

**Status.** Not started. **Work package:** `work/cart/07-line-polish/` (planned).

### CART08 -- Promo code entry and application

**Scope.** All promo-code states from Figma: collapsed, open-empty, auto-applied (sitewide sale), manual-applied, and sitewide-sale (input hidden, discount tag shown). Apply, remove, typed error copy variants.

**Key deliverables.** `PromoCodeSection.client.tsx`; `POST /api/cart/promo-codes` (action `addPromoCode`) and `DELETE /api/cart/promo-codes/[code]` (action `removePromoCode`); `useApplyPromoCode()` and `useRemovePromoCode()` hooks; `coupon_applied` / `coupon_failed` / `coupon_removed` events.

**Dependencies.** CART04; BFF-CART-07.

**Status.** Not started. **Work package:** `work/cart/08-promo/` (planned).

### CART09 -- Postcode-driven shipping estimate

**Scope.** Shipping row with three interaction states: default, change-open (suburb + postcode typeahead), change-in-progress. Persists postcode for pre-fill on checkout. Degrades to "Calculated at checkout" when no postcode is set.

**Key deliverables.** `ShippingPostcodeBlock.client.tsx`; postcode typeahead combobox; `POST /api/cart/shipping-postcode` (action); `useUpdateShippingPostcode()` hook; postcode persistence; info modal.

**Dependencies.** CART04; BFF-CART-05.

**Status.** Not started. **Work package:** `work/cart/09-postcode/` (planned).

### CART10 -- Purchase Protection upsell

**Scope.** Radios ("Yes, protect my order" / "No thanks"), tooltip, error state, optimistic total update.

**Key deliverables.** `PurchaseProtectionBlock.client.tsx`; `POST /api/cart/purchase-protection` (action); `useUpdatePurchaseProtection()` hook; typed error copy.

**Dependencies.** CART04; BFF-CART-06.

**Status.** Not started. **Work package:** `work/cart/10-purchase-protection/` (planned).

### CART11 -- Save for Later

**Scope.** Per-line "Save for later" affordance; saved-items list below the cart; move-back-to-cart. Session-scoped in Wave 1; device-persistent once BFF-CART-09 ships.

**Key deliverables.** `SavedItemsSection.client.tsx`; `useSavedItemsStore` (Zustand, Wave 1); `POST /api/cart/saved-items` and `POST /api/cart/saved-items/restore` (Wave 2 routes when BFF-CART-09 ships); `save_for_later` / `move_to_cart` events.

**Dependencies.** CART03, CART05.

**Status.** Not started. **Work package:** `work/cart/11-save-for-later/` (planned).

### CART12 -- Express checkout slot integration

**Scope.** Wire PayPal and Pay-in-4 buttons to the Checkout domain's payment handlers. Gated on Checkout domain readiness.

**Key deliverables.** `ExpressCheckoutButtons.client.tsx` active wiring (replaces CART04 placeholder slot); analytics for each provider.

**Dependencies.** CART04; Checkout payment module.

**Status.** Not started. **Work package:** `work/cart/12-express-checkout/` (planned).

### CART13 -- Analytics and observability verification

**Scope.** Verification (not implementation) that every cart event emitted by the preceding epics is present, typed, and observable end-to-end. The preceding epics fire events inline with their feature work; CART13 is the closing gate that proves the analytics and observability surface is production-ready against the legacy funnel.

**Key deliverables.**

- Event-schema contract tests: every `track()` call in the cart module has a matching Zod schema in [`contracts.md`](contracts.md) Section 6; CI fails on drift.
- RED-metric emit verification: Rate / Errors / Duration visible per mutation action (`addLineItem`, `changeLineItemQuantity`, `removeLineItem`, `addPromoCode`, `removePromoCode`).
- Trace-attribute verification: every mutation span carries `cart_id_hashed`, `correlation_id`, `idempotency_key`, `cart_version`, and on failure `error_code`.
- Dashboards and alerts configured: the analytics funnel (`view_item` -> `add_to_cart` -> `view_cart` -> `begin_checkout`) mirrors the legacy funnel shape so baselines are comparable.
- Legacy-vs-new comparability test: a seeded staging session produces the same funnel shape against both the legacy basket and the new cart path (±1 step).

**Dependencies.** CART02, CART03, CART04, CART08 (each fires its own events; CART13 verifies the cumulative result).

**Status.** Not started. **Work package:** `work/cart/13-analytics/` (planned).

### CART14 -- Accessibility and Core Web Vitals quality gate

**Scope.** Final acceptance of the WCAG 2.1 AA and Core Web Vitals bars before the Next phase's production ramp can begin. Implementation lands incrementally through CART03..CART06 (each surface axe-clean on PR); CART14 is the cross-cutting manual-review + budget-enforcement gate.

**Key deliverables.**

- axe-core budget on cart routes enforced in CI on every PR.
- Lighthouse-CI budget on the cart page for LCP, INP, CLS, and total JS transfer (bar defined in [`metrics.md`](metrics.md) §3).
- Manual keyboard-only run-through of every cart flow (ATC, quantity, remove + undo, promo, reconciliation banner, empty state).
- Manual screen-reader run-through (VoiceOver on iOS Safari; NVDA on Windows Chrome).
- Remediation of any findings from the manual reviews; sign-off recorded in the WP backlog.
- RUM report confirming Core Web Vitals hold on staging traffic at the bar defined in [`solution.md`](solution.md) §2.1.

**Dependencies.** CART03..CART06 (the surfaces under audit).

**Status.** Not started. **Work package:** `work/cart/14-quality-gate/` (planned).

### CART15 -- Trade-quote flows (deferred)

**Scope.** `Item within Quote` and `Quote expired` Figma frames. Deferred; requires Trade backend work.

**Dependencies.** Trade backend; Trade squad alignment.

**Status.** Not started. **Work package:** `work/cart/15-trade-quote/` (planned). Deferred per [`domain/cart/roadmap.md`](roadmap.md) "Later".

## 5. Dependency graph

```text
CART01 (foundation)
  +-- CART02 (PDP ATC)           -- first mutation end-to-end
  |
  +-- CART03 (page core)         -- line items, qty, remove
  |     +-- CART04 (order summary)
  |     |     +-- CART08 (promo)      [+ BFF-CART-07]
  |     |     +-- CART09 (postcode)   [+ BFF-CART-05]
  |     |     +-- CART10 (PP)         [+ BFF-CART-06]
  |     |     +-- CART12 (express)    [+ Checkout domain]
  |     +-- CART07 (line polish)      [+ BFF-CART-01..03]
  |     +-- CART11 (save for later)   [+ CART05; BFF-CART-09]
  |
  +-- CART05 (empty + Trade row)
  |
  +-- CART06 (reconciliation)    (needs CART03 + CART04)
  |
  +-- CART13 (analytics verify)  (needs CART02, CART03, CART04, CART08)
  +-- CART14 (quality gate)      (needs CART03..CART06)
```

## 6. Critical path

```text
CART01 -> CART02 ------------------------------------------> CART13, CART14
            \                                             /
             +-> CART03 -> CART04 -> CART06 -> CART08 --->/
                                 +-> CART05 -------------/
```

Sequencing principle: the commercially viable Beta (CART01..06 + CART08 + CART13 + CART14) is the critical path. Figma polish (CART07, CART09, CART10, CART11) layers on top in the Next phase.

## 7. Parallelisation opportunities

| Workstream                   | Can run in parallel with                      |
| ---------------------------- | --------------------------------------------- |
| CART02 (PDP ATC)             | CART03 (cart page core)                       |
| CART05 (empty state + Trade) | CART03 / CART04 (composed onto the same page) |
| CART07 / CART09 / CART10     | Each other, once their BFF Wave-2 deps land   |
| CART11 (Save for Later)      | CART09 / CART10 (independent Wave-2 features) |

## 8. Minimum viable slice

If scope pressure forces a cut, the smallest coherent release that delivers cart value end-to-end:

- **CART01** -- foundation (Done).
- **CART02** -- PDP add-to-cart.
- **CART03** -- cart page line items + quantity + remove.
- **CART04** (subset) -- pricing card + Proceed to Checkout; defer sticky-bar and express-checkout placeholder.
- **CART05** -- empty state (defer Trade row to CART05.b).
- **CART14** (axe-core CI only) -- defer manual a11y review to Beta.

Result: customer can browse, add, view, edit, remove, and proceed to checkout on the new storefront. Promo codes and reconciliation banner wait for the next slice.

## 9. Assumptions

| ID  | Assumption                                                                                                       | Impact if wrong                                            |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A1  | `Cart_v0_1` Wave-1 field set is sufficient for CART01..06                                                        | Some Beta features regress to fallbacks; roadmap unchanged |
| A2  | PDP `PurchaseActions` refactor is contained to CART02                                                            | CART02 scope grows; Shopping Experience schedule impact    |
| A3  | Legacy baselines can be captured from existing analytics                                                         | Baselines delayed; production ramp delayed                 |
| A4  | Cloudflare worker ramp steps for `/cart` can be requested inside the squad's SLA (no platform approval per ramp) | Each ramp step needs platform scheduling                   |
| A5  | Single-coupon stacking is acceptable for Wave 1                                                                  | Wave-1 promo UX rework needed when BFF-CART-07 ships       |

## 10. Risks (delivery-scoped)

Technical and architecture-scoped risks (BFF schema drift, optimistic rollback rate, mini-cart coherence, cart mutation surface growth, Trade link-target lateness) are authoritative in [`domain/cart/solution.md`](solution.md) §10.1 and not duplicated here. This register is limited to **delivery** risks: scheduling, baselines, and cross-squad coordination that can block epic completion independently of the technical design.

| ID  | Risk                                                                        | Likelihood | Impact | Mitigation                                                                                  |
| --- | --------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------- |
| R1  | Legacy baseline capture slips past Beta gate                                | Medium     | High   | Analytics DRI named; capture begins on Alpha entry; unblocks rollout, not development       |
| R2  | BFF Wave-2 uplift (`BFF-CART-01..10`) schedule slips vs cart Next phase     | Medium     | Medium | Each uplift item activates its feature independently; Wave-1 fallbacks hold in the meantime |
| R3  | `PurchaseActions` client-component conversion is larger than CART02 expects | Low        | Medium | Coordinated with Shopping Experience squad; risk reviewed at CART02 design                  |

## 11. Handoff (when domain is "complete for this cycle")

When the Now + Next phases close:

- Cloudflare worker routes 100% of AU `/cart` traffic to the new storefront, measured against legacy baselines.
- Legacy `/v/checkout/basket/show` classified deprecated with a retirement schedule.
- `CartViewModel` stable; Checkout domain builds against it.
- Full cart analytics + observability verified in production.
- All Figma frames listed in the Figma reference implemented (excluding CART15 trade-quote frames).
- Squad ownership of ongoing cart RED metrics and incident response formalised.

Next work packages (outside the cart domain):

1. **Checkout domain** -- consumes `CartViewModel`; delivers delivery, billing, payment, place-order.
2. **Personalisation (Phase 4)** -- cart-adjacent: recommendations, empty-state personalisation.
3. **Visual commerce (Phase 5)** -- cart-adjacent: 3D / AR preview integration.
4. **Trade / NZ (Phase 6)** -- cart extended, not replaced.
