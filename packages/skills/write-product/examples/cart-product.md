---
type: Product
domain: cart
stage: product
version: "2.0"
owner: Cart & Checkout Squad
status: Draft
last_updated: 2026-04-23
parent_product: product/product.md
related:
  - domain/cart/solution.md
  - domain/cart/roadmap.md
  - domain/cart/backlog.md
---

# Product -- Cart

## 1. Problem

The cart is the bridge between browsing and buying. It is where a customer commits to a purchase intent: reviewing what they selected, adjusting quantities, applying promotions, and deciding to proceed to checkout. Today the new storefront cannot complete that journey.

Concretely:

- **No end-to-end transaction path.** A customer on the new storefront cannot add a product from a PDP, review their cart, and proceed to checkout. Every attempt stalls somewhere between the PDP and the cart page.
- **The cart page is a placeholder.** It renders static content and a hardcoded `$0.00` total. No line items, no quantity controls, no promotions, no checkout call-to-action.
- **Add-to-cart on the PDP does nothing.** The button is present but inert -- clicks are silently discarded.
- **Cart state is incoherent across surfaces.** Changes made on one surface (PDP, cart page, mini-cart popover) do not propagate to the others.
- **Cart abandonment cannot be measured.** With no functional cart, there is no baseline for add-to-cart rate, cart-to-checkout step rate, or abandonment -- and therefore no signal for the experimentation, personalisation, and visual-commerce work that depends on cart behaviour.

The legacy basket remains in production but cannot be meaningfully improved: it is a large monolith with decades of accumulated logic, irrelevant multi-brand abstractions, and four parallel rendering paths. Replacing it is the only path forward.

## 2. Appetite

**Four phases across one product cycle.** Now (Alpha + Beta: functional cart reaches staging with external testers) and Next (Feature-complete + Migration-ready: Figma fidelity and production ramp to 100% of AU traffic) are in this cycle's bet. Later-phase extensions (trade, NZ, subscription) are explicitly deferred to future cycles. Phase sequencing and exit criteria are in [`domain/cart/roadmap.md`](roadmap.md).

We are not willing to ship a bigger cart than the redesign calls for in this cycle. Personalisation, visual commerce, trade pricing, and NZ-market variants are deferred to later storefront phases.

## 3. Sketch

The redesigned cart delivers, end-to-end:

- A working add-to-cart on the PDP.
- A single coherent mini-cart popover that reflects the latest cart state after any mutation, regardless of origin.
- A redesigned `/cart` page with real line items, quantity control, promotions, savings clarity, free-delivery threshold progress, a trust-signals band, and a mobile-first sticky checkout call-to-action.
- An empty state (signed-in and anonymous) with a Trade Program row.
- A reconciliation story for stock and price changes between sessions.

The Cart Redesign Figma is the visual reference. The cart exists behind a feature flag until it is measurably as good or better than the legacy basket on cart-to-checkout step rate.

## 4. Rabbit holes

Risks the cart will deliberately stay out of:

- **Owning checkout.** Delivery, billing, payment, place-order are owned by the Checkout domain. The cart hands off cleanly and stops.
- **Modelling cart state client-side.** The cart that ships to the customer is the one the server says is authoritative. Where the UI needs short-lived coordination (modals, undo queue), it uses narrow local state; the _cart itself_ is not modelled client-side.
- **Parallel integration with backends.** The cart reads and writes exclusively through the storefront's existing backend-for-frontend integration. No second backend boundary, no direct calls to inventory or pricing services.
- **Analytics for its own sake.** The events we fire are the ones that feed the north-star metric (cart-to-checkout step rate) and the handful of inputs that move it. Everything else is deferred.

## 5. No-gos

Explicit out-of-scope for this product cycle:

- Checkout flow (delivery, billing, payment, place-order).
- Cart-level cross-sell powered by personalisation -- Phase 4.
- Visual commerce (3D previews, room scenes) in the cart -- Phase 5.
- Trade / commercial pricing, pro-pricing, project organisation -- Phase 6.
- NZ-specific cart (currency, tax, delivery) -- Phase 6.
- Subscription / recurring-purchase carts.
- Multiple delivery addresses / split shipments initiated from the cart.
- Cart abandonment recovery email integration (owned by marketing, not storefront).
- Trade-quote flows (`Item within Quote`, `Quote expired`) -- deferred to a CART15 follow-up epic.
- Real-time multi-tab cart sync beyond what server reload provides.

## 6. Target users

### Primary

- **Anonymous shopper on mobile.** Largest segment by session volume. Arrives via category browse or product search. Mobile ergonomics, sticky bottom call-to-action, and fast cart-page load define this segment's acceptance.
- **Anonymous shopper on desktop.** Higher basket total. Sticky right-column order summary; free-delivery threshold progress is the primary driver of add-to-cart behaviour.
- **Authenticated shopper.** Cross-device persistence expectations, stored gift cards and store credit, faster path through checkout. Basket merge on sign-in must preserve quantities.

