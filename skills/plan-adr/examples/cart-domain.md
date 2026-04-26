---
type: ADR Proposal List
domain: cart
status: Draft
owner: Cart & Checkout Squad
last_updated: 2026-04-21
related:
  - domain/cart/requirements.md
  - domain/cart/design.md
  - domain/cart/contracts.md
  - domain/cart/dependencies/bff-contract-uplift.md
  - domain/cart/dependencies/central-api-audit.md
  - architecture/decisions/register.md
  - architecture/solution.md
---

# Proposed ADRs -- Cart Domain

Prioritised list of Architecture Decision Records that need to be written
before (or alongside) technical design for the cart epics. Each entry
identifies a consequential decision the cart domain has surfaced but not yet
ratified. Routine choices already governed by existing ADRs (ADR-0011/0012
module + BFF-client colocation, ADR-0014 client storage, ADR-0015 client
mutation pattern, ADR-0016/0017 state-machine boundary + Zustand library) are
out of scope and not repeated here.

Once drafted, each item below should be written using `write-adr` and added
to the ADR register.

## Summary

| #   | Title                                                        | Priority   | Epic(s) impacted                     | Related existing ADRs |
| --- | ------------------------------------------------------------ | ---------- | ------------------------------------ | --------------------- |
| 1   | Cart mutation business-rule pre-validation strategy          | Blocking   | CART01, CART02, CART03, CART06       | ADR-0011, ADR-0015    |
| 2   | Cart mutation error-code taxonomy ownership and BFF contract | Blocking   | CART01, CART06; unblocks BFF-CART-08 | ADR-0015              |
| 3   | Idempotency guarantee contract for cart mutations            | Blocking   | CART01, CART02, CART03, CART08       | ADR-0015              |
| 4   | `CartViewModel` as the cross-domain cart contract            | Blocking   | CART01; consumed by Checkout domain  | ADR-0011, ADR-0012    |
| 5   | Basket merge on sign-in -- trigger and recovery strategy     | Deferrable | FR-18b follow-on (auth + cart)       | ADR-0014              |

Five ADRs total; four Blocking, one Deferrable. The list is deliberately
short — remaining design choices (optimistic reducer pattern, route-handler
transport, Zustand scope, feature-flag matrix, caching posture) are either
covered by existing ADRs or are routine implementation choices governed by
the design doc.

---

## 1. Cart mutation business-rule pre-validation strategy

**Priority:** Blocking (must resolve before CART01 foundations close)
**Epic(s):** CART01, CART02, CART03, CART06
**Related ADRs:** ADR-0011 (module architecture), ADR-0015 (client mutation pattern)

**Rationale (why consequential):** `design.md` Section 5 and `requirements.md`
FR-18a commit the storefront to enforcing legacy basket rules
(`MAX_CART_ITEMS = 250`, `PrMinOrderQty`, `PrForceQtyMultiplier`) on the
client and in the API route before dispatching to the BFF. This duplicates
rules that Central also enforces, creating two sources of truth. The
alternative — rely on the BFF / Central to reject, and let the storefront
surface only the returned error code — changes the optimistic reducer, error
copy registry, test strategy, and UX (eager disable vs. post-reject messaging)
across every mutation. Once chosen, every future domain (checkout, trade,
wishlist) will adopt the same pattern, so the decision is precedent-setting.

**Key questions the ADR must resolve:**

- Do we pre-validate in the storefront, in a shared `@tw/*` package, or rely on BFF-only enforcement?
- If we pre-validate, what is the freshness contract for rule values (min/max/step per variant)?
- Does `reduceCart` reject locally-invalid mutations or always apply optimistically and rely on server reconciliation?

---

## 2. Cart mutation error-code taxonomy ownership and BFF contract

**Priority:** Blocking (required for CART01 error registry and BFF-CART-08 to ship coherently)
**Epic(s):** CART01, CART06; upstream BFF-CART-08
**Related ADRs:** ADR-0015 (client mutation pattern)

**Rationale (why consequential):** `contracts.md` Section 4 declares
`CartMutationErrorCode` as a 20-member enum and the canonical customer-facing
error set. `dependencies/bff-contract-uplift.md` item BFF-CART-08 asks the
BFF to align its `code` field with this taxonomy on every 4xx. Alternative
approaches — HTTP-status-only mapping, BFF-owned taxonomy with storefront
translation, or a shared enum in `@daddia/bff-client-types` — each imply
different ownership, evolution rules, and failure modes when codes drift. The
choice commits the BFF squad to a typed-error contract and determines whether
the storefront or the BFF owns new codes as new mutation actions appear.

**Key questions the ADR must resolve:**

- Who owns `CartMutationErrorCode` (cart domain vs. BFF) and where does the canonical enum live?
- How is a new code introduced (additive: storefront-first, storefront-second, BFF-first)?
- What is the fallback when the BFF returns an unrecognised code?
- How is `VERSION_CONFLICT` signalled distinctly from other 409s?

---

## 3. Idempotency guarantee contract for cart mutations

