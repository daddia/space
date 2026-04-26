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
| `docs/product.md`        | --                     | Product strategy (copy; canonical in `crew-space`)      |
| `docs/roadmap.md`        | --                     | Roadmap (copy; canonical in `crew-space`)               |
| `docs/getting-started/`  | --                     | User-facing getting started guides                      |

Each package has its own `AGENTS.md` with package-specific implementation context.

## Key documents

- `docs/product.md` -- Space product strategy
- `docs/roadmap.md` -- Space phased roadmap

The canonical versions of these documents, along with the full backlog, solution architecture, and work packages, live in the portfolio delivery workspace at `../crew-space`:

- `../crew-space/product/space/`
- `../crew-space/architecture/space/`
- `../crew-space/work/SPACE-{nn}/`

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

## Adding a New Package

1. Create `packages/{name}/` with `package.json`, `tsconfig.json`, and `src/index.ts`.
2. Add to root `tsconfig.json` references if the package has TypeScript.
3. Add the package filter to the `build` script in root `package.json` if it needs building.
4. Create a package-level `AGENTS.md` following the pattern in the existing packages.

## Working Rules

- Read the package-level `AGENTS.md` before editing any package.
- `packages/skills/` is Markdown only — changes do not require a build or typecheck.
- `packages/create-space/` and `packages/space/` are TypeScript — run `pnpm build` and `pnpm typecheck` after changes.
- Run `pnpm test` after logic changes to either CLI package.
- Use changesets (`pnpm changeset`) when making publishable changes to any package.
- Do not add cross-package dependencies without first checking the dependency rules above.
