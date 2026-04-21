---
type: Roadmap
domain: cart
version: '1.1'
owner: Cart & Checkout Squad
status: Reviewed
last_updated: 2026-04-21
parent_product: product/product.md
parent_roadmap: product/roadmap.md
related:
  - domain/cart/product.md
  - domain/cart/metrics.md
  - domain/cart/backlog.md
---

# Roadmap -- Cart

## 1. Roadmap intent

This roadmap sequences the cart domain's delivery against the storefront
product roadmap (`product/roadmap.md`). It is organised around **phases**, not
sprints. Each phase has a clear objective, a set of epics, quality gates, and
exit criteria that govern promotion to the next phase.

The cart sits in the storefront's **commerce flows** phase. Delivery is staged
so that each phase produces a releasable slice behind the `newCartPage` flag.
No phase ships to production until the prior phase's exit criteria hold.

## 2. Sequencing logic

1. **Foundation before features.** CART01 must land before any other epic.
2. **Prove the pipeline end-to-end early.** CART02 + CART03 prove the full
   mutation pipeline before any polish work.
3. **MVP before polish.** The commercially viable cart ships as one Beta.
   Figma polish layers on top.
4. **Upstream schema uplift runs in parallel.** Storefront ships Wave 1 with
   safe fallbacks. BFF uplifts activate features incrementally.
5. **No production migration without baselines.** `newCartPage` does not reach
   100% until legacy metrics are captured and compared.

## 3. Phases

### Phase 1 -- Alpha (Foundation + MVP shell)

**Objective:** Prove the full mutation pipeline end-to-end behind a feature
flag. Internal testers only. No production traffic.

**Epics:**

- **CART01** -- Cart Foundation and Module Scaffold. BFF cart client,
  `CartViewModel`, mapper, page shell, feature flag, API-route helper,
  error-code registry, mini-cart revalidation bridge.
- **CART02** -- PDP Add to Cart Flow. Replace stub with a working
  `addLineItem` action; wire mini-cart revalidation.
- **CART03** -- Cart Page: Line Items, Quantity, Remove. Real line items,
  optimistic quantity and remove with structural rollback.

**Quality gates:**

- CM-G01..04 meet target in Lighthouse on a seeded cart
- CM-G08 > 99% in dev
- CM-G11 = 100% across mutation origins tested
- CM-G14 axe-core passes in CI

**Exit criteria:**

- Internal testers complete PDP → cart → remove → re-add on mobile and desktop
- `newCartPage` flag ships to staging off-by-default
- No open P0 defects

**Out of scope for this phase:** Order summary beyond a stubbed total, promo
codes, postcode, Purchase Protection, Save for Later, reconciliation.

---

### Phase 2 -- Beta (Commercially viable cart)

**Objective:** Deliver a cart that can commercially replace the legacy basket
for the core flow. Enabled for internal stakeholders and external tester cohort.

**Epics (additive):** CART04, CART05, CART06, CART08, CART13, CART14

**BFF schema dependencies (Wave 2 activations):**
- BFF-CART-07 (promo stacking) → unblocks CART08 auto-applied states
- BFF-CART-08 (machine-readable error codes) → unblocks CART06 typed errors
- BFF-CART-04 (cart-level savings + free delivery) → unblocks CART04 fidelity

**Quality gates:**

- All Alpha gates hold
- Legacy baselines captured (metrics.md §4)
- CM-G01..03 meet target in RUM on staging (>= 100 sessions)
- CM-G12 < 5% in staging

**Exit criteria:**

- External testers complete browse → add → promo → checkout without stalling
- Every `CartMutationErrorCode` has been observed and its copy reviewed
- Analytics funnel maps 1:1 to the legacy funnel shape

---

### Phase 3 -- Feature-complete (Figma parity)

**Objective:** Reach Figma fidelity. Enable cart for progressively larger
internal traffic shares and targeted customer cohorts.

**Epics (additive):** CART07, CART09, CART10, CART11

**BFF schema dependencies:** BFF-CART-01..03, BFF-CART-05, BFF-CART-06,
BFF-CART-09, BFF-CART-10

**Quality gates:**

- All Beta gates hold
- CM-I05 > 90% for BFF-valid promo codes
- CM-G12 < 2%
- Design QA sign-off against Cart Redesign Figma on mobile and desktop

**Exit criteria:**

- All Figma frames implemented (excluding CART15 trade-quote frames)
- No P0 or P1 defects

---

### Phase 4 -- Migration-ready (production rollout)

**Objective:** Flip `newCartPage` to progressively larger production traffic
shares, measure against legacy baselines, mark legacy basket deprecated.

**Epics (additive):** CART12

**Activities:** Canary at 1% → 5% → 10% → 100%; A/B vs legacy; legacy deprecation.

**Quality gates:**

- All Feature-complete gates hold
- CM-01 matches or improves baseline over the A/B window
- CM-G08 > 99% on the 10% production ramp
- CM-G14 manual accessibility review complete

**Exit criteria:**

- `newCartPage` enabled for 100% of AU traffic
- Legacy basket path classified deprecated with a retirement schedule
- Squad ownership of ongoing RED metrics and incident response formalised

## 4. Milestones

| Milestone | Phase | Customer-visible? | Notes |
| --------- | ----- | ----------------- | ----- |
| Cart Alpha on staging | Phase 1 | Internal only | Flag off by default |
| Cart Beta on staging | Phase 2 | Internal + external tester cohort | Legacy baselines captured in parallel |
| Cart Feature-complete on staging | Phase 3 | Internal + employee dogfood | All BFF Wave 2 uplifts active |
| Cart Canary in production (1%) | Phase 4 | 1% of AU traffic | Guardrail-led; can abort instantly |
| Cart GA for 100% of AU traffic | Phase 4 | All AU shoppers | North star must match or improve baseline |
| Legacy basket retirement | Post-roadmap | None | Central team work; tracked separately |

## 5. Cross-domain dependencies

| Dependency | Owner squad | Gates | Current status |
| ---------- | ----------- | ----- | -------------- |
| BFF `Cart_v0_1` schema uplift (Wave 2) | BFF squad | Phase 2 / Phase 3 | Tracked in `dependencies/bff-contract-uplift.md` |
| PDP `PurchaseActions` client-component conversion | Shopping Experience | CART02 (Phase 1) | Coordinated with CART02; risk in backlog A5 |
| Checkout domain readiness | Cart & Checkout squad | CART12 (Phase 4) | Express-checkout slot disabled if delayed |
| Cloudflare Worker `/api/*` forwarding | Platform SRE | Phase 1 | Status quo; no change required |
| Analytics event schema review | Analytics | Phase 2 (CART13) | Must align before Beta |

## 6. Out of scope for this roadmap

- **CART15** -- Trade Quote flows. Requires Trade backend work and squad alignment.
- **NZ-specific cart** -- Deferred to storefront Phase 6.
- **Cart abandonment recovery emails** -- Marketing layer; not storefront.
- **Subscription / recurring carts** -- No current product demand.

## 7. Review cadence

- **Weekly** (active execution): squad-internal review of phase progress against backlog AC and CM-G* guardrails.
- **Pre-phase-gate:** squad + Product + Engineering leads review all metrics.md §5 targets. Go/no-go decision logged in this document.
- **Quarterly:** roadmap versioned; material changes require Product + Squad Lead sign-off.
