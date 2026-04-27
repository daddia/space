<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in the refine-session.md output:
  - Story-level acceptance criteria → remains in work/{wp}/backlog.md
  - Future scope or new stories → open a separate story instead
  - Re-narrated design content already in solution.md → cite by section
  - ADR bodies → write those in architecture/decisions/ADR-NNNN.md
-->

---

type: RefineSession
work_package: <!-- e.g. work/03-tooling-v2 -->
sprint_end: <!-- YYYY-MM-DD -->
solution_updated: <!-- true | false -->

---

# Refine Session — {Work Package}

**Sprint ended:** {date}  
**solution.md updated:** {yes/no}

## ADR candidates triaged

| Section in design.md | Decision            | Disposition              | ADR / Note              |
| -------------------- | ------------------- | ------------------------ | ----------------------- |
| § {n} {title}        | {one-line decision} | Promote / Inline / Defer | ADR-NNNN or inline note |

## Changes to `solution.md`

<!-- List every section touched and the nature of the change. -->

| Section    | Change              |
| ---------- | ------------------- |
| §9 ADR log | Added {description} |
| §10 Risks  | Closed {item}       |

## Archived design sections

<!-- List every section in design.md that received an ARCHIVED comment. -->

| Section             | Reason                       |
| ------------------- | ---------------------------- |
| {wp}/design.md §{n} | Promoted to solution.md §{m} |

## Open questions carried forward

<!-- List unresolved items from the WP that have been moved to the next sprint
     or to solution.md §10. -->

| Question        | Owner   | Next action                                       |
| --------------- | ------- | ------------------------------------------------- |
| {question text} | {owner} | {deferred to sprint N / added to solution.md §10} |
