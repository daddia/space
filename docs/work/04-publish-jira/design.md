---
type: Design
scope: work-package
mode: tdd
work_package: 04-publish-jira
epic: SPACE-04
product: space
version: '1.0'
owner: Horizon Platform
status: Draft
last_updated: 2026-04-26
related:
  - docs/product.md
  - docs/solution.md
  - docs/backlog.md
  - docs/design/space-artefact-model.md
  - docs/work/01-source-sync/backlog.md
  - docs/work/02-skills-v2/design.md
  - docs/work/04-publish-jira/backlog.md
---

# Design -- Publish pipeline: Jira (SPACE-04)

TDD-mode design for the **Publish pipeline: Jira** work package at
`docs/work/04-publish-jira/`, implementing SPACE-04 from
[`docs/backlog.md`](../../backlog.md).

This work package builds on the substrate the foundation sprint (SPACE-01)
shipped: `@tpw/space` CLI registration, `.space/config` loading, Atlassian
credential loading, atomic-write helpers, and the `space sync jira` Jira
mirror at `.space/sources/jira/`. The platform-wide patterns (atomic writes,
faithful upstream mirrors, opt-in write-back, single Atlassian credential
set, error philosophy) are authoritative in
[`docs/solution.md`](../../solution.md) and
[`docs/design/space-artefact-model.md`](../../design/space-artefact-model.md)
and are **not** repeated here. Section references appear inline throughout.

The validation target for this WP is `storefront-space`, which already runs
`space sync jira` against a real Atlassian tenant and whose `domain/cart/`
and `work/cart/` artefacts conform to the §5.3 schema.

## 1. Scope

### 1.1 In scope

Implement `space publish jira` per
[`docs/design/space-artefact-model.md`](../../design/space-artefact-model.md)
§6:

- **New command:** `space publish jira [--dry-run]` registered on the
  `@tpw/space` CLI. Reads domain and work-package backlogs, diffs against
  the local Jira mirror, and creates or updates Jira issues. Without
  `--dry-run` the plan is applied; with `--dry-run` the plan is printed and
  the run exits without calling Jira.
- **Source-aware behaviour.** Reads `issues.source` from `.space/config`.
  In `markdown` mode the publisher creates and updates issues and writes
  the Jira key back to a sidecar mapping. In `jira` mode the publisher
  refuses to create new issues and only reconciles updates against existing
  Jira keys. The two modes share one parser, one diff engine, and one Jira
  client; they differ only in how a "missing key" plan entry is handled.
- **Backlog parser.** Deterministic parser for the canonical story schema
  (artefact-model §5.3) and the canonical epic schema. Reads every file
  matching `domain/**/backlog.md` and `work/**/backlog.md` under the
  workspace root. Surfaces schema violations as exit-non-zero errors with
  file + line context. Used by `--dry-run` and by the live run.
- **Diff engine.** Computes the publish plan (creates / updates / no-ops)
  by comparing parsed local items to `.space/sources/jira/issues.json`.
  The mirror is the single source of remote state inside one run; the
  publisher does not call Jira during the plan phase.
- **Jira write client.** Extension to `providers/jira/client.ts`:
  `createIssue`, `updateIssue`, `createIssueLink`, `transitionIssue`. Uses
  the existing `searchIssues` retry / auth handling.
- **Sidecar mapping.** Read/write helpers for
  `.space/sources/jira/mapping.json` keyed by local ID. Atomic write per
  `solution.md` §3 strategy 4 ("atomic writes everywhere").
- **AC rendering.** Renders EARS + Gherkin into the Jira description
  payload (default placement) or as Jira sub-tasks (`ac_placement:
  subtasks`), per the `ac_placement` field in `.space/config`.
- **Refresh.** After a successful apply the publisher re-runs the same
  pull as `space sync jira` and overwrites `.space/sources/jira/` so the
  mirror reflects what landed in Jira (including new keys).
- **Validation.** End-to-end smoke test against `storefront-space` in
  `markdown` source mode (a sandbox Jira project) and `jira` source mode
  (the live STORE project, dry-run only).

### 1.2 Out of scope

- `space publish confluence` for prose docs -- SPACE-05 (separate WP).
- Multi-project Jira (multiple `sources.issues` blocks) -- SPACE-08.
- Incremental publish (only push items whose `Status` field changed since
  the last run) -- deferred; the diff engine is full-refresh.
