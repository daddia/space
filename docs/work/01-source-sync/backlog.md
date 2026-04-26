---
type: Backlog
scope: work-package
work_package: 01-source-sync
epic: EPIC-01
product: space
version: '1.1'
owner: daddia
status: In progress
last_updated: 2026-04-23
sources:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
---

# Backlog -- Source Sync Foundation (EPIC-01)

Sprint-level backlog for the **Source Sync Foundation** work package
at `work/01-source-sync/`, which implements EPIC-01 from
`docs/backlog.md`. This artifact is the source of truth for
story-level scope, acceptance criteria, and delivery tracking.

Validation target is `storefront-space`, which provides a real Jira
project (STORE) and Confluence space (STOREFRONT) to test against.

## 1. Summary

**Epic:** EPIC-01 -- Source Sync Foundation
**Phase:** Now (see `docs/roadmap.md`)
**Priority:** P0 (source sync), P1 (template hardening + validation), P2 (CI quality)
**Estimate:** 43 points across 16 stories

**Scope:** Implement the `@daddia/space` source sync commands (Jira and
Confluence pull), harden the `@daddia/create-space` template to include
`.space/` config and `@daddia/space` as a dependency, and validate end-to-end
in `storefront-space` by committing the first real source mirrors.

**Current state:**

| Package             | Version | Status                                                                       |
| ------------------- | ------- | ---------------------------------------------------------------------------- |
| `@daddia/skills`       | 0.2.0   | Complete -- 16 skills, `sync-skills` bin fully implemented                   |
| `@daddia/create-space` | 0.1.1   | Mostly complete -- template missing `.space/`, `@daddia/space` dep, npm scripts |
| `@daddia/space`        | 0.1.0   | CLI stubs only -- all commands print "not yet implemented"                   |

**Out of scope (this work package):**

- `space publish confluence` (write-back) -- EPIC-05
- `space publish jira` -- EPIC-04
- Slack and Vercel sources -- EPIC-07
- Incremental sync (phase 1 is full-refresh) -- EPIC-08
- Multi-project Jira sync -- EPIC-08

**Deliverables:**

- `@daddia/space` Jira sync: `space sync jira` pulls STORE into
  `.space/sources/jira/`
- `@daddia/space` Confluence sync: `space sync confluence` pulls
  STOREFRONT into `.space/sources/confluence/`
- `@daddia/space` unit + integration test suite passing in CI
- `@daddia/create-space` template producing a workspace with
  `.space/config`, `@daddia/space` devDep, and working `sync` script
- `storefront-space` first committed source mirrors
  (`.space/sources/jira/`, `.space/sources/confluence/`)

**Dependencies:** None -- `@daddia/skills` and `@daddia/create-space` base
implementations are complete.

**Downstream consumers:**

- `storefront-space` (validation environment)
- `@daddia/space` (reads `.space/sources/` at execution time)
- Any new workspace scaffolded after the template fix
- EPIC-02 onward (build on top of the sync substrate this WP
  establishes)

## 2. Conventions

| Convention         | Value                                              |
| ------------------ | -------------------------------------------------- |
| Story ID format    | `SPACE-{nn}` (e.g. `SPACE-01`)                     |
| Status values      | Not started, In progress, In review, Done, Blocked |
| Priority levels    | P0 (must have), P1 (should have), P2 (stretch)     |
| Estimation         | Fibonacci story points (1, 2, 3, 5, 8, 13)         |
| Test framework     | Vitest                                             |
| HTTP mocking       | msw (Mock Service Worker) for integration tests    |
| Definition of Done | See section 5                                      |

## 3. Stories

### Stream 1 -- `@daddia/space` foundation

- [x] **[SPACE-01] Config and credentials layer**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Deliverable:** `src/config.ts` loads and validates `.space/config`; `src/credentials.ts` loads and validates `.env` credentials for each provider.
  - **Acceptance:**
    - [ ] `config.ts` walks up from `process.cwd()` to find `.space/config`; exits non-zero with `"Run from inside a space workspace"` if not found
    - [ ] Parsed config satisfies the `WorkspaceConfig` TypeScript interface; unknown extra keys are allowed (forward-compatible)
    - [ ] `credentials.ts` loads `.env` via `dotenv`; returns typed credential objects for `jira` and `confluence`; throws a descriptive error listing missing variable names when required vars are absent
    - [ ] `pnpm typecheck` passes with no `any`; `pnpm test` passes

