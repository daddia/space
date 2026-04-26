# AGENTS.md

## Package Overview

`@daddia/skills` is a Markdown-only package. It contains delivery activity skills consumed by AI coding agents in daddia delivery workspaces. There is no build step and no TypeScript.

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
description: >
  Drafts product.md at portfolio, product, or domain scope. Use when the user
  mentions "product doc" or "product strategy". Do NOT use for roadmaps —
  use write-roadmap.
when_to_use: >
  Full prose description of when to invoke this skill and example triggers.
allowed-tools:
  - Read
  - Write
argument-hint: '<scope: portfolio|product|domain> <name> [--mode pitch|product]'
artefact: product.md
track: strategy              # Required. One of: strategy | architecture | discovery | delivery | refine | utility
also-relevant-to-tracks:     # Optional. Other tracks where this skill is useful.
  - discovery
role: pm                     # Required. Single primary role: pm | founder | architect | engineer | delivery | utility
also-relevant-to-roles:      # Optional. Other roles that use this skill.
  - founder
domain: product              # Required. Subject area: product | architecture | engineering | delivery
stage: stable                # Required. Lifecycle: stable | deprecated | deferred | experimental
consumes:
  - product.md               # Artefacts this skill reads
produces:
  - product.md               # Artefacts this skill writes (must match artefact field for .md outputs)
prerequisites:
  - product.md               # Artefacts that must exist before this skill runs
related:
  - write-roadmap            # Sibling skills
tags:
  - product
  - strategy
owner: '@daddia'
version: '0.3'
---
```

## Naming Convention

Skills use the `{verb}-{topic}` pattern. Canonical verbs and their delivery track:

| Verb | Track | Usage |
| --- | --- | --- |
| `write-` | any | Author a document from scratch |
| `refine-` | refine | Regular cadence update — record learnings, advance state |
| `review-` | any | Critical quality gate — senior lens, blocking verdict |
| `plan-` | architecture / strategy | Orchestrate or identify a set of decisions before authoring |
| `implement` | delivery | Execute a story against approved design and requirements |
| `validate` | delivery | Final acceptance check that an epic meets its DoD |
| `create-` | delivery | Automate a process that creates an external artefact (e.g. MR) |
| `refactor-` | delivery | Restructure code without changing behaviour, after a review |

## The Five Tracks

Skills are assigned a `track:` value corresponding to the delivery track they primarily support:

| Track | Purpose | Typical skills |
| --- | --- | --- |
| `strategy` | Set product direction | write-product, write-roadmap, write-backlog (domain), review-product, review-roadmap, refine-product, refine-roadmap |
| `architecture` | Define system structure, resolve technical decisions | write-solution, write-adr, write-tech-stack, write-contracts, plan-adr, review-adr, review-solution |
| `discovery` | Define the work; produce implementation-ready artefacts | write-backlog (WP), write-wp-design, write-metrics, review-design, review-backlog, refine-backlog |
| `delivery` | Build, review, and merge | implement, review-code, refactor-code, create-mr, validate |
| `refine` | Measure, reflect, improve | refine-product, refine-roadmap, refine-backlog, refine-docs, refine-solution, write-retrospective, write-metrics-report |

## Persona Vocabulary

Each skill body must open with a persona statement using one of the following canonical roles:

| Persona | Used by |
| --- | --- |
| Senior Product Manager | write-product, review-product, refine-product, write-metrics, write-backlog (domain) |
| Senior Delivery Lead | write-roadmap, review-roadmap, refine-roadmap, review-backlog, refine-backlog, validate, plan-delivery, write-retrospective, write-metrics-report |
| Senior Solution Architect | write-solution, review-solution, refine-solution, write-adr, plan-adr, review-adr, write-wp-design, review-design, write-contracts, write-tech-stack, refine-docs |
| Senior Software Engineer | implement, review-code, refactor-code, create-mr |
| QA Lead | validate |
| Skill Router | space-index |

## Description Authoring Rules

The `description:` field is used in skill pickers and routing tools. It must:

- Be **200–500 characters** (enforced by `lint-skills.js`)
- Open with a third-person verb-ing form: `Drafts` | `Creates` | `Implements` | `Reviews` | `Performs` | `Documents` | `Produces` | `Identifies` | `Refines`
- Contain at least one `Do NOT use` disambiguation clause
- Mention the produced `.md` artefact name verbatim (for document-producing skills)

## Body Structure

Every SKILL.md body MUST include these sections (in order):

1. **Persona statement** — "You are a Senior X doing Y." One sentence.
2. **Scope / Mode** (where applicable) — describes the `$0` argument or `--mode` flag.
3. **Negative constraints** — what this skill MUST NOT do or produce. Required if no `template.md` exists.
4. **Context** (`<artifacts>` block) — what the caller must provide.
5. **Steps** — numbered, imperative, concrete.
6. **Quality rules** — non-negotiable standards; what makes output unacceptable.
7. **Output format** — path, format, and an `<example>` block.

Skills with `template.md` files satisfy the negative-constraints requirement via the `DRAFTING AIDE / DO NOT INCLUDE` comment block in the template.

## Adding a Skill

1. Create `packages/skills/{verb}-{topic}/SKILL.md` with the full frontmatter schema above.
2. Add a `template.md` if the skill produces a structured output document with a fixed shape.
3. Add an `examples/` directory with at least one worked example when the output shape is complex.
4. Run `node bin/lint-skills.js {skill-name}` to verify the skill passes all checks.
5. Run `node bin/generate-index.js` and commit the updated `space-index/SKILL.md`.
6. Record a changeset (`pnpm changeset` from the repo root) before publishing.

## Editing a Skill

Skills are plain Markdown. No build or typecheck is required after editing. After editing:

1. Run `node bin/lint-skills.js {skill-name}` to verify changes pass all checks.
2. Run `node bin/generate-index.js` to refresh the index and commit the result.

## Publishing

```
pnpm changeset        # record the change
pnpm version-packages # bump version
pnpm release          # publish to npm
```
