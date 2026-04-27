# Skill Anatomy

The structure of a skill: what files it contains, how its frontmatter is read, and what sections its body must have.

## Directory layout

```
packages/skills/
  skills/                  # skill content root (Vercel pattern)
    {verb}-{topic}/
      SKILL.md             # required — skill definition and instructions
      template.md          # optional — generic public template
      template-*.md        # optional — daddia-specific mode variants (not published)
      examples/            # optional — worked example outputs
  profiles/                # YAML profile definitions
  views/                   # generated role-filtered Markdown
  space-index/             # generated routing index SKILL.md
  src/                     # TypeScript authoring toolkit (lint, generate, publish)
  tests/                   # Vitest unit tests for src/
```

Skill **content** (`skills/`) is Markdown only — no TypeScript. The `src/` authoring
toolkit is TypeScript and drives lint, generation, and publish; it is not required in
consumer workspaces.

## `SKILL.md` frontmatter

Every `SKILL.md` must include the following fields. The linter enforces them.

```yaml
---
name: write-product
description: >
  Drafts product.md at portfolio, product, or domain scope. Use when the
  user mentions "product doc", "PRD", "product strategy", or "what are we
  building". Do NOT include tech stack — use write-solution. Do NOT use for
  roadmaps — use write-roadmap.
when_to_use: >
  Full prose description of when to invoke and example trigger phrases.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: portfolio|product|domain> <name> [--mode pitch|product]'
artefact: product.md          # primary output artefact name
track: strategy               # strategy | architecture | discovery | delivery | refine | utility
role: pm                      # single primary role (see track-and-role-model.md)
also-relevant-to-roles:       # optional secondary roles
  - founder
also-relevant-to-tracks:      # optional secondary tracks
  - discovery
domain: product               # subject domain: product | architecture | engineering | delivery
stage: stable                 # stable | deferred | deprecated | experimental
consumes:
  - product.md                # artefact names (abstract, not paths)
produces:
  - product.md
prerequisites:
  - product.md                # must exist before this skill runs
related:
  - write-roadmap             # sibling skill names
tags:
  - product
  - strategy
owner: '@daddia'
version: '0.3'
---
```

### Field reference

| Field | Required | Description |
| --- | --- | --- |
| `name` | ✓ | Matches the directory name (`{verb}-{topic}`) |
| `description` | ✓ | 200–500 chars; LLM routing text (see `architecture/skills/discovery-and-routing.md`) |
| `allowed-tools` | ✓ | Tools the skill may use |
| `version` | ✓ | Semver string `'x.y'` |
| `artefact` | ✓ | Primary output name |
| `track` | ✓ | Delivery track (see `architecture/skills/track-and-role-model.md`) |
| `role` | ✓ | Single primary role |
| `domain` | ✓ | Subject domain |
| `stage` | ✓ | Lifecycle |
| `produces` | ✓ | List of produced artefact names |
| `when_to_use` | recommended | Extended routing guidance |
| `argument-hint` | recommended | CLI-style arg signature shown in pickers |
| `consumes` | recommended | Artefacts the skill reads |
| `prerequisites` | recommended | Must exist before skill runs |
| `related` | recommended | Sibling skill names |
| `also-relevant-to-roles` | optional | Secondary roles |
| `also-relevant-to-tracks` | optional | Secondary tracks |
| `tags` | optional | Free-form (linter does not check) |
| `owner` | recommended | `'@daddia'` or team name |

## Body sections

Every skill body must have these sections in order. Skills with `template.md` files satisfy the negative-constraints requirement via a DRAFTING AIDE block in the template instead of the body.

1. **Persona statement** — "You are a Senior X doing Y." One sentence.
2. **Scope / Mode** (where applicable) — describes argument interpretation
3. **Negative constraints** — `## Negative constraints` — what the skill must NOT produce. Required if no `template.md` exists.
4. **Context** — `<artifacts>` block listing what the caller provides
5. **Steps** — numbered, imperative
6. **Quality rules** — what makes output unacceptable
7. **Output format** — save path, format, and an `<example>` block

## Templates

`template.md` serves two purposes:

1. Gives agents a structural scaffold to fill in
2. Carries the DRAFTING AIDE block that enforces content rules at generation time

```markdown
<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this artefact:
  - File paths, module names         → solution.md
  - API shapes, schemas              → contracts.md
-->
```

The linter asserts that no committed output artefact contains a DRAFTING AIDE block. If the block is present in the output, the skill did not clean up after itself.

## Scope and save paths

Many skills take `<scope: portfolio|product|domain>` as the first argument. The save path depends on scope:

| Scope | Save path |
| --- | --- |
| `portfolio` | `product/{artefact}.md` |
| `product <name>` | `product/{name}/{artefact}.md` (portfolio workspace) or `product/{artefact}.md` (single-product) |
| `domain <name>` | `domain/{name}/{artefact}.md` |
| `work-package <wp>` | `work/{wp}/{artefact}.md` |

Skills should contain a scope-to-path table in their body rather than hard-coding specific paths.

## Naming convention

Skills use the `{verb}-{topic}` pattern. The verb signals the operation and the track:

| Verb | Track | Usage |
| --- | --- | --- |
| `write-` | any | Author from scratch |
| `refine-` | refine | Regular cadence update |
| `review-` | any | Critical quality gate |
| `plan-` | architecture / strategy | Identify or sequence decisions |
| `implement` | delivery | Execute a story |
| `validate` | delivery | Final acceptance check |
| `create-` | delivery | Automate an external artefact |
| `refactor-` | delivery | Restructure code without behaviour change |

See `contributing/naming-conventions.md` for the full policy.