- [x] **[SPACE-02] Atomic write helper**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 2
  - **Deliverable:** `src/fs.ts` with `atomicWrite(destDir, writer)` that buffers output to a `.tmp` sibling and renames on success.
  - **Acceptance:**
    - [ ] On success the `.tmp` directory is renamed to `destDir` and does not remain on disk
    - [ ] On failure (writer throws) the existing `destDir` is untouched and `.tmp` is left in place for inspection
    - [ ] `atomicWrite` is idempotent -- calling it twice in succession produces the same `destDir` contents
    - [ ] Unit tests cover success path, failure path, and idempotent re-run

### Stream 2 -- Jira sync

- [x] **[SPACE-03] Jira REST client**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Deliverable:** `src/providers/jira/client.ts` -- typed HTTP client for Jira REST API v3 with pagination and retry.
  - **Acceptance:**
    - [ ] `searchIssues({ jql, fields, pageSize })` paginates via `startAt` offset until `total` is exhausted; returns a single flat array of all issues
    - [ ] Retries on HTTP 429 with exponential back-off: 1 s, 2 s, 4 s; gives up after 3 retries and throws
    - [ ] Throws a typed `JiraAuthError` on 401 or 403 (no retry)
    - [ ] Uses Basic Auth (`user:apiToken` base64) constructed from the credentials object
    - [ ] Unit tests cover pagination across 3 pages, 429 retry, and 401 error using msw fixtures

- [x] **[SPACE-04] Jira sync command**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Deliverable:** `src/providers/jira/sync.ts` and wired `space sync jira` command; writes all four output files atomically.
  - **Acceptance:**
    - [ ] `space sync jira` reads `.space/config` and `.env`, fetches all issues for the configured project, and writes `.space/sources/jira/{issues,epics,links,meta}.json`
    - [ ] `issues.json` is a `JiraIssue[]` sorted ascending by issue key; native Jira REST v3 shape; `description` field preserved as ADF
    - [ ] `epics.json` is the subset of issues where `fields.issuetype.name === 'Epic'`; same sort order
    - [ ] `links.json` is a deduped flat array of all `fields.issuelinks` entries across all issues
    - [ ] `meta.json` contains `sync_at` (ISO 8601), `project`, `jql`, and `counts` (`total`, `epics`, `stories`, `bugs`)
    - [ ] All four files are written atomically via `atomicWrite`; a simulated write failure leaves the existing mirror intact
    - [ ] `space sync jira` exits 0 on success; exits non-zero on auth failure or network error with a message to stderr

- [ ] **[SPACE-05] Jira sync integration tests**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Dependencies:** SPACE-03, SPACE-04
  - **Deliverable:** `src/providers/jira/sync.test.ts` with msw-recorded fixtures covering the full sync lifecycle.
  - **Acceptance:**
    - [ ] Happy-path test: 150 issues across 2 pages; output files match expected shapes and counts
    - [ ] Idempotency test: running sync twice produces byte-identical `issues.json`
    - [ ] 429 retry test: first two requests return 429; third succeeds; sync completes normally
    - [ ] Auth failure test: 401 on first request; command exits non-zero; no output files written
    - [ ] All tests pass in `pnpm test` with no live network calls (`msw` intercepts all fetches)

### Stream 3 -- Confluence sync

- [ ] **[SPACE-06] Confluence REST client**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Deliverable:** `src/providers/confluence/client.ts` -- typed HTTP client for Confluence REST API v2.
  - **Acceptance:**
    - [ ] `listPages({ spaceKey, limit })` paginates via cursor until all pages are returned; returns flat array of page summaries
    - [ ] `getPage({ id })` fetches a single page with `body-format=storage`; returns the page object including `body.storage.value` (XHTML string)
    - [ ] Page fetches are run concurrently with a configurable cap (default 5); accepts a `concurrency` option
    - [ ] Retries on 429 with same back-off as the Jira client (1 s, 2 s, 4 s, max 3)
    - [ ] Throws a typed `ConfluenceAuthError` on 401 or 403
    - [ ] Unit tests cover pagination, concurrency cap, 429 retry, and 401 error

- [ ] **[SPACE-07] Confluence sync command**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Deliverable:** `src/providers/confluence/sync.ts` and wired `space sync confluence` command; writes mirror atomically.
  - **Acceptance:**
    - [ ] `space sync confluence` fetches all pages in the configured space and writes `.space/sources/confluence/pages/{id}.xhtml` and `pages/{id}.meta.json` for each page
    - [ ] `{id}.xhtml` contains the raw Confluence storage XHTML string, byte-identical to the API response
    - [ ] `{id}.meta.json` contains `id`, `title`, `parentId`, `spaceKey`, `labels`, `version`, and `sync_at`
    - [ ] `index.json` maps each `pageId` to `{ title, parentId }`
    - [ ] `meta.json` contains `sync_at`, `space`, and `counts.total`
    - [ ] Pages present in the existing mirror but absent from the current upstream response are deleted from the mirror on sync
    - [ ] All output is written atomically via `atomicWrite`
    - [ ] Command exits 0 on success; exits non-zero on auth failure