- Workflow transition mapping for Jira projects whose statuses differ
  from `Not started / In progress / In review / Done / Blocked` -- the
  status set in this WP is the canonical set in
  [`docs/backlog.md`](../../backlog.md) §2; teams with custom workflows
  configure a status map in a follow-up WP.
- ADR / decision-register publishing. Only `domain/{d}/backlog.md` and
  `work/**/backlog.md` are emitted to Jira this WP.
- Issue **deletion** when a Markdown story is removed. The publisher
  warns and skips; remote cleanup is a manual operation.
- Roadmap publish to Jira Plans (`Initiative` issuetype, fix versions,
  phases). Listed in artefact-model §6.1 but deferred behind validation
  of the epic + story flow.

### 1.3 Capabilities this work package delivers

Mapped to story-level AC in [`./backlog.md`](backlog.md):

- **Backlog parser** (epics + stories, schema enforcement): SPACE-04-01.
- **Plan phase** (parse + diff + dry-run output): SPACE-04-02.
- **Sidecar mapping** (read/write `.space/sources/jira/mapping.json`):
  SPACE-04-03.
- **Jira write client** (`createIssue`, `updateIssue`, `createIssueLink`,
  `transitionIssue`): SPACE-04-04.
- **Markdown-source apply** (creates + updates + key write-back): SPACE-04-05.
- **Jira-source apply** (updates only; refuses creates): SPACE-04-06.
- **AC rendering** (description + sub-tasks placement): SPACE-04-07.
- **Post-apply mirror refresh**: SPACE-04-08.
- **CLI wiring + integration tests against msw fixtures**: SPACE-04-09.
- **`storefront-space` validation smoke**: SPACE-04-10.

## 2. Architecture fit

This WP adds one new command (`publish jira`) and one new parsing module to
`@tpw/space`. It introduces no new packages, no new external dependencies
beyond what is already in `package.json`, and no new top-level patterns:
the publisher reuses the atomic-write, credential, and Jira-client
infrastructure that SPACE-01 shipped.

```text
space CLI (Commander)
  +-- sync     ({SPACE-01}, KEEP)
  +-- publish  (THIS WP)
        +-- jira [--dry-run]
              |
              +-- loadConfig()              ({SPACE-01}, EVOLVE: parses issues:)
              +-- loadCredentials()          ({SPACE-01}, KEEP)
              +-- parseBacklogs(root)        (NEW)
              +-- loadMirror(root)           (NEW: reads .space/sources/jira/issues.json)
              +-- loadMapping(root)          (NEW)
              +-- planPublish(items, mirror, mapping, mode)  (NEW)
              +-- if --dry-run: printPlan(); exit 0
              +-- applyPlan(plan, jiraClient, mode)          (NEW)
              +-- writeMapping(updatedMapping)               (NEW)
              +-- syncJira()  -- mirror refresh              ({SPACE-01}, KEEP)
```

References in [`docs/solution.md`](../../solution.md):

- §3 Strategy 3 (faithful upstream mirrors): the publisher uses the
  existing `.space/sources/jira/` mirror as its diff basis -- the schema
  and field shapes match what the API returned.
- §3 Strategy 4 (atomic writes): mapping write and post-apply mirror
  refresh both go through `atomicWrite()`.
- §3 Strategy 5 (opt-in write-back): a publish run requires
  `issues.source` and `issues.project` to be set in `.space/config`. The
  default for any authored doc remains workspace-local.
- §4.4 (`@tpw/space` source layout): `commands/publish.ts` and the new
  files under `providers/jira/` are placed exactly where §4.4 already
  reserves them.
- §6.2 (`.space/config` schema): the `issues:` block reserved by §6.2 is
  validated and consumed for the first time in this WP.
- §7.1 Security (no write-back without opt-in, atomic writes, API auth):
  inherited verbatim from the sync layer.
- §7.2 Error handling: the per-command `space sync` table is extended
  with a `space publish jira` row in §7 below.

References in
[`docs/design/space-artefact-model.md`](../../design/space-artefact-model.md):

