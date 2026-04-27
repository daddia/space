# Index and Views

How the skills package keeps itself navigable as it grows — the generated index that powers routing and the role-filtered views.

## `space-index` — the router skill

`space-index` is a skill whose body is an auto-generated table of every other skill's frontmatter. Its job: give the agent a single skill to trigger when the user's request is vague and could match multiple skills.

The generated table lives between sentinel comments inside `space-index/SKILL.md`:

```markdown
<!-- BEGIN GENERATED — do not edit; run `pnpm generate:index` to refresh -->
| Skill | Description (excerpt) | Artefact | Track | Role | Consumes | Produces |
| --- | --- | --- | --- | --- | --- | --- |
| write-product | Drafts product.md at portfolio, product, or domain ... | product.md | strategy | pm | — | product.md |
...
<!-- END GENERATED -->
```

**Never edit the generated block manually.** Run the generator:

```bash
node packages/skills/bin/generate-index.js
# or
pnpm --filter @daddia/skills generate:index
```

The script exits with code 1 if it made changes ("output was stale — commit the updated space-index/SKILL.md"). CI catches this to prevent stale indexes from shipping.

### What the generator reads

For each skill directory (excluding `bin/`, `.` prefixes, and skills with `stage: deprecated`):
1. Reads `SKILL.md` frontmatter
2. Extracts: `name`, `description` (first 120 chars), `artefact`, `track`, `role`, `consumes`, `produces`
3. Emits a table row

### Column semantics

| Column | Source | Used for |
| --- | --- | --- |
| Skill | `name:` | Unique ID |
| Description | `description:` (excerpt) | Human scan |
| Artefact | `artefact:` | What it produces |
| Track | `track:` | Delivery track filter |
| Role | `role:` | Primary persona |
| Consumes | `consumes:` | Input artefacts |
| Produces | `produces:` | Output artefacts |

## Role views

Role views are generated Markdown files that filter the skill library by the primary role. They live at:

```
packages/skills/views/
  pm.md           # role: pm or founder
  architect.md    # role: architect
  engineer.md     # role: engineer
  delivery.md     # role: delivery
```

Regenerate:

```bash
node packages/skills/bin/generate-views.js
# or
pnpm --filter @daddia/skills generate:views
```

Role views are committed and kept in sync with skills. They are the answer to "what can a PM do here?" — a generated single-page list they can scan or share.

## When to regenerate

Run both generators after:
- Adding or removing a skill
- Changing any field in a skill's frontmatter (especially `name:`, `description:`, `track:`, `role:`, `artefact:`, `consumes:`, `produces:`)
- Deprecating a skill (it disappears from the index but its frontmatter still drives the view filter for the transition period)

CI (`pnpm --filter @daddia/skills generate:index`) runs the index generator as a check step. A non-zero exit means the index is stale and the build fails.
