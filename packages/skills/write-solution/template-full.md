---
type: Solution
domain: <!-- domain name, or omit for platform -->
stage: full
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
parent_product: <!-- domain/{d}/product.md or docs/product.md -->
related:
  - <!-- domain/{d}/product.md -->
  - <!-- domain/{d}/roadmap.md -->
  - <!-- domain/{d}/backlog.md -->
  - <!-- domain/{d}/contracts.md -->
  - <!-- domain/{d}/metrics.md -->
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in solution.md:
  - Commercial rationale or business case       → product.md
  - Target customer segments or personas        → product.md
  - Strategic thesis or product principles      → product.md
  - Positioning or messaging                    → product.md
  - User quotes                                 → product.md
  - Story-level acceptance criteria             → work/{wp}/backlog.md
  - Phase sequencing or epic ordering           → roadmap.md
-->

# Solution -- {Domain}

{Domain} solution design. Captures the architecture, cross-cutting concepts,
data contracts, and key decisions that apply to every work package in this
domain. Work-package designs (`work/{d}/<wp>/design.md`) reference this
document rather than redefining its patterns.

For the product context, problem, users, and commercial scope see
[`product.md`](product.md).

## 1. Context and scope

### 1.1 System context

<!-- C4 Level 1 — text diagram.

```text
[Customer Browser]
 |
 +-- [{Surface A}]  -- {Component} ({epic-id})
 |                    |
 |                    +-- POST /api/{action}  (Next.js route)
 |                          -> {client} action {actionName}
 |
 +-- [{Surface B}]

{External layer}

  {VERB} /{resource}  -> {ResponseType}
  {VERB} /{resource}/{id}  -> {RequestType} -> {ResponseType}
```
-->

### 1.2 System boundary

**{Domain} owns:**

- <!-- list of surfaces, contracts, and APIs this domain produces -->

**{Domain} does not own** (for the full list of deferred customer-facing
capabilities see [`product.md`](product.md) §5):

- <!-- technical boundary only: upstream schemas, adjacent domains, other teams -->

### 1.3 Upstream and downstream systems

- **Upstream — {provider}** ({squad}). Provides {endpoints}. Schema evolution tracked in [`dependencies/{name}.md`](dependencies/).
- **Downstream — {consumer}**. Consumes {contract}. The {domain} publishes; {consumer} refines.
- **Adjacent — {system}**. {Brief relationship}.

## 2. Quality goals and constraints

### 2.1 Quality goals (top 5)

Ordered; the top goal dominates when goals conflict.

1. <!-- Most important NFR -->
2. <!-- Second most important NFR -->
3. <!-- Third -->
4. <!-- Fourth -->
5. <!-- Fifth -->

Full metric tree with IDs, baselines, phase targets, and instrumentation lives
in [`metrics.md`](metrics.md).

### 2.2 Constraints

- **Technical:** <!-- stack, integration approach, generated-type source, UI library -->
- **Legacy parity:** <!-- inherited rules — canonical list and rationale in §6.3 -->
- **Regulatory:** <!-- WCAG, PII, compliance -->
- **Organisational:** <!-- squad count, cross-squad deps — tracked in roadmap.md -->

## 3. Solution strategy

<!-- 4–6 named principles, each with consequences. State what this domain
will NOT do as explicitly as what it will do.

### 3.1 {Principle name}

{One paragraph explaining the principle and its trade-offs.}

Consequences:

- {Concrete effect on design decisions}
- {Concrete effect on design decisions}

...

### 3.N How the strategy satisfies the quality goals

| Quality goal | Strategy choices that satisfy it |
| ------------ | -------------------------------- |
| {NFR 1}      | §3.1, §3.2                       |
-->

## 4. Building block view

### 4.1 Level 1 -- domain placement

<!-- Directory structure showing where this domain lives in the codebase -->

```text
{app-root}/src/
  {route-group}/
    {surface}/
  api/{domain}/
  modules/{domain}/
  lib/
    {shared-library}/
```

### 4.2 Level 2 -- the {domain} module

<!-- Detailed module directory layout with inline comments -->

```text
modules/{domain}/
  data/
    clients/
      {bff-client}.ts     {what it does}
    queries/
      {query}.ts          {what it does}
    mappers/
      {mapper}.ts         {what it does}
    schemas/
      {schema}.ts         {what it does}
  logic/
    types.ts              {what it exports}
    errors.ts             {what it does}
  ui/
    {surface}/
    hooks/
      {hook}.ts           {what it does}
    stores/
      {store}.ts          {what it does — Zustand, if applicable}
  index.ts                server barrel
  client.ts               client barrel
```

