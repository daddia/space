---
type: Product
domain: <!-- domain name, or omit for platform -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
parent_product: <!-- product/product.md, or omit for platform -->
related:
  - domain/{domain}/roadmap.md
  - domain/{domain}/metrics.md
  - domain/{domain}/requirements.md
  - domain/{domain}/design.md
  - domain/{domain}/contracts.md
  - domain/{domain}/backlog.md
---

# Product -- {Domain}

## 1. Executive summary

<!-- 3-5 sentences. What is this surface? Why does it matter commercially?
What contract or capability does it own that no other surface does?
Link to the roadmap, metrics, and backlog as the anchoring artifacts. -->

## 2. Problem

<!-- What is currently broken or missing? Be specific and evidence-based.
List as bullet points, each describing a discrete gap.
Reference the legacy analysis or existing codebase state where applicable. -->

## 3. Opportunity

<!-- What does a well-executed solution unlock?
1-2 paragraphs or a numbered list of 3-5 outcomes.
Should directly address each problem bullet above. -->

## 4. Strategic thesis

<!-- 3-4 named principles that define *how* this surface succeeds.
State trade-offs explicitly -- what this surface will NOT do. -->

## 5. Value claim

<!-- Measurable outcomes delivery yields.
Number the outcomes; each should have a metric or observable signal. -->

## 6. Target users

### Primary

<!-- Segments with distinct ergonomic or commercial needs.
Per segment: describe them, their device/context, and what success looks like for them. -->

### Secondary

<!-- Segments that benefit but are not the primary design target. -->

### Out of scope for this product

<!-- Segments explicitly not served in this cycle. -->

## 7. Scope

### In scope

<!-- Everything this domain owns and will deliver this product cycle. -->

### Out of scope

<!-- Explicitly deferred items with a reason (phase, squad ownership, or product decision). -->

### Adjacent surfaces

<!-- Surfaces that interact with this domain without owning it.
Per surface: describe the interaction and the interface boundary. -->

## 8. Ownership and interfaces

| Interface | Counterparty | Obligation |
| --------- | ------------ | ---------- |
| <!-- contract name --> | <!-- consuming domain / squad --> | <!-- what is guaranteed and under what conditions it changes --> |

## 9. Success definition

<!-- Specific, testable conditions that mark this product "done for this cycle".
Numbered list. Each item must be verifiable by an external reviewer.
Reference metrics.md for quantitative targets and roadmap.md for phase gates. -->

## 10. Relationship to the [platform / product]

<!-- How this domain fits into the platform sequencing.
What downstream phases depend on it?
What constraints does it inherit from the platform strategy? -->