- §5.3 -- canonical story schema (parser source of truth).
- §6.1 -- doc-to-destination mapping (this WP delivers the
  `domain/{d}/backlog.md` and `work/{d}/{wp}/backlog.md` rows).
- §6.2 -- issue-key ownership rule (the source-mode switch this WP
  implements).
- §6.3 -- `space publish jira` behaviour spec.
- §6.4 -- field mapping (Markdown -> Jira fields).

## 3. Files and components

### 3.1 New files

```text
packages/space/src/
  commands/
    publish.ts                       NEW   register publish command group + jira subcommand
  parsers/
    backlog.ts                       NEW   parse domain + WP backlog markdown
    backlog.test.ts                  NEW   unit tests
    types.ts                         NEW   ParsedEpic, ParsedStory, parser errors
  providers/
    jira/
      publish.ts                     NEW   plan + apply orchestration
      publish.test.ts                NEW   unit tests
      diff.ts                        NEW   pure: items + mirror -> PublishPlan
      diff.test.ts                   NEW   unit tests
      mapping.ts                     NEW   read/write mapping.json
      mapping.test.ts                NEW   unit tests
      render.ts                      NEW   render description + sub-tasks
      render.test.ts                 NEW   unit tests
      publish-types.ts               NEW   PublishPlan, PublishMode, internal types

  test-fixtures/
    publish/
      msw-handlers.ts                NEW   Jira write-API msw handlers
      backlogs/                      NEW   sample backlog markdown files
      mirror/                        NEW   sample issues.json snapshots
```

### 3.2 Files modified

- `src/index.ts` -- import and call `registerPublishCommand(program)`
  alongside the existing sync registration.
- `src/config.ts` -- extend `WorkspaceConfig` with the `issues` block
  (`source`, `key_canonical`, `ac_format`, `ac_placement`, optional
  `epic_link_field`); validate the new keys; keep extra-key
  forward-compat behaviour.
- `src/providers/jira/client.ts` -- add `createIssue`, `updateIssue`,
  `createIssueLink`, `transitionIssue`, and `getProjectMeta` methods.
  All four reuse the existing 401/403 / 429 retry shell from
  `fetchPage` (refactor `fetchPage` into a generic `request` helper
  that returns parsed JSON or `null`). `searchIssues` keeps its current
  signature.
- `src/providers/jira/types.ts` -- add `JiraCreatePayload`,
  `JiraUpdatePayload`, `JiraTransitionPayload`, `JiraCreateResponse`,
  `JiraIssueLinkRequest` matching the v3 API. Keep existing types
  unchanged.
- `src/providers/jira/sync.ts` -- export `syncJira` is reused as-is by
  the publisher's post-apply refresh; no signature change.

### 3.3 Files NOT modified

- `src/credentials.ts` -- the publisher reads the same `ATLASSIAN_*`
  env vars; no token-scope change at the file level. (Consumers must
  ensure their token has Jira write scope; documented in the README
  update bundled with this WP.)
- `src/fs.ts` -- atomic-write helper is reused verbatim for both
  `mapping.json` and the post-apply mirror refresh.
- `src/commands/sync.ts` -- untouched; the publisher imports `syncJira`
  directly from the provider, not via the command module.

## 4. Data contracts

### 4.1 `IssuesConfig` -- the new `.space/config` block

```typescript
// File: packages/space/src/config.ts (additions)
export type IssueSourceMode = 'jira' | 'markdown';
export type AcFormat = 'ears' | 'gherkin' | 'ears+gherkin';
export type AcPlacement = 'description' | 'subtasks';

export interface IssuesConfig {
  source: IssueSourceMode;
  key_canonical: 'jira' | 'local';
  ac_format: AcFormat;
  ac_placement: AcPlacement;
  /**
   * Custom field id used as the parent (epic) link. Defaults to the
   * Jira Cloud "Parent" relationship; teams on legacy schemes set this
   * to the customfield_NNNNN their project uses.
   */
  epic_link_field?: string;
}

export interface WorkspaceConfig {
  project: { name: string; key: string };
  sources?: { issues?: JiraSourceConfig; docs?: ConfluenceSourceConfig };
  // NEW:
  issues?: IssuesConfig;
}
```

### 4.2 Parser output -- `ParsedEpic` and `ParsedStory`

