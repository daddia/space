# AGENTS.md

This file gives implementation context to AI coding assistants working in the `space` monorepo.

## Repository Overview

`space` is the workspace ecosystem for daddia delivery spaces. It is a pnpm monorepo under the `@daddia` scope containing:

- Skills (Markdown) for AI coding agents used across delivery workspaces
- A scaffolding CLI to initialise new delivery workspaces
- A space operations CLI to sync and publish data

## Repository Structure

| Directory                | Package                | Purpose                                                 |
| ------------------------ | ---------------------- | ------------------------------------------------------- |
| `packages/skills/`       | `@daddia/skills`       | Delivery activity skills (Markdown only, no build step) |
| `packages/create-space/` | `@daddia/create-space` | Scaffolding CLI for new delivery workspaces             |
| `packages/space/`        | `@daddia/space`        | Space operations CLI (`space sync`, `space publish`)    |
| `tooling/`               | `@daddia/*-config`     | Shared internal configs (eslint, prettier, typescript)  |
| `architecture/`          | —                      | Architecture documentation for the Space monorepo       |
| `contributing/`          | —                      | Contributor guides                                      |

Each package has its own `AGENTS.md` with package-specific implementation context.

## Architecture documentation

Before making substantive changes, read the relevant architecture docs:

| Topic                                             | Document                                           |
| ------------------------------------------------- | -------------------------------------------------- |
| Workspace artefact model, tiers, ownership matrix | `architecture/artefact-model.md`                   |
| Sync and publish pipeline                         | `architecture/publish-pipeline.md`                 |
| Solution architecture (monorepo)                  | `architecture/solution.md`                         |
| Skill anatomy and frontmatter schema              | `architecture/skills/skill-anatomy.md`             |
| Skill routing and descriptions                    | `architecture/skills/discovery-and-routing.md`     |
| Five-track and role model                         | `architecture/skills/track-and-role-model.md`      |
| Skill profiles                                    | `architecture/skills/profiles.md`                  |
| Index and views generation                        | `architecture/skills/index-and-views.md`           |
| Lint and quality checks                           | `architecture/skills/lint-and-quality.md`          |
| Acceptance criteria (EARS + Gherkin)              | `architecture/conventions/acceptance-criteria.md`  |
| Negative constraints (WHAT/WHY vs HOW)            | `architecture/conventions/negative-constraints.md` |
| Artefact references URI scheme                    | `architecture/conventions/artefact-references.md`  |
| Delivery phases (Phase 0/1/2)                     | `architecture/conventions/phases.md`               |

## Contributor guides

| Task                      | Guide                                 |
| ------------------------- | ------------------------------------- |
| Add a new skill           | `contributing/add-new-skill.md`       |
| Edit an existing skill    | `contributing/edit-existing-skill.md` |
| Deprecate a skill         | `contributing/deprecate-skill.md`     |
| Add a new source provider | `contributing/add-source-provider.md` |
| Release process           | `contributing/release-process.md`     |
| Naming conventions        | `contributing/naming-conventions.md`  |

## Dependency Rules

Dependencies flow downward only — no circular or upward imports:

```
create-space  →  third-party only
space         →  third-party only
skills        →  nothing (Markdown files only)
tooling/*     →  build configs only (devDependencies)
```

No package in this repo depends on `@daddia/crew`.

## Development Commands

Run from the repo root:

| Command             | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `pnpm build`        | Build `create-space` and `space`                       |
| `pnpm typecheck`    | Type-check all packages                                |
| `pnpm test`         | Run Vitest suite                                       |
| `pnpm lint`         | Run ESLint                                             |
| `pnpm format:write` | Format with Prettier                                   |
| `pnpm validate`     | Full pre-publish check (install, build, quality, test) |

Skills-specific commands (run in `packages/skills/`):

| Command                      | Description                       |
| ---------------------------- | --------------------------------- |
| `node bin/lint-skills.js`    | Lint all skills                   |
| `node bin/generate-index.js` | Regenerate `space-index/SKILL.md` |
| `node bin/generate-views.js` | Regenerate role view files        |

## Working Rules

- Read the relevant architecture doc before editing any package.
- `packages/skills/` is Markdown only — no build or typecheck after changes.
- After editing a skill, run `lint-skills.js` and `generate-index.js`. Commit both.
- `packages/create-space/` and `packages/space/` are TypeScript — run `pnpm build` and `pnpm typecheck` after changes.
- Run `pnpm test` after logic changes to either CLI package.
- Use changesets (`pnpm changeset`) when making publishable changes.
- Do not add cross-package dependencies without checking the dependency rules above.
