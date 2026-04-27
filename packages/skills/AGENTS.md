# AGENTS.md

## Package Overview

`@daddia/skills` is a Markdown-only package. It contains delivery activity skills consumed by AI coding agents in daddia delivery workspaces. There is no build step and no TypeScript.

## Architecture reference

Full documentation for how skills are structured, linted, and published lives in the repo architecture docs:

| Topic                                            | Document                                          |
| ------------------------------------------------ | ------------------------------------------------- |
| Skill anatomy, frontmatter schema, body sections | `architecture/skills/skill-anatomy.md`            |
| Description authoring rules and routing          | `architecture/skills/discovery-and-routing.md`    |
| Five-track and role model                        | `architecture/skills/track-and-role-model.md`     |
| Skill profiles                                   | `architecture/skills/profiles.md`                 |
| Index and role views generation                  | `architecture/skills/index-and-views.md`          |
| Lint checks and quality rules                    | `architecture/skills/lint-and-quality.md`         |
| Artefact reference URI scheme                    | `architecture/conventions/artefact-references.md` |

## Quick reference: directory layout

```
packages/skills/
  {verb}-{topic}/
    SKILL.md          # Required — skill definition and instructions
    template.md       # Optional — output template
    template-*.md     # Optional — mode-specific templates
    examples/         # Optional — worked examples
  views/
    pm.md             # Generated — skills filtered by PM/founder role
    architect.md      # Generated — skills filtered by architect role
    engineer.md       # Generated — skills filtered by engineer role
    delivery.md       # Generated — skills filtered by delivery role
  profiles/
    minimal.yaml      # Starter profiles for workspace scaffold
    domain-team.yaml
    platform.yaml
    full.yaml
  space-index/
    SKILL.md          # Generated — all skill frontmatter as a routing table
  bin/
    lint-skills.js    # Validates all SKILL.md files
    generate-index.js # Regenerates space-index/SKILL.md
    generate-views.js # Regenerates views/*.md
```

## Naming Convention

Skills use the `{verb}-{topic}` pattern. See `contributing/naming-conventions.md` for the canonical verb list.

## Adding a Skill

See `contributing/add-new-skill.md` for the step-by-step guide. In brief:

1. Create `packages/skills/{verb}-{topic}/SKILL.md` with required frontmatter
2. Add `template.md` if the skill produces a structured document
3. Add `examples/` if the output shape is complex
4. Run `node bin/lint-skills.js {skill-name}` to verify
5. Run `node bin/generate-index.js` and commit the updated index
6. Add a changeset (`pnpm changeset` from repo root)

## Editing a Skill

See `contributing/edit-existing-skill.md`. After editing:

1. Run `node bin/lint-skills.js {skill-name}`
2. If frontmatter changed: run `node bin/generate-index.js`
3. Add a changeset

## URI scheme for cross-source references

Skill bodies must not use `../` relative paths. See `architecture/conventions/artefact-references.md` for the `{source}:{path}` scheme. The linter enforces this — `../` in a skill body is an error.

## Publishing

```
pnpm changeset        # record the change
pnpm version-packages # bump version
pnpm release          # publish to npm
```

See `contributing/release-process.md` for the full process.