```typescript
// File: packages/space/src/parsers/types.ts
export type Status = 'Not started' | 'In progress' | 'In review' | 'Done' | 'Blocked';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface SourceLocation {
  file: string;
  line: number;
}

export interface ParsedEpic {
  kind: 'epic';
  localId: string;            // e.g. CART01, SPACE-04
  jiraKey?: string;           // present when key_canonical: jira and the doc uses Jira keys
  title: string;
  status: Status;
  priority: Priority;
  points: number | null;
  phase?: string;
  dependsOn: string[];        // local IDs
  workPackagePath?: string;
  summary: string;            // single paragraph
  source: SourceLocation;     // domain/{d}/backlog.md + line of the heading
}

export interface ParsedStory {
  kind: 'story';
  localId: string;            // e.g. CART01-01, SPACE-04-02
  jiraKey?: string;
  title: string;
  status: Status;
  priority: Priority;
  estimate: number | null;
  epicLocalId: string;        // CART01 from `Epic: CART01`
  labels: string[];
  dependsOn: string[];
  deliverable: string;
  designLink?: string;        // raw markdown link to the design.md anchor
  acceptanceEars: string[];
  acceptanceGherkin: string[]; // each entry is one fenced gherkin block
  source: SourceLocation;
}

export type ParsedItem = ParsedEpic | ParsedStory;

export class BacklogParseError extends Error {
  readonly file: string;
  readonly line: number;
  constructor(message: string, file: string, line: number) {
    super(`${file}:${line} -- ${message}`);
    this.name = 'BacklogParseError';
    this.file = file;
    this.line = line;
  }
}
```

### 4.3 `MappingFile` -- the sidecar at `.space/sources/jira/mapping.json`

```typescript
// File: packages/space/src/providers/jira/mapping.ts
export interface MappingEntry {
  local_id: string;   // canonical local ID (e.g. CART01-01)
  jira_key: string;   // canonical Jira key (e.g. STORE-1234)
  written_at: string; // ISO 8601 of last successful publish for this entry
}

export interface MappingFile {
  version: 1;
  entries: Record<string, MappingEntry>; // keyed by local_id
}

// Empty file shape on first run:
const empty: MappingFile = { version: 1, entries: {} };
```

### 4.4 `PublishPlan` -- the diff output

```typescript
// File: packages/space/src/providers/jira/publish-types.ts
export type PublishMode = 'markdown-source' | 'jira-source';

export interface PlanCreate {
  kind: 'create';
  item: ParsedItem;
  reason: string; // e.g. "no jira_key in mapping; not present in mirror"
}

export interface PlanUpdate {
  kind: 'update';
  item: ParsedItem;
  jiraKey: string;
  fieldDiff: FieldDiff[];
}

export interface PlanNoop {
  kind: 'noop';
  item: ParsedItem;
  jiraKey: string;
}

export interface PlanSkipMissing {
  kind: 'skip_missing'; // jira-source mode only
  item: ParsedItem;
  reason: 'no jira_key in mapping; jira-source mode forbids creates';
}

export type PlanEntry = PlanCreate | PlanUpdate | PlanNoop | PlanSkipMissing;

export interface FieldDiff {
  field: 'summary' | 'status' | 'priority' | 'description' | 'labels' | 'parent' | 'links';
  from: unknown;
  to: unknown;
}

export interface PublishPlan {
  mode: PublishMode;
  entries: PlanEntry[];
  counts: { create: number; update: number; noop: number; skip: number };
}
```

### 4.5 Jira write payloads (subset of REST API v3)

```typescript
// File: packages/space/src/providers/jira/types.ts (additions)
export interface JiraCreatePayload {
  fields: {
    project: { key: string };
    issuetype: { name: 'Epic' | 'Story' };
    summary: string;
    description?: AdfDocument; // ADF; rendered by render.ts
    labels?: string[];
    priority?: { name: string };
    parent?: { key: string };  // epic link for stories on Cloud schemes
    [customField: string]: unknown;
  };
}

export interface JiraCreateResponse {
  id: string;
  key: string;
  self: string;
}

export interface JiraUpdatePayload {
  fields?: Record<string, unknown>;
  update?: Record<string, Array<{ add?: unknown; remove?: unknown; set?: unknown }>>;
}

export interface JiraTransitionPayload {
  transition: { id: string };
}

export type AdfDocument = {
  version: 1;
  type: 'doc';
  content: AdfNode[];
};
type AdfNode = { type: string; content?: AdfNode[]; text?: string; marks?: AdfNode[] };
```

