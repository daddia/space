---
type: Backlog
scope: work-package
work_package: 06-init-lifecycle
epic: SPACE-06
product: space
version: "1.0"
owner: Horizon Platform
status: Not started
last_updated: 2026-04-26
sources:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
  - docs/work/06-init-lifecycle/design.md
---

# Backlog -- Workspace Init Lifecycle (SPACE-06)

Sprint-level backlog for the **Workspace init lifecycle** work package at
`docs/work/06-init-lifecycle/`, implementing SPACE-06 from
[`docs/backlog.md`](../../docs/backlog.md).

Companion artefacts:

- TDD design: [`./design.md`](design.md)
- `create-space` package: [`packages/create-space/`](../../packages/create-space/)
- `space` package: [`packages/space/`](../../packages/space/)

## 1. Summary

- **Epic.** SPACE-06 -- Workspace init lifecycle (P1)
- **Phase.** Later (see [`docs/roadmap.md`](../../docs/roadmap.md))
- **Priority.** P1
- **Estimate.** 25 points across 7 stories

**Scope.** Make workspace initialisation idempotent and repairable with
`git init`-style semantics. Both `create-space` and the new `space init`
subcommand become safe to run inside an existing directory. Three
workspace states are distinguished (greenfield, partial, complete);
partial and complete states receive an idempotent render (skip-if-exists
per file, additive YAML merge for `.space/config`). Authored content is
never overwritten. Both commands print a status line matching
`git init` / `git init --reinitialize` semantics.

**Out of scope (this WP).** `--mode embedded` layout (SPACE-11);
rewriting authored Markdown (manual upgrade path); profile-aware
template selection (SPACE-10).

**Deliverables.** See [`./design.md`](design.md) §3 for the full file
list.

**Dependencies.** SPACE-02 skill set is stable (determines which keys
belong in `.space/config` and which template files are expected).
SPACE-01 platform substrate (existing `create-space` scaffold and
`space` CLI) is the base.

**Downstream consumers.** SPACE-11 (embedded layout) depends on the
init lifecycle understanding both layout modes.

## 2. Conventions

| Convention | Value |
| --- | --- |
| Story ID | `SPACE-06-{nn}` (e.g. `SPACE-06-01`) |
| Status | Not started, In progress, In review, Done, Blocked |
| Priority | P0, P1, P2 |
| Estimation | Fibonacci story points |
| Acceptance format | EARS + Gherkin per `docs/design/space-artefact-model.md` §5.3 |
| Test framework | Vitest |
| Packages touched | `@tpw/create-space`, `@tpw/space` |

## 3. Stories

### Stream 1 -- Workspace state detection

