---
type: Product
domain: <!-- domain name, or omit for platform -->
stage: product
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
parent_product: <!-- docs/product.md, or omit for platform -->
related:
  - <!-- domain/{d}/solution.md -->
  - <!-- domain/{d}/roadmap.md -->
  - <!-- domain/{d}/backlog.md -->
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in product.md:
  - File paths, module names, class names             → solution.md
  - API endpoints, HTTP verbs, schemas, type aliases  → solution.md or contracts.md
  - Tech stack names (React, Next.js, Zustand, etc.)  → solution.md
  - ADR numbers or decision rationales                → solution.md §9
  - Deployment topology or environment details        → solution.md §8
  - Component or service names                        → solution.md §4
-->

# Product -- {Domain}

## 1. Problem

<!-- What is currently broken or missing? Specific, evidence-based bullet points.
Each bullet: one discrete gap. -->

## 2. Appetite

<!-- How much is the team willing to invest?
Name the phases or the cycle. State what you will NOT invest in. -->

## 3. Sketch

<!-- What the solution delivers end-to-end, in plain language.
A Figma link or ASCII sketch if available. No implementation detail. -->

## 4. Rabbit holes

<!-- Risks the product will deliberately stay out of. Named, opinionated bullets. -->

## 5. No-gos

<!-- Explicit out-of-scope for this cycle. Each item with a one-line reason. -->

## 6. Target users

### Primary

<!-- Segments with distinct ergonomic or commercial needs.
Per segment: who they are, their device/context, what success looks like for them. -->

### Secondary

<!-- Segments that benefit but are not the primary design target. -->

### Out of scope for this product cycle

<!-- Segments explicitly not served in this cycle; name the reason or gating phase. -->

## 7. Outcome metrics

<!-- Product-level outcomes only.
Numeric thresholds, instrumentation, and baselines live in solution.md §2.1 and metrics.md.
Reference those docs rather than restating numbers here.

| Outcome | Target |
| ------- | ------ |
| {customer-visible outcome} | Match or improve vs legacy baseline |
| {customer-visible outcome} | Meet the bar defined in solution.md §2.1 |
-->

## 8. Product principles

<!-- Commercial / product-level principles only.
Engineering principles belong in solution.md.
Each principle: a name + one sentence stating the trade-off it makes. -->

## 9. Stakeholders and RACI

<!-- Who owns what, who is consulted, who is informed.

| Stakeholder | Responsibility | R/A/C/I |
| ----------- | -------------- | ------- |
| {squad/person} | {what they own} | R, A |
-->

## 10. Relationship to the {parent product}

<!-- How this domain fits the platform sequencing.
What downstream phases depend on this domain?
What constraints does it inherit from the platform strategy? -->