## 5. Runtime view

The publisher runs in two phases: **plan** (pure, never calls Jira) and
**apply** (calls Jira, writes mapping, refreshes mirror). `--dry-run`
stops after the plan phase and prints the result. Without `--dry-run` the
apply phase runs only if the plan phase succeeds.

### 5.1 Plan phase (always runs)

```text
space publish jira [--dry-run]
  -> findWorkspaceRoot()
     loadConfig()                             -- extended with IssuesConfig
     loadCredentials()                        -- not used in plan phase but
                                                 fail-fast on missing tokens
  -> parseBacklogs(root)
     scan glob: domain/**/backlog.md, work/**/backlog.md
     for each file:
        parse frontmatter (must be type: Backlog)
        parse epic/story blocks per the §5.3 schema
        on schema violation:
           throw BacklogParseError with file:line
        otherwise:
           accumulate ParsedEpic[] and ParsedStory[]
  -> loadMapping(root)
     read .space/sources/jira/mapping.json (empty if missing)
  -> loadMirror(root)
     read .space/sources/jira/issues.json
        (must exist; else exit non-zero with "run `space sync jira` first")
  -> resolveJiraKeys(items, mapping, mode)
     for each item:
        if mode == jira-source:
           item.jiraKey expected to be present in the markdown frontmatter
           (or as the ID prefix). If absent -> skip_missing.
        else (markdown-source):
           item.jiraKey = mapping.entries[item.localId]?.jira_key
  -> diffPlan(items, mirror)
     for each item with a known jiraKey:
        find mirror[item.jiraKey]; compute FieldDiff[]
        emit update if non-empty, noop otherwise
     for each item without a known jiraKey:
        if mode == jira-source -> skip_missing
        else -> create
  -> if --dry-run:
        printPlan(stdout); exit 0
```

The plan phase is fully deterministic given (parsed items, mirror,
mapping, mode). Re-running the plan against an unchanged tree produces a
byte-identical plan (`solution.md` §2.1 quality goal 2: reproducibility).

### 5.2 Apply phase (only without `--dry-run`)

```text
applyPlan(plan, jiraClient, mode)
  for each entry in plan.entries:
     case create  (markdown-source only):
        if item.kind == story:
           ensure mapping[item.epicLocalId]?.jira_key exists in mirror;
           else fail-fast (epic must be created first; ordered by parser:
                epics first, stories after)
        payload = renderCreatePayload(item, config)
        response = jiraClient.createIssue(payload)
        for each dependency in item.dependsOn:
           if mapping[depId]?.jira_key exists:
              jiraClient.createIssueLink(blocks, response.key, mapping[depId].jira_key)
        if item.status != 'Not started':
           transitionId = transitionIdForStatus(projectMeta, item.status)
           if transitionId: jiraClient.transitionIssue(response.key, transitionId)
        mapping.entries[item.localId] = { local_id, jira_key: response.key, written_at: now }
        log "created {response.key} <- {item.localId}"

     case update:
        payload = renderUpdatePayload(entry.fieldDiff, item, config)
        jiraClient.updateIssue(entry.jiraKey, payload)
        if any FieldDiff.field == 'status':
           transitionId = transitionIdForStatus(projectMeta, item.status)
           if transitionId: jiraClient.transitionIssue(entry.jiraKey, transitionId)
        log "updated {entry.jiraKey} <- {item.localId}"

     case noop:
        log "no change {entry.jiraKey} <- {item.localId}" (verbose only)

     case skip_missing:
        log "skipped {item.localId}: jira-source mode requires an existing key"

  -> writeMapping(root, mapping)             -- atomicWrite
  -> syncJira({ sourceConfig, credentials, workspaceRoot: root })
                                              -- post-apply mirror refresh
  -> print summary { created, updated, skipped, refreshedAt }
```

The apply phase is **not** wrapped in a single Jira-side transaction --
Jira has no transactional API across issues. Failure semantics:

- A `createIssue` failure aborts the run after writing the mapping for
  every issue created so far (so a re-run picks up where it failed).
  The post-apply `syncJira` still runs so the mirror reflects partial
  state.
