# AGENTS.md

## Package Overview

`@tpw/skills` is a Markdown-only package. It contains delivery activity skills consumed by AI coding agents in Horizon delivery workspaces. There is no build step and no TypeScript.

## Skill Structure

Each skill lives in its own directory named `{verb}-{topic}/` (e.g. `write-product/`, `review-code/`):

```
packages/skills/
  write-product/
    SKILL.md          # Required — skill definition and instructions
    template.md       # Optional — output template
    examples/         # Optional — worked examples
```

`SKILL.md` uses YAML frontmatter followed by a Markdown body:

```yaml
---
name: write-product
description: One-line description shown in skill pickers
when_to_use: >
  Prose description of when to invoke this skill.
allowed-tools:
  - Read
  - Write
argument-hint: '<scope: platform|domain>'
version: '0.1'
---
```

## Naming Convention

Skills use the `{verb}-{topic}` pattern. Canonical verbs:

| Verb        | Usage                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `write-`    | Author a document from scratch (product, design, requirements, ADR, backlog, metrics, roadmap) |
| `review-`   | Review an existing document or artefact (code, docs, ADR)                                      |
| `plan-`     | Orchestrate or plan a multi-step activity (e.g. `plan-adr`)                                    |
| `implement` | Execute a story against approved requirements and design                                       |
| `validate`  | Final acceptance check that an epic is complete                                                |
| `create-`   | Automate a process that creates an external artefact (e.g. `create-mr`)                        |

## Adding a Skill

1. Create `packages/skills/{verb}-{topic}/SKILL.md` with the frontmatter above.
2. Add a `template.md` if the skill produces a structured output document.
3. Add an `examples/` directory with at least one worked example if the output shape is complex.
4. Record a changeset (`pnpm changeset` from the repo root) before publishing.

## Editing a Skill

Skills are plain Markdown. No build or typecheck is required after editing. Changes take effect immediately for consumers who install the updated package version.

## Publishing

Publish via changeset from the repo root:

```
pnpm changeset        # record the change
pnpm version-packages # bump version
pnpm release          # publish to npm
```
