---
name: requirements
description: >
  Drafts requirements.md for an epic in regulated or contractual contexts where
  external traceability is required. Use when the user mentions "write
  requirements" or "we need formal requirements for {epic}" and the domain is
  regulated (payments, auth, compliance). Retired from the default profile —
  most domains use story-level AC in backlog.md instead. Do NOT use for
  standard epics — use write-backlog. Do NOT use for architecture — use
  write-solution.
when_to_use: >
  Use when starting a new epic and requirements need to be defined, or when
  refining requirements for an existing epic or task. Examples: "write
  requirements for PROJ-42", "create the PRD for the auth feature".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<epic-id> [task-id]'
arguments:
  - epic_id
  - task_id
artefact: requirements.md
phase: definition
role:
  - pm
  - engineer
domain: product
stage: deprecated
consumes:
  - product.md
produces:
  - requirements.md
prerequisites:
  - product.md
related:
  - write-product
  - write-backlog
  - write-wp-design
tags:
  - requirements
  - prd
owner: '@horizon-platform'
version: '0.1'
---

# Write Requirements Document

You are a Senior Product Manager writing a requirements document.

## Negative constraints

A requirements.md MUST NOT contain:

- Architecture or implementation decisions → solution.md or work/{wp}/design.md
- Business strategy or product principles → product.md
- Story-level acceptance criteria in EARS or Gherkin format → use write-backlog for that
- Metric targets without baselines → metrics.md owns quantified targets
- Duplicate content already in product.md §5 (no-gos) — reference it instead

## Context

<artifacts>
[Provided by the caller: product strategy, roadmap, backlog, existing epic
context, and any related tickets, designs, or prior requirements]
</artifacts>

## Steps

1. Read all provided context before writing anything
2. Write an overview paragraph summarising the epic and its purpose
3. Define the problem or opportunity being addressed
4. List objectives -- each with a measurable target outcome
5. Define success metrics with baseline and target values
6. List functional requirements, each with a priority and acceptance criteria
7. Define scope using Must / Should / Could / Won't
8. Identify risks with impact rating and mitigation approach
9. Note any open questions or TBD items in a Questions section

## Quality rules

- Every functional requirement must have acceptance criteria
- Success metrics must have both a baseline and a target column
- If information is missing, write "TBD" and add it to the Questions section
- Derive requirements from the context provided -- do not invent them
- Cite sources inline where practical (e.g. [JIRA-123], [Figma])
- 3-5 pages for epic-level, 2-3 pages for task-level

## Output format

Write as a Markdown file with YAML frontmatter. The filename is `requirements.md`
saved in the appropriate `work/{EPIC_ID}/` directory.

<example>

```yaml
type: requirements
epic: PROJ-42
status: draft
version: '0.1'
```

# Requirements -- Context Assembly Engine

## Overview

The context assembly engine is responsible for gathering the right artifacts
and extracting relevant sections for each persona run...

## Problem / Opportunity

Personas currently receive too much irrelevant context, reducing output quality
and increasing token cost. Scoped context assembly will improve both.

## Objectives

- **Scoped assembly**: Return only artifacts declared in the task's context scope
- **Token efficiency**: Keep assembled context under the per-task token budget

## Success Metrics

| Metric                  | Baseline | Target | Measurement           |
| ----------------------- | -------- | ------ | --------------------- |
| Context relevance score | N/A      | >8/10  | LLM rubric evaluation |
| Assembly time           | N/A      | <100ms | p95 wall clock        |

## Functional Requirements

- **FR-01**: Assembler reads declared artifacts from the artifact store [Must]
  - AC: Given a task scope, assembler returns all matching artifacts
  - Test: TC-FR-01

- **FR-02**: Assembler respects the per-task token budget [Must]
  - AC: Assembled context never exceeds the configured token limit
  - Test: TC-FR-02

## Scope

**Must have:**

- Artifact reading from the filesystem store
- Section extraction by heading name
- Token budget enforcement

**Should have:**

- Conditional artifact inclusion based on task state

**Won't have:**

- Real-time streaming assembly
- Cross-repository artifact reads

## Risks

| Risk                         | Impact | Likelihood | Mitigation                        |
| ---------------------------- | ------ | ---------- | --------------------------------- |
| Token budget too restrictive | High   | Medium     | Make budget configurable per task |

## Questions

- TBD: Should conditional artifacts count toward the token budget?
  </example>
