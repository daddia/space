# Skill Lint and Quality

How the skill linter works, what it checks, and how to fix failures.

## Running the linter

```bash
pnpm --filter @daddia/skills lint:skills              # lint all skills
pnpm --filter @daddia/skills lint:skills write-product  # lint one skill
pnpm --filter @daddia/skills lint:skills --json       # machine-readable output
```

Exit code 0 = all checks pass. Exit code 1 = one or more errors.

## Checks

### `fm.required` — required frontmatter fields

Every non-deprecated skill must have these fields, non-empty:

`name`, `description`, `allowed-tools`, `version`, `artefact`, `track`, `role`, `produces`

**Fix:** add the missing field to `SKILL.md` frontmatter.

### `desc.length` — description character count

`description` must be **200–500 characters**.

**Fix:** trim or expand the description. Descriptions over 500 chars are usually trying to do the job of `when_to_use`.

### `desc.verb` — description opening verb

`description` must open with one of:

`Drafts` | `Creates` | `Implements` | `Reviews` | `Performs` | `Documents` | `Produces` | `Identifies` | `Refines`

**Fix:** rewrite the opening sentence to start with one of these verbs.

### `desc.disambiguation` — `Do NOT use` clause

`description` must contain at least one `Do NOT use` clause that names a neighbouring skill.

**Fix:** add a boundary clause: `Do NOT use for X — use write-solution.`

### `desc.artefact` — artefact name in description

For skills that produce `.md` artefacts, the `description` must mention the artefact name verbatim (e.g., `product.md`).

**Fix:** add the artefact name to the description text.

### `desc.unique` — description uniqueness

No two skills may have identical descriptions (after whitespace normalisation).

**Fix:** differentiate the descriptions.

### `graph.consumes` — handoff graph integrity

Every item in `consumes:` must match an item in some other skill's `produces:`. This validates that the skill's inputs exist in the library.

**Fix:** correct the artefact name to match what another skill produces, or add `produces: [X]` to the producing skill.

### `neg.template` — DRAFTING AIDE block in templates

Every `template*.md` file must contain a `DRAFTING AIDE / DO NOT INCLUDE` comment block.

**Fix:** add the block to the top of the template file:

```markdown
<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in this document:
  - Content type A → belongs in X.md
-->
```

### `neg.skill` — Negative constraints in skill body

If a skill has no `template*.md` files, the `SKILL.md` body must contain a `## Negative constraints` section.

**Fix:** add the section to the skill body.

### `path.relative` — no `../` relative paths

Skill bodies must not contain `../` relative paths. Use the `{source}:{path}` URI scheme for cross-repo references. See `architecture/conventions/artefact-references.md`.

**Fix:** replace `../../crew/architecture/solution.md` with `crew:architecture/solution.md`.

## Deprecated skills

Deprecated skills (`stage: deprecated`) are exempt from all v2 frontmatter and description checks. They must still have:
- `name`
- `description`
- `allowed-tools`
- `related:` pointing at the live replacement skill

## Running on CI

The linter is run as part of `pnpm lint` at the repo root. It is also run standalone as a pre-publish check in the skills package.

After making changes to any skill, run:

```bash
pnpm --filter @daddia/skills lint:skills {skill-name}
```

Then regenerate the index:

```bash
pnpm --filter @daddia/skills generate:index
```

Commit both the skill change and the updated `space-index/SKILL.md`.