- An `updateIssue` failure aborts the run identically. Updates already
  applied stay in Jira; a re-run reconciles whatever still differs.
- Any 401 / 403 from Jira aborts immediately and surfaces a
  `JiraAuthError` to the CLI (per `solution.md` §7.2).

### 5.3 Source-mode behaviour

Two modes share the plan and apply pipelines; the only branch is in
`resolveJiraKeys` (plan) and the `create` case (apply).

| Concern | `markdown-source` | `jira-source` |
| --- | --- | --- |
| Authoritative ID | local (`CART01-01`) | Jira key (`STORE-1234`) |
| Markdown-only items | `create` in plan; `createIssue` in apply | `skip_missing` with warning |
| Mapping write-back | enabled | enabled (key already known; entry refreshed for `written_at`) |
| Plan output for missing key | "create" | "skip_missing" |
| Acceptance criteria in Jira | always rendered | always rendered |
| Mirror refresh | always | always |

### 5.4 Idempotency

A clean re-run with no Markdown changes yields a plan whose only entries
are `noop` or (jira-source) `skip_missing`. The apply phase short-circuits
to the post-apply mirror refresh.

A re-run after a partial failure does not re-create issues whose mapping
was already written. The diff engine sees the existing key in the mapping
and emits an `update` (or `noop`) instead of a `create`.

## 6. Cross-squad coordination

This WP is platform-internal; no cross-squad interface. The validation
target (`storefront-space`) is owned by the same team that owns Space.
The Atlassian REST API contract is external but stable; `space sync jira`
already depends on it and no new auth scope is added beyond write
permission to the configured project (which the consumer's API token
must already grant).

## 7. Error paths

The publisher inherits the philosophy in
[`docs/solution.md`](../../solution.md) §7.2: every error exits non-zero,
writes to stderr, and leaves the workspace in the state it was in before
the command ran. New typed error codes:

```typescript
// File: packages/space/src/providers/jira/publish-types.ts
export type PublishErrorCode =
  | 'BACKLOG_SCHEMA_INVALID'
  | 'MIRROR_MISSING'
  | 'CONFIG_MISSING_ISSUES_BLOCK'
  | 'EPIC_LINK_BROKEN'
  | 'JIRA_AUTH_FAILED'
  | 'JIRA_RATE_LIMIT'
  | 'JIRA_NOT_FOUND'
  | 'JIRA_VERSION_CONFLICT'
  | 'JIRA_FIELD_REJECTED'
  | 'NETWORK_ERROR'
  | 'WRITE_FAILED'
  | 'UNKNOWN';
```

Per code:

| Code | Behaviour |
| --- | --- |
| `BACKLOG_SCHEMA_INVALID` | Plan phase fails before any Jira call. Stderr lists every offending file:line. Existing mirror, mapping, and Jira state are untouched. |
| `MIRROR_MISSING` | Plan phase fails. Stderr: "Run `space sync jira` first to populate the local mirror." |
| `CONFIG_MISSING_ISSUES_BLOCK` | Plan phase fails. Stderr names the missing keys (`issues.source`, `issues.project`). |
| `EPIC_LINK_BROKEN` | Plan phase fails when a story names an `epicLocalId` whose epic is absent from the parsed set. The story file:line is reported. |
| `JIRA_AUTH_FAILED` | Apply phase aborts on first 401/403 (re-uses `JiraAuthError` from `client.ts`). Mapping written for issues completed before the failure. |
| `JIRA_RATE_LIMIT` | Inherits the 1s/2s/4s retry shell from `client.ts`. After three retries the run aborts; mapping written for issues completed so far. |
| `JIRA_NOT_FOUND` | An update targeting a `jiraKey` that returns 404. Logged, the entry is dropped from the run, mapping retained but flagged with a warning. Run does not abort -- the mapping is now stale and will be repaired on the next mirror refresh. |
| `JIRA_VERSION_CONFLICT` | One silent retry inside the route handler; on second 409 the entry is logged as failed and skipped. Run continues. |
| `JIRA_FIELD_REJECTED` | A 400 from Jira on create or update (e.g. unknown custom field). Logged with the offending payload field; entry is skipped, run continues. The first such error surfaces the most-likely mismatch (`epic_link_field`). |
| `NETWORK_ERROR` | Treated as a transient; same retry shell as `JIRA_RATE_LIMIT`. |
| `WRITE_FAILED` | A failure writing `mapping.json` aborts the run; the post-apply mirror refresh is skipped so the next run can see what reached Jira. |
| `UNKNOWN` | Catch-all; logs full context and aborts non-zero. |

