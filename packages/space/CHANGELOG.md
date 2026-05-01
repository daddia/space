# @daddia/space

## 0.3.1

### Patch Changes

- Pass `--yes` to `npx skills add` to skip the interactive agent-selection prompt (SPACE-15-14).

  The Vercel `skills` CLI added an interactive prompt asking which agents to install to. This
  blocked `space skills sync` in non-interactive environments. Adding `--yes` accepts the default
  (Universal `.agents/skills/` only) without prompting.

## 0.3.0

### Minor Changes

- 5621e66: Add `space init` subcommand for idempotent workspace initialisation (SPACE-06).

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

- 3ce5dcf: Add `--mode embedded` flag and embedded workspace layout to `space init`.

  `space init --mode embedded` initialises Space inside an existing code
  repository, merging `devDependencies` and a managed `.gitignore` block without
  clobbering host content. Layout is read from `.space/config` on subsequent
  runs (sticky). The `workspace.layout` field is now typed and validated in
  `WorkspaceConfig`.

- a5fea66: Add `space update` and `space upgrade` commands with lifecycle module extraction.

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

## 0.2.0

### Minor Changes

- Add `space skills sync` and `space skills install` commands (SPACE-15).

  `space skills sync [--profile <name>]` resolves the active profile, calls
  `npx skills add daddia/skills` for the listed skills, and writes
  `skills-lock.json` at the workspace root.

  `space skills install` reads `skills-lock.json` and reinstalls the pinned
  set, for use in CI and on fresh clones.

  Profile YAML files are bundled inside `@daddia/space` at build time; the
  default profile is read from `.space/profile.yaml` when `--profile` is not
  supplied.
