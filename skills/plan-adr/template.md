---
type: ADR Proposal List
domain: {domain}
status: Draft
owner: {Squad name}
last_updated: {YYYY-MM-DD}
related:
  - {domain}/requirements.md
  - {domain}/design.md
  - architecture/decisions/register.md
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in the ADR proposal list:
  - Full ADR bodies or decisions                       → write each ADR separately using write-adr
  - Epic scope or story decomposition                  → backlog.md
  - Implementation detail                              → solution.md or work/{wp}/design.md
  - Decisions already governed by an existing ADR      → reference the existing ADR instead
This document lists decisions that need an ADR written; it does not write them.
-->

# Proposed ADRs -- {Epic ID or Domain}

Prioritised list of Architecture Decision Records that need to be written
before (or alongside) technical design for {epic/domain}. Routine choices
already governed by existing ADRs are excluded.

## Summary

| #   | Title                     | Priority   | Epic(s) impacted | Related existing ADRs |
| --- | ------------------------- | ---------- | ---------------- | --------------------- |
| 1   | {Specific decision title} | Blocking   | {EPIC-ID}        | {ADR-XXXX or None}    |
| 2   | {Specific decision title} | Blocking   | {EPIC-ID}        | {ADR-XXXX or None}    |
| 3   | {Specific decision title} | Deferrable | {EPIC-ID}        | {ADR-XXXX or None}    |

{N} ADRs total; {N} Blocking, {N} Deferrable.

---

## 1. {Decision title}

**Priority:** Blocking / Deferrable ({reason in one sentence})
**Epic(s):** {EPIC-ID, EPIC-ID}
**Related ADRs:** {ADR-XXXX: Title, or None}

**Rationale (why consequential):** {One paragraph explaining why this decision
is consequential — specifically, how deciding it differently would change the
architecture, data model, integration pattern, or technology choice. Include
which future domains or epics will be affected by the precedent this sets.}

**Key questions the ADR must resolve:**

- {Specific question the ADR must answer}
- {Specific question the ADR must answer}
- {Specific question the ADR must answer}

---

## {N}. {Decision title}

{Repeat the above block for each proposed ADR}

---

## Deliberately not proposed

The following candidate decisions surfaced during analysis and were rejected as
either routine or already covered by existing ADRs:

- **{Candidate}**: {Reason rejected — e.g. "Resolved by ADR-0011" or "Routine implementation choice governed by coding standards"}
- **{Candidate}**: {Reason rejected}

## Next steps

1. Squad reviews and scores this list (keep / cut / merge)
2. For each accepted item, assign an `ADR-####` from the next free number in `register.md` and an owner
3. Draft each ADR using `write-adr`, starting with Blocking items
4. Update `register.md` with new rows when each ADR reaches `Proposed`
