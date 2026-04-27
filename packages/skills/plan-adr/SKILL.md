---
name: plan-adr
description: >
  Identifies the architecture decisions that need ADRs and produces a
  prioritised adr-plan.md before technical design proceeds. Use when the user
  mentions "plan ADRs", "what ADRs do we need", "identify architecture
  decisions for {domain}", or "which decisions need documenting". Produces a
  list of proposed ADRs — does not write full ADRs. Do NOT use to write an
  ADR — use write-adr. Do NOT use to review an existing ADR — use review-adr.
when_to_use: >
  Use before starting technical design on an epic or domain to identify which
  decisions warrant ADRs before writing them. Examples: "plan ADRs for the
  cart domain", "what ADRs do we need before checkout design?", "identify
  architecture decisions for CART01". Do not use this to write the ADRs
  themselves — use write-adr for that.
allowed-tools:
  - Read
  - Glob
  - Grep
argument-hint: '<epic-id-or-domain>'
disable-model-invocation: true
artefact: adr-plan.md
track: architecture
role: architect
domain: architecture
stage: stable
consumes:
  - solution.md
produces:
  - adr-plan.md
prerequisites:
  - solution.md
related:
  - write-adr
  - review-adr
  - write-solution
tags:
  - adr
  - architecture
  - planning
owner: '@daddia'
version: '0.3'
---

# Plan Architecture Decision Records

You are a Lead Architect identifying the consequential technical decisions that
need ADRs for `$ARGUMENTS` before technical design can proceed.

## Supporting files

- Output template: [template.md](template.md)
- Worked example: `examples/cart-domain.md`

## Steps

1. Read the requirements document, solution architecture, and existing ADR register for `$ARGUMENTS`
2. Read any existing design documents or contracts that have already committed to patterns
3. Identify every area where the requirements introduce ambiguity, new technology, new integration patterns, or architectural trade-offs
4. For each area, ask: "Would deciding this differently change the architecture, data model, integration pattern, or technology?" — if yes, it may warrant an ADR
5. Filter ruthlessly: reject anything covered by existing ADRs, anything that is a routine implementation choice, or anything with an obvious answer given current standards
6. Classify each surviving decision as **Blocking** (must resolve before design can proceed) or **Deferrable** (can resolve during or after design)
7. For each proposed ADR write: title (specific, not vague), one-sentence rationale (why consequential), priority, related existing ADRs
8. List decisions explicitly rejected and why — this prevents the same candidates resurfacing in review
9. Save output using `template.md` as the starting structure

## Quality rules

- Every proposed ADR addresses a genuinely consequential decision — if decided differently it would change the architecture
- Titles are specific: "Cart mutation error-code taxonomy ownership", not "Error handling decision"
- The rationale explains why the decision cannot be deferred, not just that it matters
- The list is short: 3–8 ADRs for a major epic, fewer for smaller work
- Blocking vs. Deferrable classification is justified
- Related existing ADRs are always checked — do not propose an ADR for a decision already made
- Decisions not warranting ADRs are explicitly listed as rejected with a reason

## Anti-patterns to avoid

- Proposing ADRs for routine choices already covered by coding standards or existing ADRs
- Vague titles that do not describe a specific decision
- Proposing too many ADRs — if everything is consequential, nothing is
- Writing full ADR content instead of identifying and prioritising decisions
- Ignoring existing ADRs that already address the topic

## Output

Save as `{domain}/decisions/proposed-adrs.md` using `template.md` as the scaffold.
Once reviewed, each accepted item becomes an `ADR-####-*.md` file written with `write-adr`.
