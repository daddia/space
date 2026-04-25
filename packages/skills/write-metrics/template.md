---
type: Metrics
domain: <!-- domain name -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
parent_product: product/product.md
related:
  - domain/{domain}/product.md
  - domain/{domain}/roadmap.md
  - domain/{domain}/requirements.md
  - domain/{domain}/design.md
  - domain/{domain}/contracts.md
  - domain/{domain}/backlog.md
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in metrics.md:
  - Target values without a baseline                   → baselines must be measured before targets are set
  - Business rationale for a metric                    → product.md §7
  - Implementation detail (how events are fired)       → solution.md §7.2 or contracts.md §5
  - Operational SLO alert thresholds                   → these are engineering config, not a metrics doc
Metrics.md owns: north-star definition, input metrics, guardrail definitions, measurement sources, and review cadence.
-->

# Metrics -- {Domain}

This document defines the metrics that govern the {domain} domain: the north
star, the inputs that drive it, the guardrails that must not regress, and the
instrumentation that produces the signal. Phase-level targets in `roadmap.md`
refer back to this document.

## 1. North-star metric

The {domain} has one north-star metric. Everything else exists to move it.

| ID     | Metric               | Definition                            | Baseline                            | Target                         | Measurement source                        |
| ------ | -------------------- | ------------------------------------- | ----------------------------------- | ------------------------------ | ----------------------------------------- |
| {D}-01 | <!-- metric name --> | <!-- precise definition as a rate --> | **TBD** -- legacy baseline required | **Match or improve** vs legacy | <!-- analytics / RUM / server metrics --> |

<!-- Explain why this metric, and what it does NOT capture (to avoid confusion
with adjacent metrics owned by other domains). -->

## 2. Input metrics

Input metrics describe what drives the north star.

| ID      | Metric        | Definition          | Target                  | Source          |
| ------- | ------------- | ------------------- | ----------------------- | --------------- |
| {D}-I01 | <!-- name --> | <!-- definition --> | Match or improve legacy | <!-- source --> |
| {D}-I02 |               |                     |                         |                 |
| {D}-I03 |               |                     |                         |                 |

## 3. Guardrail metrics

Guardrails must **not** regress. A guardrail breach is a release blocker.

### Performance

| ID      | Metric                           | Definition                                 | Target      | Source              |
| ------- | -------------------------------- | ------------------------------------------ | ----------- | ------------------- |
| {D}-G01 | LCP p75 (mobile)                 | Largest contentful paint at p75 on mobile  | **< 2.5s**  | RUM / Lighthouse    |
| {D}-G02 | INP p75 (mobile)                 | Interaction to next paint at p75 on mobile | **< 200ms** | RUM                 |
| {D}-G03 | CLS p75 (mobile)                 | Cumulative layout shift at p75 on mobile   | **< 0.1**   | RUM                 |
| {D}-G04 | JS bundle (gzipped)              | Client-side JS shipped with this route     | **< 40KB**  | CI bundle analyser  |
| {D}-G05 | Mutation perceived latency (p75) | Time from user gesture to UI confirmation  | **< 500ms** | RUM custom timing   |
| {D}-G06 | Mutation server round-trip (p75) | API route entry to BFF response            | **< 800ms** | Distributed tracing |

### Reliability

| ID      | Metric                               | Definition                       | Target     | Source         |
| ------- | ------------------------------------ | -------------------------------- | ---------- | -------------- |
| {D}-G07 | <!-- primary success rate -->        | <!-- definition -->              | **> 99%**  | Server metrics |
| {D}-G08 | Mutation error rate (5xx)            | 5xx / total mutation invocations | **< 0.5%** | API route logs |
| {D}-G09 | Mutation error rate (4xx non-domain) | Non-domain 4xx / total           | **< 0.1%** | API route logs |

### Experience

