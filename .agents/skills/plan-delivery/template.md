<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in the delivery-plan.md output:
  - Business rationale or product strategy → belongs in product.md
  - Architecture decisions, NFRs, or cross-cutting concerns → belongs in solution.md
  - Epic-level scope or acceptance criteria → belongs in backlog.md
  - Type definitions, schemas, or API shapes → belongs in contracts.md
  - Detailed implementation plans → belongs in work/{wp}/design.md
-->

---

type: DeliveryPlan
domain: <!-- domain name -->
phase: Phase-0
status: Draft
last_updated: <!-- YYYY-MM-DD -->

---

# Delivery Plan — {Domain}

**Domain:** {domain-name}  
**Context:** {one-sentence domain summary}

## Artefact sequence

| Step | Artefact                  | Skill                          | Status | Notes |
| ---- | ------------------------- | ------------------------------ | ------ | ----- |
| 1    | `domain/{d}/product.md`   | `write-product --stage pitch`  | Draft  |       |
| 2    | `domain/{d}/solution.md`  | `write-solution --stage stub`  | Draft  |       |
| 3    | `domain/{d}/roadmap.md`   | `write-roadmap`                | Draft  |       |
| 4    | `domain/{d}/backlog.md`   | `write-backlog` (domain scope) | Draft  |       |
| 5    | `domain/{d}/contracts.md` | `write-contracts`              | Draft  |       |

## Open questions

<!-- Record decisions that need to be resolved before the foundation sprint. -->

| #   | Question | Owner | Status |
| --- | -------- | ----- | ------ |
| Q1  |          |       | Open   |

## Foundation sprint gate

The foundation sprint may start when:

- [ ] All five artefacts above are at status **Approved**.
- [ ] Open questions are either resolved or explicitly deferred.
- [ ] A `work/{d}/01-foundations/` work package is planned with a
      `design.md` and `backlog.md`.
