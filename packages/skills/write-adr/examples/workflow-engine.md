---
type: adr
id: ADR-0017
title: Workflow engine selection
status: Accepted
date: 2026-03-30
deciders: [Engineering Lead, Architect]
supersedes: null
---

# ADR-0017 -- Workflow engine selection

## Context

The Space runtime needs a durable workflow engine for multi-step persona
pipelines (Engineer -> Reviewer -> feedback loop). The engine must support
retriable steps, human approval gates, and scheduled cadences. Without a
durable engine, failed steps require a full pipeline restart, human gates
cannot be modelled, and scheduled cadences must be bolted on separately.

## Decision drivers

- **TypeScript-first**: no additional language runtime for the team to operate
- **Durable retries**: individual steps survive process restarts without replaying prior steps
- **Human gate support**: `waitForEvent` or equivalent primitive for approval flows
- **Local development mode**: testable without cloud infrastructure on every developer machine

## Options considered

### Option 1: Inngest

Pros: TypeScript SDK, `step.run()` for durable retries, `step.waitForEvent()` for
human gates, local dev server mode, serverless deployment, event-driven triggers.

Cons: Vendor dependency; requires outbound network in production; local dev mode
is best-effort and may diverge from production behaviour.

### Option 2: Temporal

Pros: Battle-tested in production at scale; strong durability guarantees; rich
ecosystem of SDKs and tooling.

Cons: Requires running and operating a Temporal server; Go-oriented SDK with a
TypeScript wrapper that lags behind; significant operational overhead for a
small team.

### Option 3: Custom queue (BullMQ)

Pros: No vendor dependency; full control over retry semantics and scheduling;
runs on Redis which the team already operates.

Cons: Must implement durable retries, human gates, scheduling, and fan-out from
scratch; maintenance burden grows with each new workflow pattern.

## Decision

**Inngest** (Option 1).

Rationale: TypeScript-first alignment satisfies the "no additional runtime"
driver. `step.waitForEvent()` satisfies the "human gate support" driver without
custom implementation. Local dev mode satisfies "local development" driver for
the majority of development workflows. Vendor risk is acceptable because the
`ActionDispatcher` interface isolates the dependency — switching to Temporal or
BullMQ would require replacing one implementation, not rewriting call sites.

## Consequences

Positive: Durable multi-persona workflows with minimal boilerplate. Human
approval gates are first-class primitives. Serverless deployment fits the
existing infrastructure model.

Negative: Cloud dependency in production — if Inngest is unavailable, the
`InngestDispatcher` falls back to failure. Local dev mode is best-effort and
may not replicate all production edge cases. Vendor lock-in until the
`ActionDispatcher` interface is proven sufficient to abstract the difference.

## Confirmation

`InngestDispatcher` integration tests pass with the Inngest dev server running
locally. The delivery workflow `implement -> review -> merge` completes
end-to-end with a human gate between each step. No call site imports
`inngest` directly — all access goes through `ActionDispatcher`.

## Related

- ADR-0013: Action-first CLI command architecture
- ADR-0016: State machine pattern for multi-step workflows