- [ ] **[SPACE-06-01] `detectWorkspaceState` utility in `create-space`**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Epic:** SPACE-06 | **Labels:** phase:later, domain:platform, type:new-util
  - **Depends on:** -
  - **Deliverable:** New `packages/create-space/src/helpers/workspace-state.ts`
    exporting `WorkspaceState` (`'greenfield' | 'partial' | 'complete'`)
    and `detectWorkspaceState(targetDir: string): Promise<WorkspaceState>`.
    `greenfield` = dir does not exist, or exists and has no files.
    `partial` = dir exists with files, no `.space/config`.
    `complete` = dir exists and has a readable `.space/config`.
    New `workspace-state.test.ts` with unit coverage for all three
    branches using tmp directories.
    `packages/create-space/src/helpers/validate.ts` updated to remove
    the `isFolderEmpty` rejection branch; `validate.test.ts` updated to
    match the new contract (non-empty directories no longer rejected).
  - **Design:** [`./design.md#41-workspace-state-type`](design.md#41-workspace-state-type)
  - **Acceptance (EARS):**
    - WHEN `detectWorkspaceState` is called with a path that does not
      exist, THE SYSTEM SHALL return `'greenfield'`.
    - WHEN `detectWorkspaceState` is called with a path to an empty
      directory, THE SYSTEM SHALL return `'greenfield'`.
    - WHEN `detectWorkspaceState` is called with a path to a directory
      that contains files but no `.space/config`, THE SYSTEM SHALL
      return `'partial'`.
    - WHEN `detectWorkspaceState` is called with a path to a directory
      that contains a `.space/config` file, THE SYSTEM SHALL return
      `'complete'`.
    - WHEN `validateTargetDir` is called with a non-empty directory that
      is writable and is a directory, THE SYSTEM SHALL return
      `{ valid: true }`.
    - WHEN `pnpm test` runs, THE SYSTEM SHALL pass all `workspace-state`
      and updated `validate` tests.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Non-existent directory is greenfield
      Given a path that does not exist on disk
      When detectWorkspaceState is called with that path
      Then the result is 'greenfield'

    Scenario: Directory with files but no config is partial
      Given a directory containing a README.md but no .space/config
      When detectWorkspaceState is called with that path
      Then the result is 'partial'

    Scenario: Directory with .space/config is complete
      Given a directory containing a .space/config file
      When detectWorkspaceState is called with that path
      Then the result is 'complete'

    Scenario: Non-empty directory is no longer rejected by validateTargetDir
      Given a writable directory containing files
      When validateTargetDir is called with that path
      Then the result is { valid: true }
    ```

### Stream 2 -- Idempotent template rendering

- [ ] **[SPACE-06-02] Idempotent template renderer in `create-space`**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Epic:** SPACE-06 | **Labels:** phase:later, domain:platform, type:evolve
  - **Depends on:** SPACE-06-01 (workspace state type used in mode routing)
  - **Deliverable:** `renderTemplate` in `packages/create-space/src/template.ts`
    gains an optional `mode: 'greenfield' | 'idempotent'` parameter
    (defaults to `'greenfield'`). In `'idempotent'` mode: every file is
    skipped if it already exists at the destination, except `.space/config`.
    For `.space/config`: existing YAML is read, new top-level keys from the
    template are merged in additively, existing key values are not changed,
    and the merged result is written back. `template.test.ts` extended with
    idempotent-mode scenarios.
  - **Design:** [`./design.md#43-updated-rendertemplate-contract`](design.md#43-updated-rendertemplate-contract)
  - **Acceptance (EARS):**
    - WHEN `renderTemplate` is called in `'idempotent'` mode and a file
      already exists at the destination, THE SYSTEM SHALL NOT overwrite
      that file.
    - WHEN `renderTemplate` is called in `'idempotent'` mode for
      `.space/config` and the file already exists, THE SYSTEM SHALL
      merge new template keys into the existing YAML without removing or
      changing any existing keys or their values.
    - WHEN `renderTemplate` is called in `'idempotent'` mode and the
      destination does not contain a given file, THE SYSTEM SHALL write
      that file (same as greenfield mode).
    - WHEN `renderTemplate` is called in `'greenfield'` mode, THE SYSTEM
      SHALL behave identically to the existing implementation (all files
      always written).
    - WHEN `pnpm test` runs, THE SYSTEM SHALL pass all new and existing
      `template` tests.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Existing authored file is not overwritten
      Given a workspace with docs/conventions/definition-of-done.md already present
      And the file contains custom content added after initial scaffold
      When renderTemplate runs in idempotent mode
      Then docs/conventions/definition-of-done.md still contains the custom content
      And its mtime is unchanged

    Scenario: New template key is merged into existing config
      Given a .space/config with project.name already set
      And a new template adds a workspace.runs key that is absent from the existing config
      When renderTemplate runs in idempotent mode for .space/config
      Then workspace.runs is present in the output config
      And project.name retains its original value

    Scenario: Greenfield mode writes all files unconditionally
      Given an empty target directory
      When renderTemplate runs in greenfield mode
      Then all template files are written to the target directory
    ```

### Stream 3 -- Orchestrator update

- [ ] **[SPACE-06-03] `createSpace` orchestrator: three-state branching + status line**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Epic:** SPACE-06 | **Labels:** phase:later, domain:platform, type:evolve
  - **Depends on:** SPACE-06-01, SPACE-06-02
  - **Deliverable:** `createSpace` in `packages/create-space/src/create-space.ts`
    updated to call `detectWorkspaceState` after `validateTargetDir` and
    branch on the result. Greenfield path unchanged in behaviour.
    Partial and complete paths call `renderTemplate('idempotent')`,
    `ensurePackageJsonDeps()` (new local helper that additively adds
    `@tpw/space` and `@tpw/skills` to `devDependencies` in the target's
    `package.json` if not already present), `createAgentDirs()` (already
    idempotent via `forceSymlink`), and `tryInstall()`.
    Status line printed after workspace is consistent:
    - `Initialized empty Space workspace in <abs>/.space/`
    - `Reinitialized existing Space workspace in <abs>/.space/`
    Snapshot test in `snapshot.test.ts` updated to cover the reinit path.
  - **Design:** [`./design.md#51-create-space-three-paths`](design.md#51-create-space-three-paths)
  - **Acceptance (EARS):**
    - WHEN `createSpace` is called against a greenfield directory, THE
      SYSTEM SHALL print `Initialized empty Space workspace in` followed
      by the absolute path with `/.space/` appended.
    - WHEN `createSpace` is called against a partial or complete
      directory, THE SYSTEM SHALL print `Reinitialized existing Space
      workspace in` followed by the absolute path with `/.space/`
      appended.
    - WHEN `createSpace` is called against a complete workspace, THE
      SYSTEM SHALL NOT overwrite any Markdown file that already exists.
    - WHEN `createSpace` is called against a partial workspace, THE
      SYSTEM SHALL ensure `package.json` in the target lists `@tpw/space`
      and `@tpw/skills` as `devDependencies` after the run.
    - WHEN `createSpace` is called against a complete workspace, THE
      SYSTEM SHALL ensure `.cursor/skills` and `.claude/skills` symlinks
      point to `../node_modules/@tpw/skills` after the run.
    - WHEN `pnpm test` runs, THE SYSTEM SHALL pass all updated snapshot
      and integration tests.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Greenfield run prints Initialized message
      Given a target directory that does not exist
      When createSpace is called
      Then stdout contains "Initialized empty Space workspace in"
      And all template files are present in the target directory

    Scenario: Reinit of complete workspace does not destroy authored content
      Given a complete workspace with a custom docs/conventions/definition-of-done.md
      When createSpace is called against that workspace
      Then stdout contains "Reinitialized existing Space workspace in"
      And docs/conventions/definition-of-done.md still contains the custom content

    Scenario: Reinit ensures dependencies
      Given a partial workspace whose package.json does not list @tpw/space
      When createSpace is called against that workspace
      Then package.json devDependencies contains @tpw/space and @tpw/skills after the run
    ```

### Stream 4 -- `space init` subcommand

- [ ] **[SPACE-06-04] `space init` subcommand in `@tpw/space`**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Epic:** SPACE-06 | **Labels:** phase:later, domain:platform, type:new-command
  - **Depends on:** SPACE-06-01 (workspace state contract established; logic duplicated here)
  - **Deliverable:** New `packages/space/src/commands/init.ts` exporting
    `registerInitCommand(program: Command): void`. New
    `packages/space/src/helpers/workspace-state.ts` duplicating the
    minimal detection logic (no imports from `@tpw/create-space`).
    `packages/space/src/index.ts` updated to register the init command.
    The command resolves `targetDir` from `process.cwd()`, detects
    workspace state, renders the minimal `.space/config` template and
    `package.json` stanza for partial/complete states, ensures agent
    symlinks, runs package install, and prints the status line.
    A minimal `packages/space/template/.space/config` is added for use
    by `space init` (contains only the config skeleton; no full workspace
    template duplication).
  - **Design:** [`./design.md#52-space-init-three-paths`](design.md#52-space-init-three-paths)
  - **Acceptance (EARS):**
    - WHEN `space init` is run in a greenfield directory, THE SYSTEM
      SHALL create `.space/config`, ensure `package.json` deps, create
      agent symlinks, and print `Initialized empty Space workspace in`.
    - WHEN `space init` is run in a partial or complete directory, THE
      SYSTEM SHALL NOT overwrite existing `.space/config` values, SHALL
      ensure `package.json` deps, SHALL recreate agent symlinks, and
      SHALL print `Reinitialized existing Space workspace in`.
    - WHEN `space init` is run in a complete workspace, THE SYSTEM SHALL
      exit 0 and print the reinit status line with no errors.
    - THE SYSTEM SHALL NOT import any module from `@tpw/create-space` at
      runtime.
    - WHEN `pnpm build` runs, THE SYSTEM SHALL compile without type
      errors.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: space init in a complete workspace is safe to rerun
      Given a fully initialised workspace with .space/config and authored docs
      When space init is run from that workspace root
      Then the exit code is 0
      And stdout contains "Reinitialized existing Space workspace in"
      And no authored file is modified

    Scenario: space init in a partial workspace adds missing config
      Given a directory with a README.md but no .space/config
      When space init is run from that directory
      Then .space/config is created
      And package.json devDependencies includes @tpw/space and @tpw/skills
      And stdout contains "Initialized empty Space workspace in"

    Scenario: space init does not depend on @tpw/create-space
      Given the compiled packages/space/dist/
      When the import graph is inspected
      Then no module in packages/space imports from @tpw/create-space
    ```

### Stream 5 -- Tests and release

- [ ] **[SPACE-06-05] Integration tests: three workspace states in `create-space`**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Epic:** SPACE-06 | **Labels:** phase:later, domain:platform, type:test
  - **Depends on:** SPACE-06-01, SPACE-06-02, SPACE-06-03
  - **Deliverable:** Integration tests in `packages/create-space/` (within
    `snapshot.test.ts` or a new `integration.test.ts`) that spin up
    temporary directories in each of the three states, call `createSpace`,
    and assert: correct status line, correct file presence, no authored
    file loss, config merge correctness, symlink presence. Tests run
    without network (install skipped via `skipInstall: true`).
  - **Design:** [`./design.md#8-testing-strategy`](design.md#8-testing-strategy)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL have a test covering the greenfield state that
      asserts all template files are created and the status line contains
      `Initialized empty`.
    - THE SYSTEM SHALL have a test covering the partial state that asserts
      existing files are not overwritten, new template files are added,
      and the status line contains `Reinitialized existing`.
    - THE SYSTEM SHALL have a test covering the complete state that
      asserts no authored Markdown is overwritten and the config merge
      preserves existing values.
    - WHEN `pnpm test` runs, THE SYSTEM SHALL pass all three integration
      tests.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Greenfield integration test passes
      Given a temporary directory that does not exist
      When createSpace is invoked with skipInstall: true
      Then all template files are present
      And the status line contains "Initialized empty Space workspace in"
      And the test exits with no assertion failures

    Scenario: Partial state integration test passes
      Given a temporary directory containing a README.md and no .space/config
      When createSpace is invoked with skipInstall: true
      Then README.md content is unchanged
      And .space/config is created
      And the status line contains "Reinitialized existing Space workspace in"

    Scenario: Complete state integration test preserves authored content
      Given a temporary directory with a valid .space/config and a custom definition-of-done.md
      When createSpace is invoked with skipInstall: true
      Then definition-of-done.md content is unchanged
      And .space/config retains its original project.name value
    ```

- [ ] **[SPACE-06-06] Integration tests: `space init` in `@tpw/space`**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Epic:** SPACE-06 | **Labels:** phase:later, domain:platform, type:test
  - **Depends on:** SPACE-06-04
  - **Deliverable:** `packages/space/src/commands/init.test.ts` with
    integration tests for `space init` in all three states. Tests use
    temporary directories with `skipInstall` equivalent. Assert: exit
    code 0, correct status line, file state, no authored content loss.
  - **Design:** [`./design.md#8-testing-strategy`](design.md#8-testing-strategy)
  - **Acceptance (EARS):**
    - THE SYSTEM SHALL have tests for `space init` covering greenfield,
      partial, and complete states.
    - WHEN `pnpm test` runs from the repo root, THE SYSTEM SHALL pass all
      `init.test.ts` tests.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: space init integration tests cover all three states
      Given tests in packages/space/src/commands/init.test.ts
      When pnpm test runs
      Then three tests pass: greenfield, partial, complete
      And each test asserts the correct status line and file state
    ```

- [ ] **[SPACE-06-07] Changeset + smoke validation**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Epic:** SPACE-06 | **Labels:** phase:later, domain:platform, type:release
  - **Depends on:** SPACE-06-01, SPACE-06-02, SPACE-06-03, SPACE-06-04,
    SPACE-06-05, SPACE-06-06
  - **Deliverable:** `pnpm changeset` entries for `@tpw/create-space`
    (minor -- new `space init`-style idempotent reinit behaviour) and
    `@tpw/space` (minor -- new `space init` subcommand). `pnpm validate`
    passes from the repo root. Smoke validation: `space init` run against
    a partially-initialised workspace (e.g. `carinyaforce-space`) confirms
    the success condition: workspace becomes fully operational, no authored
    content lost, status line correct.
  - **Design:** [`./design.md#10-handoff`](design.md#10-handoff)
  - **Acceptance (EARS):**
    - WHEN `pnpm validate` runs from the monorepo root, THE SYSTEM SHALL
      exit 0 (install, build, typecheck, lint, test all pass).
    - THE SYSTEM SHALL have a changeset entry for `@tpw/create-space`
      describing the new idempotent init behaviour.
    - THE SYSTEM SHALL have a changeset entry for `@tpw/space` describing
      the new `space init` subcommand.
    - WHEN `space init` is run against `carinyaforce-space`, THE SYSTEM
      SHALL print `Reinitialized existing Space workspace in` and exit 0
      with no authored content modified.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Full monorepo validation passes
      Given all SPACE-06 stories complete
      When pnpm validate runs from the monorepo root
      Then the command exits with code 0
      And both packages have changeset entries

    Scenario: Smoke validation against carinyaforce-space succeeds
      Given carinyaforce-space as a partially-initialised workspace
      When space init is run from that workspace root
      Then the exit code is 0
      And the status line contains "Reinitialized existing Space workspace in"
      And no authored Markdown file is modified
    ```

## 4. Traceability

### Stories to design sections

| Story | `./design.md` section |
| --- | --- |
| SPACE-06-01 | §4.1 WorkspaceState type; §4.2 validateTargetDir contract |
| SPACE-06-02 | §4.3 renderTemplate contract |
| SPACE-06-03 | §5.1 create-space three paths; §4.4 status reporter |
| SPACE-06-04 | §5.2 space init three paths |
| SPACE-06-05 | §8 Testing strategy; §9 Acceptance gates |
| SPACE-06-06 | §8 Testing strategy |
| SPACE-06-07 | §10 Handoff |

### Stories to product outcomes

| Story | Outcome (from [`docs/product.md`](../../docs/product.md)) |
| --- | --- |
| SPACE-06-01 .. 04 | "Any team can stand up an agent-capable workspace from a single command" -- extended to: any team can repair an existing workspace with a single command |
| SPACE-06-03, 04 | Success condition: partially-initialised workspace becomes fully operational with no manual file edits and no loss of authored content |
| SPACE-06-07 | Platform quality gate: `pnpm validate` confirms zero regressions |

## 5. Definition of Done

A story in this backlog is done when:

- [ ] All EARS acceptance statements hold and every Gherkin scenario passes.
- [ ] `pnpm validate` passes from the monorepo root (install, build, typecheck, lint, test).
- [ ] No authored Markdown file is overwritten by either command in any test scenario.
- [ ] Changeset created (`pnpm changeset`) for any change to `packages/create-space/` or `packages/space/`.
- [ ] PR merged into `main`.

The epic (SPACE-06) is done when every story is done **and** the smoke
validation against `carinyaforce-space` (or equivalent partially-initialised
workspace) confirms the success condition.

## 6. Dependency graph

```text
SPACE-06-01 (detectWorkspaceState + validateTargetDir)
  +-- SPACE-06-02 (idempotent template renderer)
  |     +-- SPACE-06-03 (createSpace orchestrator update)
  |           +-- SPACE-06-05 (create-space integration tests)
  |                 +-- SPACE-06-07 (changeset + smoke)
  +-- SPACE-06-04 (space init subcommand)
        +-- SPACE-06-06 (space init integration tests)
              +-- SPACE-06-07
```

SPACE-06-01 is the entry dependency. SPACE-06-02 and SPACE-06-04 can
run in parallel once SPACE-06-01 is done. SPACE-06-07 is the release
gate.

## 7. Risks (delivery-scoped)

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Additive YAML merge is brittle for multi-level config structures | Medium | Medium | Use a depth-first merge that preserves all existing values; test with real `carinyaforce-space` config shape |
| R2 | `space init` template copy in `@tpw/space` drifts from `create-space` template | Low | Medium | Document the copy in both AGENTS.md files; add a lint check in CI (SPACE-03) |
| R3 | `ensurePackageJsonDeps` breaks workspaces that pin versions | Low | Medium | Only add if not present; never change an existing version specifier |
| R4 | Smoke validation against `carinyaforce-space` reveals undocumented config keys | Medium | Low | Merge is additive-only; unknown existing keys are preserved by design |

## 8. Handoff

When SPACE-06 closes:

- `@tpw/create-space` accepts existing directories (greenfield, partial,
  complete) without refusing.
- `@tpw/space` ships a `space init` subcommand with the same idempotent
  behaviour.
- All three workspace states are covered by integration tests.
- `carinyaforce-space` (or equivalent) is confirmed operational after
  one `space init` run.

Next work package: [`docs/work/11-embedded/`](../11-embedded/) --
SPACE-11: `--mode embedded` on `create-space` and `space init`.
