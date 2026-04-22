# AGENTS.md

## Package Overview

`@tpw/space` is the operational CLI for a Horizon delivery space. It provides commands to sync external data sources into `.space/sources/` and (later) publish authored docs back to external systems.

## Commands

| Command | Description | Status |
|---|---|---|
| `space sync jira` | Sync Jira project into `.space/sources/jira/` | Planned |
| `space sync confluence` | Sync Confluence space into `.space/sources/confluence/` | Planned |
| `space sync` | Sync all configured sources | Planned |

## Key Areas

| Path | Responsibility |
|---|---|
| `src/index.ts` | CLI entry point and command registration |
| `src/commands/` | One file per command group |
| `src/providers/` | Provider-specific API clients (jira, confluence) |
| `src/config.ts` | Reads `.space/config` from the workspace root |

## Design Constraints

- Reads configuration from `.space/config` (YAML) in the workspace where `space` is run.
- Reads credentials from `.env` in the workspace root (never hardcoded).
- All sync output goes under `.space/sources/{provider}/` in native upstream format (no conversion).
- Commands are deterministic and idempotent -- safe to re-run.
- Partial writes go to a temp dir and only rename into place on success.
- Exit non-zero on API errors.

See `horizon/space-design/source-sync.md` for the full design.

## Development

Run from `packages/space`:

| Command | Description |
|---|---|
| `pnpm build` | Compile TypeScript |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm dev` | Watch mode |
