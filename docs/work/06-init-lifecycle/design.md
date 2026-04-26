---
type: Design
scope: work-package
mode: tdd
work_package: 06-init-lifecycle
epic: SPACE-06
product: space
version: "1.0"
owner: Horizon Platform
status: Draft
last_updated: 2026-04-26
related:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
  - docs/work/06-init-lifecycle/backlog.md
---

# Design -- Workspace Init Lifecycle (SPACE-06)

TDD-mode design for the **Workspace init lifecycle** work package at
`docs/work/06-init-lifecycle/`, implementing SPACE-06 from
[`docs/backlog.md`](../../docs/backlog.md).

This work package touches two packages: `@tpw/create-space` (scaffolding
CLI) and `@tpw/space` (operational CLI). The monorepo rule forbids
cross-package dependencies, so workspace-state detection logic is
duplicated minimally across both packages.

## 1. Scope

### 1.1 In scope

- **`detectWorkspaceState`** -- new utility in `create-space` that
  classifies a target directory as `'greenfield'`, `'partial'`, or
  `'complete'` based on the presence of files and a `.space/config`.
- **`validateTargetDir` update** -- remove the `isFolderEmpty` guard
  that currently rejects non-empty directories; permit partial and
  complete workspaces.
- **Idempotent template renderer** -- update `renderTemplate` to
  skip-if-exists for every file except `.space/config`, which receives
  an additive YAML merge (new keys added, existing keys preserved).
- **`createSpace` orchestrator update** -- branch on workspace state;
  emit `git init`-style status line; ensure `package.json` dependencies
  and agent symlinks for the partial/complete paths.
- **`space init` subcommand** -- new command on `@tpw/space` with the
  same idempotent behaviour; own copy of workspace-state detection.
- **Integration tests** covering all three workspace states for both
  entry points.
- **Changeset entries** for `@tpw/create-space` (minor) and
  `@tpw/space` (minor).

### 1.2 Out of scope

- `--mode embedded` layout (SPACE-11).
- Rewriting authored Markdown during reinit (manual upgrade documented
  per release).
- Profile-aware template selection (SPACE-10).
- Any changes to `@tpw/skills` (SPACE-02/SPACE-03).

## 2. Architecture fit

This work package extends the platform substrate established in SPACE-01
without changing any sync or publish logic. The two affected packages
remain independent; no new inter-package dependency is introduced.

The workspace-state detection concept is lightweight: it is a pure
`fs.stat` + existence check on `.space/config`. Duplicating ~30 lines
across two packages is preferable to a shared helper package that would
violate the monorepo dependency rules.

## 3. Files and components

### 3.1 `packages/create-space/`

| File | Status | Change |
| ---- | ------ | ------ |
| `src/helpers/workspace-state.ts` | NEW | `WorkspaceState` type + `detectWorkspaceState()` |
| `src/helpers/workspace-state.test.ts` | NEW | Unit tests for all three states |
| `src/helpers/validate.ts` | EVOLVE | Remove `isFolderEmpty` branch; add parent-writable check only |
| `src/helpers/validate.test.ts` | EVOLVE | Update tests to match new `validateTargetDir` contract |
| `src/template.ts` | EVOLVE | `renderTemplate` becomes idempotent (skip-if-exists + config merge) |
| `src/template.test.ts` | EVOLVE | Add idempotency tests and config-merge tests |
| `src/create-space.ts` | EVOLVE | Branch on state; print status line; ensure deps + symlinks on reinit |
| `src/snapshot.test.ts` | EVOLVE | Add snapshot for reinit output |

### 3.2 `packages/space/`

| File | Status | Change |
| ---- | ------ | ------ |
| `src/commands/init.ts` | NEW | `registerInitCommand()` with workspace-state detection + idempotent init |
| `src/commands/init.test.ts` | NEW | Integration tests for `space init` in all three states |
| `src/helpers/workspace-state.ts` | NEW | Minimal duplicate of the detection logic (no imports from `create-space`) |
| `src/index.ts` | EVOLVE | Register `init` command |

## 4. Data contracts

### 4.1 Workspace state type

```typescript
// packages/create-space/src/helpers/workspace-state.ts
// (identical shape in packages/space/src/helpers/workspace-state.ts)

export type WorkspaceState = 'greenfield' | 'partial' | 'complete';

/**
 * greenfield -- target dir does not exist, or exists but is empty.
 * partial    -- target dir exists with files, but no .space/config.
 * complete   -- target dir exists and has a .space/config file.
 */
export async function detectWorkspaceState(targetDir: string): Promise<WorkspaceState>;
```

### 4.2 Updated `validateTargetDir` contract

```typescript
// packages/create-space/src/helpers/validate.ts
// Only two failure modes remain:
//   - parent directory is not writable
//   - path exists but is not a directory
// Non-empty directories are no longer rejected.
export async function validateTargetDir(targetDir: string): Promise<ValidationResult>;
```

### 4.3 Updated `renderTemplate` contract

```typescript
// packages/create-space/src/template.ts

export type RenderMode = 'greenfield' | 'idempotent';

export async function renderTemplate(
  templateDir: string,
  targetDir: string,
  vars: TemplateVars,
  mode?: RenderMode,   // defaults to 'greenfield'
): Promise<string[]>;
// Returns list of files written (skipped files are not included).
// In 'idempotent' mode:
//   - every file is skipped if it already exists, EXCEPT .space/config
//   - .space/config: existing YAML is read; new keys from the template
//     are merged in additively; existing values are never overwritten
```