- [ ] **[SPACE-08] Confluence sync integration tests**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Dependencies:** SPACE-06, SPACE-07
  - **Deliverable:** `src/providers/confluence/sync.test.ts` with msw fixtures.
  - **Acceptance:**
    - [ ] Happy-path test: 30 pages across 2 list pages; output files match expected shapes
    - [ ] Stale page deletion test: second sync removes a page absent from the current fixture
    - [ ] Idempotency test: two successive syncs produce byte-identical XHTML files
    - [ ] 429 retry test: page list returns 429 twice before succeeding; sync completes
    - [ ] All tests pass in `pnpm test` with no live network calls

- [ ] **[SPACE-09] `space sync` all-sources dispatch**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 2
  - **Dependencies:** SPACE-04, SPACE-07
  - **Deliverable:** `space sync` (no provider argument) dispatches to all configured sources in `.space/config`.
  - **Acceptance:**
    - [ ] `space sync` reads `sources` from `.space/config` and dispatches sequentially to each configured provider
    - [ ] Progress line printed to stdout before each provider sync (`syncing jira...`, `syncing confluence...`)
    - [ ] If any provider sync fails, the command continues with remaining providers and exits non-zero after all complete
    - [ ] If no sources are configured, prints a helpful message and exits 0
    - [ ] Unit test covers: two sources succeed; one source fails (correct exit code); no sources configured

### Stream 4 -- `@daddia/create-space` template hardening

- [ ] **[SPACE-10] Add `.space/` to scaffold template**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Deliverable:** `template/default/.space/` directory with `config`, `team`, and `raci` files; `package.json` updated with `@daddia/space` and npm scripts.
  - **Acceptance:**
    - [ ] `template/default/.space/config` exists; interpolates `{projectName}` and `{projectKey}` into the `project` block; `sources` block is present but commented out
    - [ ] `template/default/.space/team` exists as an empty roster template with field headings
    - [ ] `template/default/.space/raci` exists as an empty RACI skeleton
    - [ ] `template/default/package.json` includes `@daddia/space` as a `devDependency` (version `"*"` or latest)
    - [ ] `template/default/package.json` includes `"postinstall": "sync-skills"` and `"sync": "space sync"` npm scripts
    - [ ] `create-space.ts` success output references `.space/config` not `.space/config`
    - [ ] Snapshot tests are updated to reflect the new template output
    - [ ] `pnpm build && pnpm typecheck && pnpm test` all pass

- [ ] **[SPACE-11] `create-space` full scaffold integration test**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Dependencies:** SPACE-10
  - **Deliverable:** Integration test that scaffolds into a temp directory and asserts the complete output tree and file contents.
  - **Acceptance:**
    - [ ] Test runs `createSpace(config, { skipInstall: true, disableGit: true })` into `os.tmpdir()`
    - [ ] Asserts that `.space/config`, `.space/team`, `.space/raci` exist and contain no un-substituted template tokens (`{projectName}` etc.)
    - [ ] Asserts `package.json` includes `@daddia/space` devDependency and the `postinstall` and `sync` scripts
    - [ ] Asserts top-level directories `docs/`, `architecture/`, `work/` all exist
    - [ ] Test cleans up the temp directory on completion

### Stream 5 -- Validation in `storefront-space`

- [ ] **[SPACE-12] Install `@daddia/space` in `storefront-space`**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Deliverable:** `@daddia/space` installed in `storefront-space`; `.space/config` updated to match the canonical schema from `docs/solution.md`.
  - **Acceptance:**
    - [ ] `pnpm add -D @daddia/space` succeeds in `storefront-space`
    - [ ] `storefront-space/.space/config` includes `sources.issues` (Jira STORE) and `sources.docs` (Confluence STOREFRONT) blocks in the canonical format
    - [ ] `space sync --help` runs without error from `storefront-space/` root
    - [ ] `.env` in `storefront-space/` has `ATLASSIAN_BASE_URL`, `ATLASSIAN_USER`, and `ATLASSIAN_API_TOKEN` set (manual step; not committed)

