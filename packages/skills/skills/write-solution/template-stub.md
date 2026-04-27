---
type: Solution
domain: <!-- domain name, or omit for platform -->
stage: stub
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
parent_product: <!-- domain/{d}/product.md or docs/product.md -->
related:
  - <!-- domain/{d}/product.md -->
  - <!-- domain/{d}/contracts.md -->
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

Cart-domain (or platform) solution design stub. The walking skeleton must walk
before this document fills beyond §1 and §2. Sections §3–11 are scaffolded so
the structure is in place; fill them during or after the foundation sprint as
each pattern crystallises in code.

For the product context, problem, users, and commercial scope see
[`product.md`](product.md).

## 1. Context and scope

### 1.1 System context

<!-- C4 Level 1 — text diagram. What does this domain/platform own?
     What upstream systems feed it? What downstream systems consume it?

```text
[Customer Browser]
  |
  +-- [{Domain} Surface]
        |
        +-- [{Upstream API}]
              |
              +-- [{Backend}]
```
-->

### 1.2 System boundary

**{Domain} owns:**

<!-- Bullet list: the surfaces, contracts, and APIs this domain produces -->

**{Domain} does not own** (for the full list of deferred capabilities see
[`product.md`](product.md) §5):

<!-- Bullet list: adjacent systems, upstream schemas, other domains' concerns -->

### 1.3 Upstream and downstream systems

<!-- Named list: who/what feeds this domain; who/what consumes it -->

## 2. Quality goals and constraints

### 2.1 Quality goals (top 3–5)

Ordered; the top goal dominates when goals conflict.

1. <!-- NFR: e.g. "Cart-to-checkout step rate must not regress" -->
2. <!-- NFR: e.g. "LCP p75 mobile < 2.5 s" -->
3. <!-- NFR: e.g. "Mutation responsiveness p75 < 500 ms" -->

### 2.2 Constraints

- **Technical:** [NEEDS CLARIFICATION]
- **Regulatory:** [NEEDS CLARIFICATION]
- **Organisational:** [NEEDS CLARIFICATION]

## 3. Solution strategy

[NEEDS CLARIFICATION]

## 4. Building block view

[NEEDS CLARIFICATION]

## 5. Runtime view

[NEEDS CLARIFICATION]

## 6. Data model and ubiquitous language

[NEEDS CLARIFICATION]

## 7. Cross-cutting concepts

[NEEDS CLARIFICATION]

## 8. Deployment and environments

[NEEDS CLARIFICATION]

## 9. Architectural decisions (ADR log)

[NEEDS CLARIFICATION]

## 10. Risks, technical debt, and open questions

[NEEDS CLARIFICATION]

## 11. Graduation candidates

[NEEDS CLARIFICATION]