### 4.4 Status reporter output

```
Initialized empty Space workspace in /abs/path/.space/
Reinitialized existing Space workspace in /abs/path/.space/
```

Both lines are printed to stdout after the workspace is in a consistent
state. The message mirrors `git init` and `git init --reinitialize`
semantics intentionally.

## 5. Runtime view

### 5.1 `pnpm dlx @tpw/create-space <project>` -- three paths

```
create-space <project>
  └─ validateProjectName(name)          -- unchanged
  └─ validateTargetDir(targetDir)       -- EVOLVE: permit non-empty
  └─ detectWorkspaceState(targetDir)    -- NEW
       │
       ├─ 'greenfield'
       │     renderTemplate('greenfield')
       │     tryInstall()
       │     createAgentDirs()
       │     tryGitInit()
       │     print "Initialized empty Space workspace in ..."
       │
       ├─ 'partial'
       │     renderTemplate('idempotent')   -- skips existing files
       │     ensurePackageJsonDeps()        -- NEW: add @tpw/space + @tpw/skills
       │     createAgentDirs()              -- idempotent (forceSymlink already is)
       │     tryInstall()
       │     print "Reinitialized existing Space workspace in ..."
       │
       └─ 'complete'
             renderTemplate('idempotent')   -- skips existing files
             ensurePackageJsonDeps()
             createAgentDirs()
             tryInstall()
             print "Reinitialized existing Space workspace in ..."
```

### 5.2 `space init` -- same three paths

```
space init (run from workspace root)
  └─ detectWorkspaceState(cwd)      -- own copy
       │
       ├─ 'greenfield'   → full template render + install + symlinks
       ├─ 'partial'      → idempotent render + ensureDeps + symlinks
       └─ 'complete'     → idempotent render + ensureDeps + symlinks
  └─ print status line
```

`space init` resolves `targetDir` from `process.cwd()`. It reads the
template from `@tpw/create-space`'s bundled template directory via
`import.meta.resolve` or falls back to the co-located template copy.

> **Note.** For the initial implementation `space init` delegates
> template resolution to a small local copy of the template embedded in
> `packages/space/template/`. This avoids a runtime dependency on
> `@tpw/create-space` and keeps the packages independent. The template
> copy in `@tpw/space` need only contain the `.space/config` skeleton
> and `package.json` stanza -- it is not a full workspace template.

## 6. Error paths

| Condition | Behaviour |
| --------- | --------- |
| Parent dir not writable | `validateTargetDir` returns `{ valid: false }` → `createSpace` throws; `space init` prints error and exits non-zero |
| Target exists but is a file, not a dir | `validateTargetDir` returns `{ valid: false }` → same as above |
| `.space/config` exists but is not valid YAML | Additive merge skips the merge and overwrites with the template value; a warning is printed |
| `package.json` does not exist in partial workspace | `ensurePackageJsonDeps` creates a minimal `package.json` then adds the deps |
| `npm install` fails (offline) | Follows existing `tryInstall` offline behaviour; prints skip message |

## 7. Observability

Both entry points log each action at the same verbosity level as the
existing `create-space` output (picocolors `>>>` prefix). No new logging
framework is introduced.

## 8. Testing strategy

- **Unit tests** (`workspace-state.test.ts`): cover all three states
  using `tmp` directories created in `beforeEach` / cleaned in
  `afterEach`. No network, no install.
- **Unit tests** (`template.test.ts`): extend existing suite with
  idempotent-mode scenarios: skip unchanged file, merge new config key,
  preserve existing config value.
- **Unit tests** (`validate.test.ts`): update existing suite to confirm
  non-empty directories are no longer rejected.
- **Integration tests** (`init.test.ts` in `packages/space/`): spawn
  `space init` as a subprocess in a tmp workspace in each of the three
  states; assert exit code 0, correct status line, correct file
  presence, no authored-content loss.
- **Snapshot test** (`snapshot.test.ts`): add reinit snapshot alongside
  the existing greenfield snapshot.

All tests run with Vitest under `pnpm test` from the repo root.

## 9. Acceptance gates

| Gate | Criterion |
| ---- | --------- |
| State detection | All three states correctly classified for: empty dir, non-existent dir, dir with files + no config, dir with `.space/config` |
| Idempotent render | A file present before `renderTemplate(idempotent)` is not overwritten; its mtime is unchanged |
| Config merge | A new key introduced in the template is present in the output config; an existing key's value is not changed |
| Authored content | A `docs/` directory with Markdown files inside a partial workspace is untouched after reinit |
| Package.json deps | After reinit, `package.json` declares `@tpw/space` and `@tpw/skills` in `devDependencies` |
| Symlinks | After reinit, `.cursor/skills` symlink exists and points to `../node_modules/@tpw/skills` |
| Status line | Greenfield prints `Initialized empty`; partial/complete prints `Reinitialized existing` |
| `space init` | All three states produce the correct status line and file state |
| CI | `pnpm validate` passes with zero errors after all stories |

## 10. Handoff

When SPACE-06 closes:

- `@tpw/create-space` and `@tpw/space` both accept an existing or
  partially-initialised directory without refusing.
- A partially-initialised workspace (e.g. `carinyaforce-space`) becomes
  fully operational after one `space init` run.
- No authored Markdown is overwritten by either command.
- Idempotent behaviour is covered by integration tests that will catch
  regressions.

Next work package: [`docs/work/11-embedded/`](../11-embedded/) --
SPACE-11: `--mode embedded` on `create-space` and `space init`.