### 4.3 Level 3 -- {key cross-cutting helper}

<!-- Code signature of any shared helper every WP will reuse -->

```typescript
// Simplified signature
{interface or function signature}
```

## 5. Runtime view

<!-- 2–5 key sequences as text flows. Focus on the scenarios debugged at 3am. -->

### 5.1 {Key flow 1}

```text
{Actor} {action}
  -> {Component}
     {step}
     -> {call}
        -> {result}
  -> {outcome}
```

### 5.2 {Key flow 2}

<!-- ... -->

## 6. Data model and ubiquitous language

### 6.1 Glossary

<!-- One line per term. Authoritative names used in code, docs, and conversation. -->

- **{Term}** -- {definition}

### 6.2 Types and schemas

Canonical definitions live in [`contracts.md`](contracts.md):

- Section 1: {what lives here}
- Section 2: {what lives here}

### 6.3 Legacy business rules (if applicable)

Enforced in this domain. Rationale in `research/legacy-analysis.md`; values
live as named constants in `modules/{d}/logic/constants.ts`:

- `{CONSTANT} = {value}`. Exceeding returns `{ERROR_CODE}`.

## 7. Cross-cutting concepts

### 7.1 Error taxonomy

<!-- Closed enum of error codes + per-code UX treatment table -->

| Code     | Customer-facing treatment                     |
| -------- | --------------------------------------------- |
| `{CODE}` | {What the user sees and what the system does} |

Copy lives in `modules/{d}/logic/error-messages.ts`.

### 7.2 Observability

<!-- Trace spans, RED metrics, RUM timings, structured log fields, funnel events -->

### 7.3 Security

<!-- PII policy, auth pattern, CSRF approach, rate limiting surface -->

### 7.4 Rollout control

<!-- How production traffic is progressively routed to this domain's surfaces.
Flag-based or worker-routing-based; per-environment defaults are in code. -->

### 7.5 Cache and routing

<!-- Cache-Control directives, route group isolation, cache tags -->

### 7.6 Accessibility

<!-- WCAG bar, axe-core CI hook, keyboard + screen-reader review gate -->

### 7.7 Testing strategy

| Layer          | Scope   | Target                |
| -------------- | ------- | --------------------- |
| Unit (Vitest)  | {scope} | {coverage target}     |
| Integration    | {scope} | {happy + error paths} |
| Contract tests | {scope} | Blocks CI             |
| axe-core (CI)  | {scope} | Pass on every PR      |

## 8. Deployment and environments

- **Build:** {build tool and command}
- **Routing:** {how traffic reaches this domain}
- **Rollout:** {progressive ramp pattern; link to roadmap}
- **Observability:** {tracing backend, metrics dashboard, RUM provider}

## 9. Architectural decisions (ADR log)

<!-- List ratified ADRs that govern this domain.
     For unwritten candidates mark with _(Not yet written)_ -->

Referenced platform ADRs:

- **ADR-{NNNN} -- {Title}.** {One-sentence summary; what it governs for this domain.}

Candidate domain-specific ADRs — not yet written:

- **ADR-{D}-{01} -- {Title}.** _(Not yet written.)_ {What decision needs to be ratified and why.}

## 10. Risks, technical debt, and open questions

### 10.1 Risks

| ID  | Risk   | Likelihood        | Impact            | Mitigation   |
| --- | ------ | ----------------- | ----------------- | ------------ |
| R1  | {risk} | {Low/Medium/High} | {Low/Medium/High} | {mitigation} |

### 10.2 Technical debt

- **{Item}.** {Description and how/when it closes.}

### 10.3 Open questions

1. **{Question}.** {Context; owner; how it blocks.}

## 11. Graduation candidates

Several patterns in this design are generic across domains. When a second
domain adopts the same pattern, lift it to `architecture/patterns/` and replace
the local section here with a pointer. Do not lift speculatively.

| Pattern        | Current home (this doc) | Graduate to                       | Trigger                        |
| -------------- | ----------------------- | --------------------------------- | ------------------------------ |
| {pattern name} | §{N.M}                  | `architecture/patterns/{name}.md` | {Second domain that adopts it} |
