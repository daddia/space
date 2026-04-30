# @daddia/create-space

## 0.3.0

### Minor Changes

- 5621e66: Add idempotent workspace initialisation (SPACE-06).

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

- 85d7361: Add `--profile` flag and interactive profile prompt (SPACE-10).

  Workspace scaffolding now supports selective skill materialisation via a named
  profile. The flag is wired end-to-end through the CLI, `SpaceConfig`, and the
  `space skills sync` invocation, and the chosen profile is persisted to
  `.space/profile.yaml` so subsequent `space skills sync` calls inherit it
  without needing the flag.
  - `--profile <name>` option on `pnpm create @daddia/space` (valid names:
    `minimal`, `domain-team`, `platform`, `full`).
  - Interactive `select` prompt in full interactive mode; skipped under `--yes`,
    in CI, or when `--profile` is provided explicitly. Default: `full`.
  - `.space/profile.yaml` written after a successful `space skills sync`; absent
    when no profile is given or when sync fails, preventing an invalid name from
    being persisted.
  - `trySkillsSync` return type changed from `void` to `boolean` to signal
    success to the caller.

- 3ce5dcf: Add `--mode embedded` flag and embedded workspace layout to `create-space`.

  Embedded mode scaffolds a Space workspace inside an existing code repository
  as a top-level subtree. It merges Space's `devDependencies` and a managed
  `.gitignore` block into the host repo without touching any host files.
  Auto-detection infers the layout from code-repo markers; layout is sticky
  once written to `.space/config`.

## 0.2.0

### Minor Changes

- Stop adding `@daddia/skills` as a devDependency in scaffolded workspaces. The
  scaffold now runs `space skills sync` (best-effort) after `pnpm install` to
  populate `.agents/skills/` via the public mirror. The `.gitignore` template
  gains entries for `.agents/skills/`, `.cursor/skills`, and `.claude/skills`.
  Agent symlinks inside `.cursor/` and `.claude/` now resolve to `.agents/skills/`
  rather than `node_modules/@daddia/skills`.

## 0.1.0

- Initial release.