**Priority:** Blocking (required before CART02 and CART03 mutations ship)
**Epic(s):** CART01, CART02, CART03, CART08
**Related ADRs:** ADR-0015 (client mutation pattern)

**Rationale (why consequential):** `requirements.md` FR-18c and
`contracts.md` Section 5 require the storefront to generate a UUID v4 per
mutation and reuse it on retry. `dependencies/central-api-audit.md` item
CENTRAL-CART-08 notes Central's idempotency support is unverified; the BFF
may or may not de-dupe. The decision space is: (a) strict — treat BFF/Central
dedupe as required and gate shipping until CENTRAL-CART-08 closes; (b)
best-effort — rely solely on UI-disable via `useTransition`; (c) hybrid —
storefront-layer deduplication with UI-disable as secondary defence. Each
option changes the retry semantics, the meaning of `NETWORK_ERROR` retries,
and how double-fires are surfaced to analytics.

**Key questions the ADR must resolve:**

- What level of guarantee does the storefront assume from the BFF/Central (strict dedupe, best-effort, none)?
- Where are in-flight idempotency keys tracked, and for how long?
- On `NETWORK_ERROR` retry, does the retry reuse the original key or generate a new one?
- How are double-fires surfaced in analytics?

---

## 4. `CartViewModel` as the cross-domain cart contract

**Priority:** Blocking (resolve before Checkout domain begins consuming cart types)
**Epic(s):** CART01; consumed by every Checkout epic reading cart state
**Related ADRs:** ADR-0011 (module architecture), ADR-0012 (colocate BFF clients with modules)

**Rationale (why consequential):** `contracts.md` Sections 3 and 9 declare
`CartViewModel` as the single contract between cart data and every consumer,
including the Checkout domain. Alternative shapes — (a) Checkout imports
`@daddia/bff-client-types` directly and does its own mapping; (b) cart + checkout
share a neutral `@daddia/cart-view-model` package; (c) cart exposes only `BffCart`
and lets each consumer map — each change where cart owns the display-level
abstractions and how easily cart can evolve its internal mapper without breaking
consumers. This is precedent-setting for every future cross-domain contract.

**Key questions the ADR must resolve:**

- Where does `CartViewModel` live (cart module, shared package, BFF types)?
- Which consumers are permitted: Checkout only, or any domain that renders cart state?
- How are additive changes coordinated, and what is the deprecation window for breaking changes?
- Are pre-formatted money strings the right boundary, or should the view model expose `Money` objects?

---

## 5. Basket merge on sign-in -- trigger and recovery strategy

**Priority:** Deferrable (FR-18b is a follow-on epic; can ride with that work package)
**Epic(s):** Follow-on auth + cart merge work package
**Related ADRs:** ADR-0014 (client-side storage strategy)

**Rationale (why consequential):** `design.md` Section 4 describes a flow
that relies on (a) Central's session `pre_action` running
`spMergeCustomerBaskets` automatically on the next `GET /carts` after auth,
and (b) an anonymous-basket snapshot in `sessionStorage` (5-minute TTL,
SKUs/variants/quantities only, no PII) that powers the "Restore items"
affordance when merge fails. `dependencies/central-api-audit.md` item
CENTRAL-CART-09 flags the merge trigger as unverified. Alternatives change
how the cart handles a common auth state transition and interact with
ADR-0014 (acceptable client-side storage).

**Key questions the ADR must resolve:**

- Is merge triggered implicitly (via the next `GET /carts` after auth) or explicitly (storefront calls an endpoint)?
- What is the fallback when merge fails: client-held snapshot, server-held anonymous cart retrieval, or no recovery?
- What is the TTL / payload shape / PII policy for the anonymous-basket snapshot?
- How is idempotency guaranteed if the customer signs in multiple times?

---

## Deliberately not proposed

The following candidate decisions surfaced during analysis and were rejected
as either routine or already covered by existing ADRs:

- **Cart mutation transport (API routes vs. server actions):** Resolved by ADR-0015.
- **State management for cart (no XState, narrow Zustand):** Resolved by ADR-0016 + ADR-0017, applied in `design.md` Section 2.13.
- **Module directory layout and public surface:** Governed by ADR-0011.
- **Server-only boundary for queries / clients / mappers:** Covered by ADR-0011 + ESLint rule.
- **`no-store` + `CART_TAG` caching posture:** Baked into `lib/security/config.ts` and `design.md` Section 2.11; not a new architectural decision.
- **Optimistic UI reducer pattern:** Implementation of ADR-0015; candidate for `architecture/patterns/client-mutations.md` once a second domain adopts it, not a new ADR.
- **Feature-flag defaults and rollout staging:** Documented in `design.md` Section 6 and `roadmap.md`.
- **Analytics event taxonomy:** Product / Analytics contract, not an architecture decision.
- **Copy ownership / error-message registry location:** Product / Engineering split, governed in-module.

## Next steps

1. Cart & Checkout squad reviews and scores this list (keep / cut / merge)
2. For each accepted item, assign an `ADR-####` from the next free number in the register and an owner
3. Draft each ADR using `write-adr`, starting with Blocking items (1–4)
4. Update the ADR register when each ADR reaches `Proposed`
