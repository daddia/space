---
"@daddia/space": minor
---

Add `space update` and `space upgrade` commands with lifecycle module extraction.

`space update` probes the npm registry for all `@daddia/*` packages declared in the
workspace `package.json`, writes `.space/.update-cache.json`, and prints a report
distinguishing compatible and breaking updates. Read-only and safe to run in CI or
pre-commit hooks.

`space upgrade` reads or refreshes the cache, applies compatible (non-breaking)
version bumps to `package.json` specifiers, runs install, merges `.space/config`,
ensures agent directories, and syncs skills for the active profile. Prints a full
transcript of every change. Breaking bumps are skipped with a `space upgrade --major N`
hint. `--major` is a stub that explains when per-major codemod packages become available.

Both commands are thin shells over a new `src/lifecycle/` module that extracts the
workspace-mutation primitives from `space init` into independently testable, reusable
functions: `mergeOrCreateConfig`, `ensurePackageJsonDeps`, `ensureAgentDirs`,
`runInstall`, `detectWorkspaceState`, and `readExistingLayout`. `space init` is
refactored to delegate to the same primitives; its behaviour is unchanged.

`.space/.update-cache.json` is gitignored in both the sibling-mode scaffold template
and the embedded-mode managed block.
