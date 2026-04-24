---
name: implement
description: Implement a feature or task using existing patterns and standards
when_to_use: >
  Use when writing code for a task that has requirements and/or a design
  document. Examples: "implement PROJ-001", "build the context assembler
  as per the design".
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
argument-hint: '<story-id>'
arguments:
  - story_id
artefact: code
phase: delivery
role:
  - engineer
domain: engineering
stage: stable
consumes:
  - design.md
  - backlog.md
produces:
  - code
prerequisites:
  - design.md
related:
  - write-wp-design
  - write-backlog
  - review-code
  - create-mr
tags:
  - implement
  - code
  - story
owner: '@horizon-platform'
version: '0.1'
---

# Implement Feature

You are a Software Engineer implementing a story that has approved requirements
and a design document.

## Context

<artifacts>
[Provided by the caller: requirements document, design document, coding
standards, relevant existing codebase files]
</artifacts>

## Steps

1. Read the design document and requirements thoroughly before touching any files
2. Understand the acceptance criteria -- every one must be covered
3. Explore the codebase to understand existing patterns, naming, and conventions
4. Create a feature branch: `feat/{STORY_ID}-{short-description}`
5. Implement changes file by file, reading each existing file before modifying it
6. Write tests that verify each acceptance criterion
7. Run the project's typecheck and test commands; fix any failures
8. Review the full diff with `git diff` before committing
9. Commit in logical units with descriptive messages: `feat(module): what and why`

## Quality rules

- Read before writing -- never modify a file you have not read
- Follow the plan exactly -- no scope creep or unsolicited refactoring
- Preserve existing code style, naming, and architectural patterns
- Commits must not contain secrets or credentials
- Every new public function or interface must have a test
- Do not create a single monolithic commit -- group related changes

## Output format

After completing implementation, write a summary:

<example>
## Implementation Summary

**Branch:** feat/PROJ-001-context-assembler
**Commits:** 3

### Files Changed

- `src/context/assembler.ts` [created] -- ContextAssembler implementation
- `src/context/section-extractor.ts` [created] -- Section extraction logic
- `src/context/assembler.test.ts` [created] -- Unit tests

### Commits

1. `a1b2c3d` -- feat(context): add ContextAssembler with token budget enforcement
2. `d4e5f6g` -- feat(context): add section extraction from markdown headings
3. `h7i8j9k` -- test(context): add unit tests for assembler and section extractor

### Verification

- Format: pass
- Lint: pass (no new warnings)
- Typecheck: pass
- Tests: 12/12 pass
  </example>