The `--dry-run` flag never surfaces apply-phase codes (never reaches that
code); it can surface `BACKLOG_SCHEMA_INVALID`, `MIRROR_MISSING`,
`CONFIG_MISSING_ISSUES_BLOCK`, `EPIC_LINK_BROKEN`.

## 8. Observability

The publisher is a CLI; observability is human-readable stdout / stderr
plus a final structured summary. Per
[`docs/solution.md`](../../solution.md) §7.3 telemetry-back-to-Space is
out of scope.

This WP introduces:

- **Plan-phase output (stdout).** A grouped table; when the user passes
  `--verbose`, each entry is printed with `LOCAL_ID`, resolved `JIRA_KEY`
  (if any), and the `FieldDiff` list.

  ```text
  publish plan (markdown-source mode)
    creates  : 12   stories under 3 epics
    updates  :  4   summary x2, status x2
    no-ops   : 18
    skipped  :  0
  ```

- **Apply-phase progress (stdout).** One line per applied entry, with
  duration:

  ```text
  created STORE-1234 (CART01)        324 ms
  created STORE-1235 (CART01-01)     189 ms
  updated STORE-1230 (CART01-02)     142 ms
  ```

- **Apply-phase failures (stderr).** One line per failed entry plus a
  final non-zero exit with the count of failures.
- **Final summary (stdout).** The same shape as the plan-phase summary
  with `applied` / `failed` / `refreshed_at` fields.
- **Exit codes.** `0` clean run (including `--dry-run` with non-empty
  plan); `1` any error; `2` schema-invalid input (callers can branch on
  schema-only failure to short-circuit CI).

A `--json` mode is reserved (mirrors the `--json` future flag in
`solution.md` §7.3) but **deferred** -- the human format above is
sufficient for the validation target. Stories `SPACE-04-02` and
`SPACE-04-09` enforce the human format only.

## 9. Testing strategy

| Layer | Scope | Target |
| --- | --- | --- |
| Unit (Vitest) | `parsers/backlog.ts`: every story/epic field happy path; every schema violation; multi-block file ordering | 100% branches |
| Unit (Vitest) | `providers/jira/diff.ts`: pure function fixture tests -- creates / updates / noops / skip_missing across both modes | 100% branches |
| Unit (Vitest) | `providers/jira/mapping.ts`: missing file -> empty; round-trip identity; corrupted file rejected | 100% branches |
| Unit (Vitest) | `providers/jira/render.ts`: EARS-only / Gherkin-only / both placements; description vs sub-tasks switch | 100% branches |
| Unit (Vitest) | `providers/jira/client.ts` extensions: createIssue / updateIssue / createIssueLink / transitionIssue happy + 401 + 429 + 4xx + 5xx | 100% branches |
| Integration (Vitest + msw) | `space publish jira --dry-run` against fixture backlogs + fixture mirror -> expected plan | 4 scenarios: clean, creates-only, updates-only, jira-source skip_missing |
| Integration (Vitest + msw) | `space publish jira` (live apply) against msw Jira -> assert HTTP calls + mapping write + mirror refresh | 2 scenarios: markdown-source happy, jira-source happy |
| Integration (Vitest + msw) | Failure modes: 401 mid-run, 429 retried, 404 on update, 409 retried, 400 schema-rejected | One per code in §7 |
| Integration (Vitest + msw) | Idempotency: run twice in a row -- second run plan is all-noop | Required for release |
| Smoke (manual) | `storefront-space` `space publish jira --dry-run` against the real STORE project; outputs reviewed | Pass before 0.4.0 |
| Smoke (manual) | `storefront-space` `space publish jira` against a sandbox project in `markdown-source` mode | Pass before 0.4.0 |

No live-Atlassian tests in CI per
[`docs/solution.md`](../../solution.md) §7.4. msw fixtures cover the
full v3 REST surface this WP touches.

