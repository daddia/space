# AGENTS.md

## Package Overview

`@tpw/create-space` is a scaffolding CLI that initialises a new Crew delivery workspace. It runs interactively or non-interactively and outputs a ready-to-use `crew-space` directory with the standard file structure.

## Commands

Run from `packages/create-space`:

| Command          | Description                   |
| ---------------- | ----------------------------- |
| `pnpm build`     | Build package with TypeScript |
| `pnpm typecheck` | Type-check package            |

## Key Areas

| Path        | Responsibility                                  |
| ----------- | ----------------------------------------------- |
| `src/`      | CLI entry point, prompts, and scaffolding logic |
| `template/` | Template files copied into the new workspace    |

## Implementation Notes

- Interactive mode uses `@inquirer/prompts`; non-interactive mode is driven by CLI flags via `commander`.
- The `--yes` flag skips all prompts and accepts defaults.
- The `--key` flag sets the project key (e.g. `ACME`) used in backlog item IDs.
- Keep the template directory in sync with the canonical `crew-space` structure.
- Avoid adding dependencies that are not required at scaffolding time.