- [ ] **[SPACE-13] Jira sync smoke test against STORE**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Dependencies:** SPACE-04, SPACE-12
  - **Deliverable:** `.space/sources/jira/` committed to `storefront-space` with a real STORE snapshot.
  - **Acceptance:**
    - [ ] `space sync jira` exits 0 from `storefront-space/` root with valid credentials
    - [ ] `.space/sources/jira/issues.json` exists, is valid JSON, and contains at least one issue with `key` starting with `STORE-`
    - [ ] `.space/sources/jira/meta.json` contains a valid `sync_at` timestamp and non-zero `counts.total`
    - [ ] Re-running `space sync jira` is idempotent: `git diff` produces no changes
    - [ ] `.space/sources/jira/` is committed with message `chore(sync): jira STORE @ {date}`

- [ ] **[SPACE-14] Confluence sync smoke test against STOREFRONT**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 2
  - **Dependencies:** SPACE-07, SPACE-12
  - **Deliverable:** `.space/sources/confluence/` committed to `storefront-space` with a real STOREFRONT snapshot.
  - **Acceptance:**
    - [ ] `space sync confluence` exits 0 from `storefront-space/` root with valid credentials
    - [ ] `.space/sources/confluence/pages/` contains at least one `.xhtml` file with non-empty Confluence storage XHTML
    - [ ] `.space/sources/confluence/index.json` maps page IDs to titles; all referenced page IDs have a corresponding `.xhtml` file
    - [ ] Re-running `space sync confluence` is idempotent: `git diff` produces no changes
    - [ ] `.space/sources/confluence/` is committed with message `chore(sync): confluence STOREFRONT @ {date}`

### Stream 6 -- `@daddia/skills` CI quality

- [ ] **[SPACE-15] Structural lint CI for skills**
  - **Status:** Not started | **Priority:** P2 | **Estimate:** 2
  - **Deliverable:** CI script `bin/lint-skills.js` that validates the structure and frontmatter of every skill directory.
  - **Acceptance:**
    - [ ] Script reads every subdirectory of the package root that does not start with `.` or `node_modules`
    - [ ] Fails if any such directory is missing `SKILL.md`
    - [ ] Fails if `SKILL.md` frontmatter is missing any of: `name`, `description`, `when_to_use`, `version`
    - [ ] Fails if `name` in frontmatter does not match the directory name
    - [ ] Script is added to the `validate` script in root `package.json`
    - [ ] All existing skills pass the lint

- [ ] **[SPACE-16] Path traversal protection in `sync-skills`**
  - **Status:** Not started | **Priority:** P2 | **Estimate:** 2
  - **Deliverable:** `sync-skills` validates all resolved destination paths are inside the workspace root before writing.
  - **Acceptance:**
    - [ ] A skill directory named `../escape` in the source is rejected; sync logs a warning and skips that skill
    - [ ] A skill directory named `../../etc/passwd` is rejected in the same way
    - [ ] Valid skill names (alphanumeric, hyphens) are not affected
    - [ ] Unit test covers the two rejection cases and a valid case

## 4. Traceability

### Stories to solution sections

Per `docs/solution.md`:

| Story    | `docs/solution.md` section                                          |
| -------- | ------------------------------------------------------------------- |
| SPACE-01 | 4.4 (@daddia/space) + 6.2 (`.space/config`) + 7.1 (credentials)        |
| SPACE-02 | 3 (atomic writes) + 5.3 (runtime)                                   |
| SPACE-03 | 4.4 (@daddia/space) + 5.3 (Jira sync) + 7.2 (error handling)           |
| SPACE-04 | 4.4 (@daddia/space) + 5.3 (Jira sync) + 6.3 (`.space/sources/` layout) |
| SPACE-05 | 7.4 (testing strategy)                                              |
| SPACE-06 | 4.4 (@daddia/space) + 5.4 (Confluence sync) + 7.2 (error handling)     |
| SPACE-07 | 4.4 (@daddia/space) + 5.4 (Confluence sync) + 6.3                      |
| SPACE-08 | 7.4 (testing strategy)                                              |
| SPACE-09 | 4.4 (@daddia/space) -- all-sources dispatch                            |
| SPACE-10 | 4.3 (@daddia/create-space) -- template layout                          |
| SPACE-11 | 7.4 (testing strategy) + 4.3                                        |
| SPACE-12 | 6.2 (`.space/config` schema)                                        |
| SPACE-13 | 6.3 (`.space/sources/` Jira layout) + 5.3                           |
| SPACE-14 | 6.3 (`.space/sources/` Confluence layout) + 5.4                     |
| SPACE-15 | 4.2 (@daddia/skills) -- structural lint                                |
| SPACE-16 | 7.1 (security -- path traversal)                                    |

### Stories to product outcomes

Per `docs/product.md` Section 7 (outcome metrics):

