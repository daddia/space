---
type: Metrics
domain: cart
version: '1.1'
owner: Cart & Checkout Squad
status: Reviewed
last_updated: 2026-04-21
parent_product: product/product.md
related:
  - domain/cart/product.md
  - domain/cart/roadmap.md
  - domain/cart/requirements.md
---

# Metrics -- Cart

This document defines the metrics that govern the cart domain. Phase-level
targets in `roadmap.md` refer back to this document; epic-level AC in
`backlog.md` and `work/**/requirements.md` reference individual metric IDs.

## 1. North-star metric

| ID    | Metric                     | Definition                                                                                                      | Baseline                            | Target                     | Measurement source                                              |
| ----- | -------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------- | --------------------------------------------------------------- |
| CM-01 | Cart-to-checkout step rate | Of all sessions reaching `/cart` with ≥ 1 line item, the share that also reach `/checkout` in the same session. | **TBD** -- legacy baseline required | Match or improve vs legacy | Analytics: `view_cart` → `begin_checkout` within session funnel |

This is the **handoff rate** between cart and checkout, not a purchase
conversion rate (the Checkout domain owns purchase conversion). It isolates
cart behaviour from downstream payment flows.

## 2. Input metrics

| ID     | Metric                      | Definition                                              | Target                  | Source                                     |
| ------ | --------------------------- | ------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| CM-I01 | Add-to-cart rate (session)  | Sessions with ≥ 1 `add_to_cart` event / total sessions  | Match or improve legacy | Analytics                                  |
| CM-I02 | Add-to-cart rate (PDP view) | `add_to_cart` / `view_item` events                      | Match or improve legacy | Analytics                                  |
| CM-I03 | Cart size at view           | Average line items when customer reaches `/cart`        | Match or improve legacy | `view_cart` event payload                  |
| CM-I04 | Cart AOV at view            | Average basket total (AUD, GST-inc) at `/cart` view     | Match or improve legacy | `view_cart` event payload                  |
| CM-I05 | Promo apply success rate    | `coupon_applied` / (`coupon_applied` + `coupon_failed`) | > 90%                   | Server + analytics                         |
| CM-I06 | Free-delivery attainment    | Share of carts crossing free-delivery threshold         | Match or improve legacy | Analytics (threshold state on `view_cart`) |

## 3. Guardrail metrics

### Performance

| ID     | Metric                           | Definition                                | Target       | Source              |
| ------ | -------------------------------- | ----------------------------------------- | ------------ | ------------------- |
| CM-G01 | Cart page LCP p75 (mobile)       | Largest contentful paint at p75 on mobile | **< 2.5s**   | RUM / Lighthouse    |
| CM-G02 | Cart page INP p75 (mobile)       | Interaction to next paint at p75          | **< 200ms**  | RUM                 |
| CM-G03 | Cart page CLS p75 (mobile)       | Cumulative layout shift at p75            | **< 0.1**    | RUM                 |
| CM-G04 | Cart page JS bundle (gzipped)    | Client-side JS shipped with `/cart`       | **< 40KB**   | CI bundle analyser  |
| CM-G05 | Mutation perceived latency (p75) | User gesture to UI confirmation           | **< 500ms**  | RUM custom timing   |
| CM-G06 | Mutation server round-trip (p75) | API route entry to BFF response           | **< 800ms**  | Distributed tracing |
| CM-G07 | Mutation server round-trip (p95) | As above at p95                           | **< 1500ms** | Distributed tracing |

### Reliability

| ID     | Metric                               | Definition                                                               | Target     | Source                 |
| ------ | ------------------------------------ | ------------------------------------------------------------------------ | ---------- | ---------------------- |
| CM-G08 | Add-to-cart success rate             | Successful `addLineItem` / total invocations                             | **> 99%**  | Server metrics         |
| CM-G09 | Mutation error rate (5xx)            | 5xx / total cart mutation invocations                                    | **< 0.5%** | API route logs         |
| CM-G10 | Mutation error rate (4xx non-domain) | Non-domain 4xx / total                                                   | **< 0.1%** | API route logs         |
| CM-G11 | Mini-cart coherence after mutation   | Mutations after which mini-cart reflects canonical state within 1 render | **100%**   | Integration test + RUM |
| CM-G12 | Optimistic rollback rate             | Optimistic mutations that roll back                                      | **< 2%**   | Client telemetry       |

### Experience

| ID     | Metric                      | Definition                                                  | Target                  | Source             |
| ------ | --------------------------- | ----------------------------------------------------------- | ----------------------- | ------------------ |
| CM-G13 | Cart abandonment rate       | `view_cart` sessions without `begin_checkout`               | Match or improve legacy | Analytics funnel   |
| CM-G14 | Accessibility (WCAG 2.1 AA) | axe-core automated + manual keyboard/screen-reader          | **Pass**                | CI axe-core + QA   |
| CM-G15 | Error UX completeness       | Every `CartMutationErrorCode` has an observed customer path | **100%**                | QA + fixture tests |

