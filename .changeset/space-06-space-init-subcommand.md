---
"@daddia/space": minor
---

Add `space init` subcommand for idempotent workspace initialisation (SPACE-06).

`space init` (run from any directory) detects the workspace state and brings the
directory to a fully operational Space workspace without overwriting authored
content.

- Three workspace states are handled: greenfield, partial, and complete.
- Greenfield: creates `.space/config`, ensures `package.json` dependencies, and
  creates agent symlinks (`.cursor/skills`, `.claude/skills`).
- Partial / complete: applies an idempotent render (skip-if-exists per file,
  additive YAML merge for `.space/config`), ensures dependencies, and recreates
  symlinks.
- Prints a `git init`-style status line: `Initialized empty Space workspace in`
  for greenfield; `Reinitialized existing Space workspace in` for partial and
  complete.
- Does not import any module from `@daddia/create-space` at runtime; the
  workspace-state detection logic is a self-contained copy inside `@daddia/space`.