| Story          | Outcome                                                            |
| -------------- | ------------------------------------------------------------------ |
| SPACE-01 .. 09 | "Agent sessions that can reason over program context offline"      |
| SPACE-10, 11   | "Time from zero to a fully operational agent-ready workspace"      |
| SPACE-12 .. 14 | "Share of daddia workspaces scaffolded from Space"     |
| SPACE-15, 16   | "Skill improvements adopted across teams without manual migration" |

## 5. Definition of Done

A story in this backlog is done when:

- [ ] All acceptance criteria boxes are ticked
- [ ] Unit and integration tests pass locally (`pnpm test`) and in CI
- [ ] `pnpm typecheck` passes with no `any` (except where the Jira or
      Confluence API shapes require it, with a JSDoc comment)
- [ ] `pnpm lint` passes with no new warnings
- [ ] PR merged into `main`

The `@daddia/space` package is shippable when SPACE-01 through SPACE-09
are done and `pnpm validate` (install, build, typecheck, lint, test)
passes clean.

## 6. Dependency graph

```text
SPACE-01 (config + creds)
  +-- SPACE-03 (Jira client)
        +-- SPACE-04 (Jira sync cmd)
              +-- SPACE-05 (Jira tests)
              +-- SPACE-09 (all-sources dispatch) <-- SPACE-07

SPACE-02 (atomic write)
  +-- SPACE-04
  +-- SPACE-07

SPACE-06 (Confluence client)
  +-- SPACE-07 (Confluence sync cmd)
        +-- SPACE-08 (Confluence tests)

SPACE-10 (template .space/)
  +-- SPACE-11 (scaffold integration test)

SPACE-12 (install in storefront-space)
  +-- SPACE-13 (Jira smoke) <-- SPACE-04
  +-- SPACE-14 (Confluence smoke) <-- SPACE-07
```

## 7. Critical path

```text
SPACE-01 -> SPACE-02 -> SPACE-03 -> SPACE-04 -> SPACE-09 -> SPACE-12 -> SPACE-13
                     -> SPACE-06 -> SPACE-07 ->            SPACE-12 -> SPACE-14
```

SPACE-03 and SPACE-06 (Jira and Confluence clients) can be developed
in parallel once SPACE-01 and SPACE-02 are done. SPACE-04 and SPACE-07
can similarly run in parallel. The `storefront-space` validation
stream (SPACE-12 onwards) unblocks after both sync commands are
passing their integration tests.

## 8. Minimum viable slice

If scope pressure forces a cut, the smallest coherent release that
delivers value:

- **SPACE-01, SPACE-02** -- foundation
- **SPACE-03, SPACE-04, SPACE-05** -- Jira sync end-to-end
- **SPACE-12, SPACE-13** -- validated against real STORE data

Result: `space sync jira` works in `storefront-space` with committed
mirror. Confidence that the model is sound. Confluence sync
(SPACE-06 .. SPACE-08, SPACE-14) ships in the next slice.

## 9. Risks

| ID  | Risk                                                                                        | Likelihood | Impact | Mitigation                                                                                     |
| --- | ------------------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------- |
| R1  | Atlassian rate limiting on large Confluence spaces makes full sync slow or unreliable       | Medium     | Medium | Phase 1 uses concurrency cap 5; check page-count before starting; fall back to sequential      |
| R2  | Jira API field shapes differ between Atlassian Cloud versions; ADF structure may drift      | Low        | Medium | Store raw API response without type assertion on `description`; validate against STORE fixture |
| R3  | `storefront-space` Confluence space is large (>500 pages); first commit produces noisy diff | Medium     | Low    | Check page count with `?limit=1` before syncing; document expected commit size                 |
| R4  | `@daddia/space` not yet on npm; `create-space` template cannot reference a published version   | Low        | Medium | Use `"*"` as version in template; update to pinned version after first publish                 |
| R5  | Template change in SPACE-10 is a breaking change for workspaces scaffolded before it        | Low        | Low    | No production workspaces scaffolded yet; storefront-space was hand-built                       |

## 10. Handoff

When this work package is complete:

- `@daddia/space` sync commands are implemented, tested, and published.
- `@daddia/create-space` template produces a workspace with working
  `.space/config` and `space sync`.
- `storefront-space` has committed Jira and Confluence mirrors ready
  for agent consumption.
- `@daddia/space` can read `.space/sources/` without any changes (the
  content contract in `docs/solution.md` Section 6.3 is stable).

Next work packages (see `docs/backlog.md`):

- **EPIC-02** -- Space v2 artefact model: skill changeset (P0).
- **EPIC-04 / EPIC-05** -- Publish pipelines (Jira then Confluence).
- **EPIC-03** -- v2 tooling and router.
