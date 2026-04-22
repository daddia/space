# AGENTS.md

This file gives implementation context to AI coding assistants working in the Space monorepo.

## Project Overview

This is the `@tpw/space` monorepo -- the workspace ecosystem for Horizon delivery spaces. It contains:

- Skills for AI coding agents
- Tooling to scaffold new delivery workspaces
- Scripts to operate existing spaces (sync, publish)

## Repository Structure

pnpm workspace monorepo. All packages use the `@tpw` scope.

| Directory | Package | Purpose |
|---|---|---|
| `packages/skills` | `@tpw/skills` | Delivery activity skills (Markdown content, no build step) |
| `packages/create-space` | `@tpw/create-space` | Scaffolding CLI for new delivery workspaces |
| `packages/space` | `@tpw/space` | Space operations CLI (sync, publish) |
| `tooling/` | `@tpw/*-config` | Shared internal configs (eslint, prettier, typescript) |

## Dependency rules

Dependencies flow downward only:

```
create-space  ->  (third-party only)
space         ->  (third-party only)
skills        ->  (nothing -- Markdown files only)
tooling/*     ->  (build configs only -- devDependencies)
```

No package in this repo depends on `@tpw/crew`.

## Development Commands

Run from repo root:

| Command | Description |
|---|---|
| `pnpm build` | Build `create-space` and `space` |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run Vitest suite |
| `pnpm lint` | Run ESLint |
| `pnpm format:write` | Format with Prettier |

## Skills

`packages/skills/` is Markdown only -- no build step, no TypeScript. Changes to skills do not require a build. Publish directly via changeset.

## Adding a new skill

See `packages/skills/AGENTS.md`.

## Adding a new package

1. Create `packages/{name}/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Add to root `tsconfig.json` references if it has TypeScript
3. Ensure it appears in the `build` script filter if it needs building
