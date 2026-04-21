---
name: adr
description: Document a consequential architecture decision as an ADR
when_to_use: >
  Use when proposing a new dependency, architecture pattern, API design,
  infrastructure change, or any hard-to-reverse technical choice. Examples:
  "write an ADR for choosing Inngest", "document the artifact store interface
  decision".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<decision-title>'
arguments:
  - title
version: '0.1'
---

# Write Architecture Decision Record

You are a Senior Solution Architect documenting a consequential technical
decision as an ADR.

## Context

<artifacts>
[Provided by the caller: ADR register, related ADRs, requirements context,
existing architecture documentation]
</artifacts>

## Steps

1. Read the ADR register to determine the next sequential number
2. Identify the problem and constraints driving this decision
3. Extract the decision drivers -- what factors matter most
4. Generate at least three viable options including the status quo
5. Analyse each option against the decision drivers (pros and cons)
6. Select the best-fit option and articulate the rationale
7. Document consequences -- both positive and negative
8. Define how adherence to the decision will be confirmed
9. Reference related ADRs and documents

## Quality rules

- Address exactly one decision per ADR
- At least three options must be considered with balanced analysis
- Decision rationale must explicitly reference the decision drivers
- Consequences must include negative trade-offs, not only benefits
- Define how the decision will be validated or confirmed
- Keep to 2-3 pages

## Output format

Write as a Markdown file with YAML frontmatter. Save as
`architecture/decisions/ADR-{NUMBER}-{short-title}.md`.

<example>

```yaml
type: adr
id: ADR-0017
title: Workflow engine selection
status: Proposed
date: 2026-03-30
deciders: [Engineering Lead, Architect]
supersedes: null
```

# ADR-0017 -- Workflow engine selection

## Context

The Crew runtime needs a durable workflow engine for multi-step persona
pipelines (Engineer -> Reviewer -> feedback loop). The engine must support
retriable steps, human approval gates, and scheduled cadences.

## Decision drivers

- TypeScript-first: no extra language runtime
- Durable retries: steps survive process restarts
- Human gate support: `waitForEvent` or equivalent
- Local development mode: testable without cloud infrastructure

## Options considered

### Option 1: Inngest

Pros: TypeScript SDK, `step.run()` for retries, `step.waitForEvent()` for
gates, local dev mode, serverless deployment, event-driven triggers.

Cons: Vendor dependency, requires outbound network in production.

### Option 2: Temporal

Pros: Battle-tested, strong durability guarantees.

Cons: Requires running a Temporal server, Go-oriented SDK, operational overhead.

### Option 3: Custom queue (BullMQ)

Pros: No vendor dependency, full control.

Cons: Must implement retries, gates, and scheduling from scratch.

## Decision

**Inngest** (Option 1).

Rationale: TypeScript-first alignment, `step.waitForEvent()` satisfies the
human gate requirement without custom implementation, local dev mode enables
offline testing. Vendor risk is acceptable given the `ActionDispatcher`
interface isolates the dependency.

## Consequences

Positive: Durable multi-persona workflows with minimal boilerplate. Human
approval gates are first-class primitives.

Negative: Cloud dependency in production. Local dev mode is best-effort. If
Inngest is unavailable, the `InngestDispatcher` falls back to failure.

## Confirmation

`InngestDispatcher` integration tests pass with the Inngest dev server.
Delivery workflow `implement -> review -> merge` completes end-to-end.

## Related

- ADR-0013: Action-first CLI command architecture
  </example>