## 4. Baselines

| Metric     | Capture method                                                      | Owner               | Due              | Status      |
| ---------- | ------------------------------------------------------------------- | ------------------- | ---------------- | ----------- |
| CM-01      | Analytics funnel on legacy basket → checkout, last 90 days, AU only | Product + Analytics | Before Beta gate | Not started |
| CM-I01     | `add_to_cart` events / sessions on legacy surfaces, last 90 days    | Analytics           | Before Beta gate | Not started |
| CM-I05     | Legacy `apply_promotion` success rate                               | Analytics           | Before Beta gate | Not started |
| CM-G13     | Legacy cart abandonment rate (AU, last 90 days)                     | Analytics           | Before Beta gate | Not started |
| CM-G01..03 | Legacy basket Core Web Vitals baseline (mobile p75, last 28 days)   | Performance         | Before Beta gate | Not started |

## 5. Targets by phase

### Alpha (internal + dev flag)

- CM-G01..04 meet target in Lighthouse on a seeded cart
- CM-G08 > 99% in dev
- CM-G11 = 100% across all tested mutation origins
- CM-G14 axe-core passes in CI

### Beta (staging)

- All Alpha targets hold
- CM-G01..03 meet target in RUM on staging (n >= 100 sessions)
- CM-G05..07 meet target in staging RUM + tracing
- CM-G12 < 5% in staging
- Legacy baselines (Section 4) captured and signed off

### Feature-complete (staging, Figma parity)

- All Beta targets hold
- CM-I05 > 90% for BFF-valid promo codes
- CM-G12 < 2%

### Migration-ready (production)

- All prior targets hold
- CM-01 matches or improves baseline over A/B window
- CM-G08 > 99% on 10% production ramp
- CM-G14 manual accessibility review complete

## 6. Measurement sources

| Layer              | Tool / system               | Notes                                                                     |
| ------------------ | --------------------------- | ------------------------------------------------------------------------- |
| Client analytics   | `@/lib/analytics` `track()` | Typed payloads; schema owned by Cart                                      |
| Client performance | RUM                         | Core Web Vitals, `cart_mutation_perceived` custom timing                  |
| Server traces      | `@tw/observability`         | Span per cart mutation: API route → `bffClient` → BFF; correlation ID     |
| Server logs        | `@tw/logging`               | Cart ID hashed, no PII                                                    |
| RED metrics        | Service metrics             | Rate / Errors / Duration per action (`addLineItem`, ...)                  |
| Funnel analytics   | Analytics platform          | `view_item` → `add_to_cart` → `view_cart` → `begin_checkout` → `purchase` |
| Bundle size        | CI bundle analyser          | Per-route budget enforced on PR                                           |
| Accessibility      | axe-core in CI + manual QA  | Runs from CART03 onwards                                                  |

## 7. Instrumentation status

| Source                       | Status                                 | Gap to close                                          | Tracked in                        |
| ---------------------------- | -------------------------------------- | ----------------------------------------------------- | --------------------------------- |
| Client analytics (`track()`) | Library present; events undefined      | Define + fire cart events                             | CART02 / CART03 / CART04 / CART08 |
| RUM (Core Web Vitals)        | Present on other routes                | Verify for `/cart`; enable custom timings             | CART01 + CART14                   |
| Distributed tracing          | Present                                | Add per-mutation spans with idempotency + correlation | CART01-05                         |
| RED metrics per action       | Not present                            | Emit per-action Rate/Errors/Duration                  | CART13                            |
| Funnel analytics             | Legacy path instrumented; new path not | Mirror legacy funnel                                  | CART13                            |
| axe-core in CI               | Present                                | Scope to cart routes from CART03                      | CART14                            |

## 8. Review cadence and ownership

| Cadence              | Audience                       | Metrics reviewed               | Action                                 |
| -------------------- | ------------------------------ | ------------------------------ | -------------------------------------- |
| Daily (Alpha/Beta)   | Squad standup                  | CM-G08, CM-G09, CM-G11, CM-G12 | Block release on breach                |
| Weekly               | Squad + Platform               | All CM-G\*                     | Trend review; raise follow-up stories  |
| Pre-phase-gate       | Squad + Product + Engineering  | All CM-01, CM-I*, CM-G*        | Go/no-go vs `roadmap.md` exit criteria |
| Ongoing (production) | Cart & Checkout + Platform SRE | All, via dashboards + alerts   | Page on CM-G08/G09 breach              |

### Ownership

- **Squad DRI:** Cart & Checkout squad lead
- **Analytics DRI:** Analytics squad, event schema and funnel modelling
- **Performance DRI:** Performance squad, CM-G01..G07 baselines and CI budgets
- **Accessibility DRI:** Platform Accessibility owner, CM-G14 review
