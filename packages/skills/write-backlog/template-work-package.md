---
type: Backlog
scope: work-package
work_package: <!-- e.g. 01-foundations -->
epic: <!-- e.g. CART01 -->
domain: <!-- domain name -->
version: '0.1'
owner: <!-- Squad name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
figma: <!-- Figma link, or omit -->
sources:
  - domain/{d}/solution.md
  - domain/{d}/contracts.md
  - domain/{d}/backlog.md
  - work/{d}/{wp}/design.md
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this work-package backlog.md:
  - Architecture patterns, NFRs, or cross-cutting concerns  → solution.md (cite by §)
  - API shapes, schemas, type aliases, or code fences       → contracts.md (cite by §)
  - How the code is implemented or sequenced into files     → work/{d}/{wp}/design.md
  - Business rationale or target-user context               → product.md
  - Cross-epic dependencies or later phases                 → domain/{d}/backlog.md
  - Prose restating what solution.md or design.md already say
Every story block MUST include: Status, Priority, Estimate, Epic, Labels,
Depends on, Deliverable, Design, Acceptance (EARS), Acceptance (Gherkin).
-->

# Backlog -- {Title} ({EPIC-ID})

Sprint-level backlog for the **{Title}** work package at
`work/{d}/{wp}/`, implementing {EPIC-ID} from
[`domain/{d}/backlog.md`](../../../domain/{d}/backlog.md).

Companion artefacts:

- Sprint-scope design: [`./design.md`](design.md)
- Domain patterns and contracts: [`domain/{d}/solution.md`](../../../domain/{d}/solution.md), [`domain/{d}/contracts.md`](../../../domain/{d}/contracts.md)
- Cart-wide epic list: [`domain/{d}/backlog.md`](../../../domain/{d}/backlog.md)

## 1. Summary

- **Epic.** {EPIC-ID} -- {Epic title}
- **Phase.** <!-- e.g. Now / Alpha (see domain/{d}/roadmap.md) -->
- **Priority.** P0
- **Estimate.** <!-- total story points --> points across <!-- N --> stories

**Scope.** <!-- 2-3 sentences describing what this work package delivers -->

**Out of scope (this work package).** <!-- explicitly deferred to later WPs -->

**Deliverables.** See [`./design.md`](design.md) §2 for the file list.

**Dependencies.** <!-- "None" or named epic / prerequisite IDs -->

**Downstream consumers.** <!-- which next work packages depend on this one -->

## 2. Conventions

| Convention | Value |
| --- | --- |
| Story ID | `{EPIC-ID}-{nn}` (e.g. `{EPIC-ID}-01`) |
| Status | Not started, In progress, In review, Done, Blocked |
| Priority | P0, P1, P2, P3 |
| Estimation | Fibonacci story points |
| Acceptance format | EARS + Gherkin per `docs/design/space-artefact-model.md` §5.3 |
| AC placement | Rendered in Jira description as checklist + Gherkin code fence |

## 3. Stories

<!--
Every story MUST use the canonical schema below.
Copy and fill in each field. Delete no fields.
-->

- [ ] **[{EPIC-ID}-01] {Story title}**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Epic:** {EPIC-ID} | **Labels:** phase:{phase}, domain:{d}, type:{type}
  - **Depends on:** -
  - **Deliverable:** <!-- one paragraph: what exists when this story is done -->
  - **Design:** [`./design.md#{section}`](design.md#{section})
  - **Acceptance (EARS):**
    - WHEN <!-- trigger -->, THE SYSTEM SHALL <!-- behaviour -->.
    - THE SYSTEM SHALL <!-- behaviour -->.
    - WHEN <!-- trigger -->, THE SYSTEM SHALL <!-- behaviour -->.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: <!-- scenario title -->
      Given <!-- precondition -->
      When <!-- action -->
      Then <!-- outcome -->
      And <!-- outcome -->
    ```

- [ ] **[{EPIC-ID}-02] {Story title}**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Epic:** {EPIC-ID} | **Labels:** phase:{phase}, domain:{d}, type:{type}
  - **Depends on:** {EPIC-ID}-01
  - **Deliverable:** <!-- one paragraph -->
  - **Design:** [`./design.md#{section}`](design.md#{section})
  - **Acceptance (EARS):**
    - WHEN <!-- trigger -->, THE SYSTEM SHALL <!-- behaviour -->.
    - THE SYSTEM SHALL <!-- behaviour -->.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: <!-- scenario title -->
      Given <!-- precondition -->
      When <!-- action -->
      Then <!-- outcome -->
    ```

## 4. Traceability

### Stories to solution sections

| Story | `domain/{d}/solution.md` section |
| --- | --- |
| {EPIC-ID}-01 | §N.M <!-- section title --> |
| {EPIC-ID}-02 | §N.M <!-- section title --> |

### Stories to product outcomes

| Story | Outcome (from `domain/{d}/product.md` §7) |
| --- | --- |
| {EPIC-ID}-01 | "<!-- outcome description -->" |

## 5. Definition of Done

A story in this backlog is done when:

- [ ] All EARS acceptance statements hold and every Gherkin scenario passes.
- [ ] Unit and integration tests pass locally and in CI; coverage on new files >= 80%.
- [ ] `pnpm typecheck` passes with zero `any` (except where JSDoc-justified).
- [ ] `pnpm lint` passes with no new warnings.
- [ ] Story ID and solution-section links appear in the commit message body.
- [ ] Code review approved by at least one other squad engineer.
- [ ] PR merged into `main`.

The epic ({EPIC-ID}) is done when every story is done **and** the phase exit
criteria in [`domain/{d}/roadmap.md`](../../../domain/{d}/roadmap.md) hold.

## 6. Risks (work-package specific)

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| F1 | <!-- WP-specific risk --> | Low | Medium | <!-- mitigation --> |

Broader domain risks are in [`domain/{d}/backlog.md`](../../../domain/{d}/backlog.md) §10.

## 7. Handoff

When this work package closes, the following are stable:

- <!-- contract / artefact / file that is now stable -->

Next work packages:

1. [`work/{d}/02-{slug}/`](../02-{slug}/) -- {EPIC-ID+1} {title}.
