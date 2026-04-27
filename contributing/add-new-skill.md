# Add a New Skill

How to create a new skill in `@daddia/skills`.

## 1. Pick a name

Use the `{verb}-{topic}` pattern. Check existing skills to avoid name collision.

Canonical verbs: `write-`, `review-`, `refine-`, `plan-`, `implement`, `validate`, `create-`, `refactor-`.

See `contributing/naming-conventions.md` for the full policy.

## 2. Create the directory and SKILL.md

```bash
mkdir packages/skills/skills/{verb}-{topic}
touch packages/skills/skills/{verb}-{topic}/SKILL.md
```

Fill in the required frontmatter (see `architecture/skills/skill-anatomy.md`):

```yaml
---
name: {verb}-{topic}
description: >
  {Verb}s {artefact} ... Use when the user mentions "...". Do NOT use for
  X — use {sibling-skill}.
when_to_use: >
  ...
allowed-tools:
  - Read
  - Write
argument-hint: '<scope: ...> <name>'
artefact: {artefact}.md
track: {track}
role: {role}
domain: {domain}
stage: stable
consumes:
  - {input-artefact}.md
produces:
  - {output-artefact}.md
prerequisites:
  - {prerequisite}.md
related:
  - {sibling-skill}
owner: '@daddia'
version: '0.1'
---
```

Then write the skill body following the six required sections:

1. Persona statement
2. Scope / Mode (if applicable)
3. Negative constraints (required if no template.md)
4. Context (`<artifacts>` block)
5. Steps (numbered, imperative)
6. Quality rules
7. Output format with `<example>`

## 3. Add a template (if needed)

If the skill produces a structured document, add `template.md`:

```bash
touch packages/skills/skills/{verb}-{topic}/template.md
```

The template must open with a DRAFTING AIDE block:

```markdown
---
type: {Type}
scope: <!-- portfolio | product | domain -->
version: '0.1'
status: Draft
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this document:
  - Content type A → belongs in X.md
  - Content type B → belongs in Y.md
-->

# {Title}
...
```

## 4. Add examples (if needed)

```bash
mkdir packages/skills/skills/{verb}-{topic}/examples
```

Add at least one worked example when the output shape is complex. Name files descriptively: `cart-product.md`, not `example1.md`.

## 5. Lint the skill

```bash
pnpm --filter @daddia/skills lint:skills {verb}-{topic}
```

Fix all errors before proceeding. Common issues:
- `desc.length` — description is too short or too long (200–500 chars)
- `desc.verb` — description doesn't open with an allowed verb
- `desc.disambiguation` — description missing a `Do NOT use` clause
- `neg.skill` — SKILL.md body missing `## Negative constraints` section

## 6. Regenerate the index

```bash
pnpm --filter @daddia/skills generate:index
```

Commit the updated `space-index/SKILL.md` alongside the new skill.

## 7. Add a changeset

```bash
pnpm changeset
```

Select `@daddia/skills`, choose `minor` bump (new skill), write a one-line summary.

## 8. Run full quality check

```bash
pnpm --filter @daddia/skills lint
```
