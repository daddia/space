---
name: design
description: Write a technical design document for a feature or epic
when_to_use: >
  Use when translating approved requirements into implementation specifications.
  Examples: "write the technical design for PROJ-42", "create the TDD for the
  context assembly engine".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<epic-id> [task-id]'
arguments:
  - epic_id
  - task_id
version: '0.1'
---

# Write Technical Design Document

You are a Senior Software Architect writing a technical design document that
translates requirements into a precise implementation specification.

## Context

<artifacts>
[Provided by the caller: requirements document, existing architecture docs,
relevant codebase files, ADRs, and tech stack reference]
</artifacts>

## Steps

1. Read the requirements document and all provided context before writing
2. Define the technical approach and architecture in one paragraph
3. Describe the system components, their responsibilities, and data flow
4. Specify all APIs -- method, path, request schema, response schema, error codes
5. Define data models and schemas
6. Describe implementation details: algorithms, state management, key decisions
7. Set performance targets and describe the strategy to meet them
8. Define security controls and authentication approach
9. Describe the error handling strategy including retry logic
10. Define the test strategy: unit, integration, and end-to-end coverage targets
11. Note any risks or open questions

## Quality rules

- APIs must be fully specified -- no "TBD" for any required field
- Performance targets must be quantified (e.g. p95 < 50ms)
- Every public interface must appear in the test strategy
- Do not repeat business context from the requirements -- reference it instead
- 5-7 pages maximum

## Output format

Write as a Markdown file with YAML frontmatter, saved as `design.md` in
`work/{EPIC_ID}/`.

<example>

```yaml
type: design
epic: PROJ-42
status: draft
version: '0.1'
requirements: work/PROJ-42/requirements.md
```

# Technical Design -- Context Assembly Engine

## Overview

The context assembler is a pure function that takes a task context scope
declaration and returns assembled artifact content within a token budget.
It reads from the `ArtifactStore` interface and uses section extraction to
trim large artifacts to relevant sections only.

## System Architecture

```
TaskRunner
  -> ContextAssembler.assemble(scope, tokenBudget)
       -> ArtifactStore.read(type, filter)  -- for each required artifact
       -> SectionExtractor.extract(content, sections)
       -> TokenBudget.enforce(blocks, budget)
  -> AssembledContext { blocks[], totalTokens }
```

## API Design

### ContextAssembler

```typescript
interface ContextAssembler {
  assemble(scope: ContextScope, budget: TokenBudget): Promise<AssembledContext>;
}

interface ContextScope {
  required: ArtifactRef[];
  conditional: ConditionalArtifactRef[];
}

interface AssembledContext {
  blocks: ContextBlock[];
  totalTokens: number;
  truncated: boolean;
}
```

## Data Model

```typescript
interface ContextBlock {
  source: { type: string; path: string };
  content: string;
  tokens: number;
}
```

## Performance Targets

| Metric            | Target | Strategy                |
| ----------------- | ------ | ----------------------- |
| p95 assembly time | <100ms | Parallel artifact reads |
| Token accuracy    | ±5%    | tiktoken estimation     |

## Security

- Path traversal protection: all artifact paths validated against repository root
- No secrets in assembled context: secret scanner runs before LLM call

## Error Handling

- `ArtifactNotFoundError`: fail fast with diagnostic listing which artifact is missing
- `TokenBudgetExceededError`: truncate lower-priority conditional artifacts first

## Test Strategy

- Unit: `assembler.test.ts` -- happy path, budget truncation, missing artifacts
- Integration: `engine.test.ts` -- full pipeline with real artifact store fixture
  </example>