### Secondary

- **Authenticated trade customer.** Recognised by a Trade Program segment. Full trade-quote flow is deferred to a follow-up epic; this cycle delivers the Trade Program row only.

### Out of scope for this product cycle

- Subscription / recurring-purchase customers.
- NZ market customers (Phase 6).
- Customers transacting in currencies other than AUD.

## 7. Outcome metrics

Product-level outcomes only. Numeric thresholds, instrumentation, and baselines live downstream:

- Operational quality goals (Core Web Vitals, mutation latency, error rates) -- [`domain/cart/solution.md`](solution.md) §2.1.
- Measurement IDs, legacy baselines, phase targets, and review cadence -- [`domain/cart/metrics.md`](metrics.md).

| Outcome                                                  | Target                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| Cart-to-checkout step rate (north star)                  | Match or improve vs legacy baseline                          |
| Customers can always add to cart successfully            | Meet the reliability bar defined in `solution.md` §2.1       |
| Cart page loads fast enough that customers do not bounce | Meet the Core Web Vitals bar defined in `solution.md` §2.1   |
| Cart mutations feel instantaneous                        | Meet the perceived-latency bar defined in `solution.md` §2.1 |
| Cart abandonment does not regress                        | Match or improve vs legacy baseline                          |
| Cart is usable for every customer                        | Pass the WCAG 2.1 AA bar defined in `solution.md` §2.1       |

Success indicators, not metric targets:

- A customer can complete the full browse-to-checkout journey on the new storefront for 100% of AU traffic, against real production data, on mobile and desktop.
- The `CartViewModel` contract (see [`domain/cart/solution.md`](solution.md)) is stable enough for the Checkout domain to build against without contract churn.
- Every cart mutation fires with typed analytics payloads and observable traces; dashboards show cart RED metrics and the abandonment funnel.

## 8. Product principles

Commercial / product-level principles. Technical principles live in [`domain/cart/solution.md`](solution.md).

1. **Server-owned state.** The cart a customer sees is what the server says it is. The UI reflects that truth rather than modelling its own.
2. **Invisible to decisions that belong elsewhere.** The cart does not replicate checkout, shipping, payment, or fulfilment decisions. It hands off cleanly.
3. **Honest where it matters, fast where it can be.** Line-level edits feel instant and roll back cleanly if the server rejects them. Cart-level changes that affect pricing or availability (promo application, postcode change, Purchase Protection) wait for the server -- a customer never sees a false price.
4. **Figma fidelity is the visual acceptance bar.** The redesigned cart is the benchmark. Parity with the legacy basket is the minimum; the redesign is the target.
5. **Legacy parity on commercial rules, not on surface.** Quantity limits, minimum order quantity, forced quantity multipliers, and GST-inclusive pricing carry over from the legacy basket. Everything else is redesigned.

## 9. Stakeholders and RACI

| Stakeholder                  | Responsibility                                                     | R/A/C/I |
| ---------------------------- | ------------------------------------------------------------------ | ------- |
| Cart & Checkout squad        | Owns the cart domain end-to-end; also owns the Checkout domain     | R, A    |
| Shopping Experience squad    | Owns the PDP; consumes the cart's add-to-cart contract             | C       |
| BFF squad                    | Owns the backend-for-frontend contract the cart depends on         | C       |
| Analytics squad              | Owns the cart event schema; runs the funnel baseline measurement   | C       |
| Design (Cart Redesign Figma) | Owns the visual and interaction design                             | R       |
| Product (Cart)               | Owns scope, phase gate decisions, copy, rollout strategy           | R, A    |
| Performance squad            | Owns Core Web Vitals budgets for the cart route                    | C       |
| Accessibility owner          | Owns the WCAG 2.1 AA acceptance bar                                | C       |
| Trade team                   | Owns the Trade Program landing page; cart consumes its link target | I       |
| Central / Platform SRE       | Owns request routing (Cloudflare worker) and backend availability  | I       |

## 10. Relationship to the storefront

The storefront product sequences as: foundation -> core shopping -> **commerce flows** -> personalisation -> visual commerce -> trade / NZ. The cart sits at **commerce flows** and is the prerequisite for everything downstream:

- **Personalisation (Phase 4)** depends on cart behaviour signals (add-to-cart, abandonment, time-in-cart) being instrumented.
- **Visual commerce (Phase 5)** depends on a cart surface capable of receiving 3D and AR-originated add-to-cart events through the same pattern established here.
- **Trade and NZ expansion (Phase 6)** extends the cart rather than building a parallel one.

The cart is not a standalone product. It is a squad-owned sub-product within the storefront, governed against the storefront's north-star metric (conversion rate) and operating under the storefront's architecture principles. Implementation follows the BFF-first integration pattern documented in the platform solution.