| ID      | Metric                      | Definition                                                          | Target                  | Source           |
| ------- | --------------------------- | ------------------------------------------------------------------- | ----------------------- | ---------------- |
| {D}-G10 | Abandonment rate            | Sessions reaching this surface that do not proceed to the next step | Match or improve legacy | Analytics funnel |
| {D}-G11 | Accessibility (WCAG 2.1 AA) | axe-core automated + manual keyboard / screen-reader review         | **Pass**                | CI axe-core + QA |
| {D}-G12 | Error UX completeness       | Every error code has an observed customer-facing path               | **100%**                | QA review        |

## 4. Baselines

Legacy baselines are required before any migration decision. Development can
start without them, but they must be captured before production ramp-up.

| Metric  | Capture method           | Owner          | Due              | Status      |
| ------- | ------------------------ | -------------- | ---------------- | ----------- |
| {D}-01  | <!-- analytics query --> | <!-- squad --> | Before Beta gate | Not started |
| {D}-I01 |                          |                |                  |             |
| {D}-G10 |                          |                |                  |             |

## 5. Targets by phase

Phase targets compound. An earlier-phase metric continues to apply in later
phases unless explicitly raised.

### Alpha (internal + dev flag)

- {D}-G01..04 meet target in a lab (Lighthouse) run on seeded data
- Core mutation success rate > 99% in dev

### Beta (staging, internal stakeholders)

- All Alpha targets hold
- {D}-G01..03 meet target in RUM on staging (n >= 100 sessions)
- Legacy baselines (Section 4) captured and signed off

### Feature-complete (staging, full Figma fidelity)

- All Beta targets hold
- Input metrics measured; targets agreed by Product

### Migration-ready (production)

- All prior targets hold
- {D}-01 target evaluated vs baseline
- {D}-G11 manual accessibility review complete

## 6. Measurement sources

| Layer                   | Tool / system                               | Notes                                            |
| ----------------------- | ------------------------------------------- | ------------------------------------------------ |
| Client analytics events | `@/lib/analytics` `track()`                 | Typed payloads; schema owned by this domain      |
| Client performance      | RUM                                         | Core Web Vitals, custom timings                  |
| Server traces           | Distributed tracing via `@tw/observability` | Span per mutation: API route → `bffClient` → BFF |
| Server logs             | `@tw/logging`                               | Correlation ID, hashed identifiers, no PII       |
| RED metrics             | Service metrics                             | Rate / Errors / Duration per mutation action     |
| Funnel analytics        | Analytics platform                          | Full conversion funnel                           |
| Bundle size             | CI bundle analyser                          | Per-route JS budget enforced on PR               |
| Accessibility           | axe-core in CI + manual QA                  | Runs from first UI epic onwards                  |

## 7. Instrumentation status

| Source              | Status                            | Gap to close                         | Tracked in       |
| ------------------- | --------------------------------- | ------------------------------------ | ---------------- |
| Client analytics    | Library present; events undefined | Define + fire domain events          | <!-- EPIC-ID --> |
| RUM                 | Present on other routes           | Verify reporting for this route      | <!-- EPIC-ID --> |
| Distributed tracing | Present                           | Add per-mutation spans               | <!-- EPIC-ID --> |
| RED metrics         | Not present                       | Emit per-action Rate/Errors/Duration | <!-- EPIC-ID --> |
| axe-core in CI      | Present                           | Scope to this domain's routes        | <!-- EPIC-ID --> |

## 8. Review cadence and ownership

| Cadence              | Audience                      | Metrics reviewed        | Action                                  |
| -------------------- | ----------------------------- | ----------------------- | --------------------------------------- |
| Daily (Alpha/Beta)   | Squad standup                 | Key reliability metrics | Block release on breach                 |
| Weekly               | Squad + Platform              | All guardrails          | Raise follow-up stories for degradation |
| Pre-phase-gate       | Squad + Product + Engineering | All metrics             | Go/no-go against roadmap exit criteria  |
| Ongoing (production) | Squad + Platform SRE          | All, via dashboards     | Alert on primary success rate breach    |

### Ownership

- **Squad DRI:** <!-- squad lead -->
- **Analytics DRI:** Analytics squad, event schema and funnel modelling
- **Performance DRI:** Performance squad, CM-G01..G06 baselines and CI budgets
- **Accessibility DRI:** Platform Accessibility owner, CM-G11 review