## 10. Acceptance gates (subset of `solution.md` §2.1 for this WP)

The publisher must satisfy the subset of Space's quality goals that bind
on a write-back operation:

- **Reproducibility.** The plan output for an unchanged tree is
  byte-identical across runs. (`solution.md` §2.1 goal 2.)
- **Safety.** No publish without `issues.source` set. No partial
  mapping write -- mapping update is atomic. The mirror is refreshed
  after every apply so it never lags Jira beyond one run.
  (`solution.md` §2.1 goal 3.)
- **Fast default path.** A 500-issue dry-run finishes in under 3 s on a
  warm filesystem. A 500-issue live apply finishes within
  `60 + 0.3 * issue_count` seconds (network-bound; aligns with
  `solution.md` §7.5 sync targets). (`solution.md` §2.1 goal 4.)
- **Forward compatibility.** The `issues:` block is additive; the
  publisher tolerates unknown keys; new optional fields ship as minor
  versions. (`solution.md` §2.1 goal 5.)
- **Quality bars.** `pnpm typecheck && pnpm test && pnpm lint` clean
  across `@tpw/space`. Every new file ships with the test files listed
  in §3.1. `pnpm validate` clean from the monorepo root before the
  0.4.0 changeset is published.

## 11. Handoff to later WPs

When SPACE-04 closes the following surface is stable and downstream WPs
can rely on it:

- **The publish-command shell** (`commands/publish.ts`). SPACE-05
  registers `space publish confluence <path>` as a sibling subcommand
  with no changes to the dispatch shape.
- **The backlog parser** (`parsers/backlog.ts`). The parsed
  `ParsedEpic` / `ParsedStory` types are the canonical in-memory shape
  for any future consumer (e.g. `pnpm lint:docs` story-AC schema check
  in SPACE-03 reuses the same parser).
- **The sidecar mapping pattern** (`providers/jira/mapping.ts`).
  SPACE-05 follows the same pattern under
  `.space/sources/confluence/mapping.json`.
- **The Jira write client.** SPACE-08 (multi-project, incremental
  sync) extends the client with the `updatedDate` JQL filter; the
  write methods are unchanged.
- **The diff + apply pattern.** A future "publish dry-run + plan"
  command for arbitrary destinations can lift the `PublishPlan` shape
  verbatim.

## 12. Open questions for this WP

1. **AC placement default.** Default `description` (one rendered block)
   or `subtasks` (one per AC)? Recommended default `description`; opt
   into `subtasks` per project. Open in artefact-model §9 question 1;
   confirm with the storefront-space user before the 0.4.0 tag.
   **Owner:** @horizon-platform. **Blocks:** SPACE-04-07 release notes.
2. **`epic_link_field` discovery.** Some Atlassian Cloud schemes use
   the native `parent` relationship; others use a `customfield_NNNNN`
   left over from legacy Software projects. Recommended approach:
   probe with a no-op create against a project meta endpoint on first
   run, surface a one-time prompt to commit the discovered field id to
   `.space/config`. **Owner:** @horizon-platform. **Blocks:**
   SPACE-04-04 acceptance.
3. **Workflow-status mapping.** The canonical statuses
   (`docs/backlog.md` §2) do not always map 1:1 to a Jira project's
   workflow. Default behaviour proposed: skip the transition with a
   warning when no exact match exists; teams configure a `status_map`
   in a follow-up WP. **Owner:** @horizon-platform. **Blocks:** none
   for SPACE-04 (skip-with-warning is acceptable).
4. **Handling a Markdown story whose Jira key was deleted in Jira.**
   Default behaviour proposed: `JIRA_NOT_FOUND` warning, mapping
   entry retained, no auto-recreate. The next mirror sync will surface
   the gone-from-Jira state; user decides whether to re-create.
   **Owner:** @horizon-platform. **Blocks:** none.
5. **Local-ID visibility under `key_canonical: jira`.** Whether to
   keep the `[CART01-01]` tag in Markdown when Jira owns the key. Open
   in artefact-model §9 question 2; recommended default `elide`
   (Jira key alone). **Owner:** @horizon-platform. **Blocks:** none
   for SPACE-04 (the parser already accepts both forms); document the
   chosen default in the 0.4.0 release notes.
