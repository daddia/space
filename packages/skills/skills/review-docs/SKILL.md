---
name: review-docs
description: >
  Reviews product.md and solution.md for completeness and alignment before
  development begins. Use when the user mentions "review the docs for {epic}",
  "check the design and requirements are ready", or "are these docs good enough
  to start building". Flags gaps, inconsistencies, and drift between the two
  documents. Do NOT use to review code — use review-code for that. Do NOT use
  to review an ADR — use review-adr.
when_to_use: >
  Use before the foundation sprint or any new work package when you need to
  confirm that product.md and solution.md are aligned, complete, and ready for
  development. Typical triggers: "review the docs for {epic}", "are these docs
  ready?", "check the design and requirements are ready", "pre-implementation
  doc review".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<epic-id> [--scope portfolio|product|domain] [--name <name>]'
artefact: doc review
track: discovery
role: architect
also-relevant-to-roles:
  - pm
domain: architecture
stage: stable
consumes:
  - product.md
  - solution.md
produces:
  - review
prerequisites:
  - product.md
  - solution.md
related:
  - review-product
  - review-solution
  - review-design
  - review-backlog
tags:
  - review
  - docs
  - pre-sprint
owner: '@daddia'
version: '0.4'
---

# Review Docs

You are a Senior Solution Architect performing a pre-sprint doc review.
Check that `product.md` and `solution.md` are complete, consistent, and
aligned before the team begins implementation.

## Steps

1. **Locate the documents.** Resolve `product.md` and `solution.md` for the
   target scope (portfolio, product, or domain) using the scope flag or by
   walking up from the epic working directory.
2. **Check `product.md` for completeness.** Verify: goals and context are
   stated; success metrics are defined; out-of-scope items are listed; open
   questions are tracked.
3. **Check `solution.md` for completeness.** Verify: §1 context matches
   `product.md`; quality goals are stated; building-block view names the key
   components; the data model covers the domain; API contracts are referenced
   or stubbed; testing strategy is outlined.
4. **Check alignment.** Confirm `solution.md` components exist to deliver
   every goal in `product.md`. Flag any goal with no corresponding component,
   and any component with no stated goal.
5. **Amend in place.** For each gap or inconsistency, either fix it directly
   (if the fix is unambiguous) or add a `<!-- TODO -->` comment noting what
   is missing. Use the author's voice — do not re-narrate existing prose.
6. **Report the review outcome** in your response to the user, listing findings
   by severity: Blocking, Warning, Suggestion. Do not append any section to
   either document.

## Quality rules

- Fix unambiguous gaps directly rather than raising findings for them.
- Keep changes minimal — correct only what is wrong, never reformulate
  correct prose.
- A blocking finding means the story should not start until it is resolved.
- Warn about issues that increase delivery risk without stopping the sprint.
- Suggestions are welcome but must never block.

## Negative constraints

The review output MUST NOT contain:

- Story-level acceptance criteria → those belong in `work/{wp}/backlog.md`
- Implementation detail or code → belongs in `design.md` or `contracts.md`
- Duplicate text from the documents reviewed — reference by section instead
