---
"@daddia/create-space": minor
---

Add idempotent workspace initialisation (SPACE-06).

`create-space` now accepts existing directories without refusing. Three workspace
states are distinguished -- greenfield, partial, and complete -- and the correct
initialisation path is chosen automatically.

- `detectWorkspaceState(targetDir)` classifies a directory as `'greenfield'`,
  `'partial'`, or `'complete'` based on the presence of `.space/config`.
- `validateTargetDir` no longer rejects non-empty directories; only truly invalid
  paths (not a directory, parent not writable) are rejected.
- `renderTemplate` gains an optional `mode: 'greenfield' | 'idempotent'`
  parameter. In idempotent mode every file is skipped if it already exists,
  except `.space/config` which receives an additive YAML merge (new keys are
  added; existing values are never changed).
- `createSpace` branches on workspace state, prints a `git init`-style status
  line (`Initialized empty` / `Reinitialized existing`), and ensures
  `package.json` dependencies and agent symlinks on the partial/complete paths.

Running `pnpm dlx @daddia/create-space` against a partially-initialised
workspace (e.g. one created before a prior release added new template files)
now brings it to a fully operational state without overwriting any authored
Markdown.
