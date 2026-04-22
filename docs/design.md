---
type: design
product: space
status: draft
version: '0.1'
requirements: docs/product.md
---

# Technical Design -- Space

## Overview

Space is a pnpm monorepo of three cooperating packages that constitute the
delivery workspace ecosystem for Horizon. `@tpw/skills` is a Markdown-only
content library distributed as an npm package and synced into workspaces by a
postinstall bin. `@tpw/create-space` is an interactive TypeScript CLI that
scaffolds a complete workspace from a opinionated template in a single command.
`@tpw/space` is an operational TypeScript CLI that connects a workspace to
external data sources -- Jira and Confluence -- by writing native-format mirrors
into `.space/sources/`. The packages share no runtime imports; coupling is
purely file-system convention: every workspace produced by `create-space`
installs both `@tpw/skills` and `@tpw/space` and consumes the `.space/config`
and `.space/sources/` layouts defined here. For product context, problem
statement, and success criteria see `docs/product.md`.

## System Architecture

```
npm registry
  @tpw/skills       → consumer workspace: skills/{verb}-{topic}/SKILL.md
  @tpw/create-space → one-time scaffold of {project}-space/
  @tpw/space        → space sync jira / space sync confluence

Consumer workspace ({project}-space/)
  .space/
    config           ← read by @tpw/space, @tpw/crew, agents
    team
    raci
    sources/
      jira/          ← written by space sync jira
      confluence/    ← written by space sync confluence
  skills/            ← written by sync-skills postinstall bin
    write-product/SKILL.md
    review-code/SKILL.md
    ...
  product/           ← human / agent authored docs
  architecture/
  work/
  AGENTS.md

@tpw/crew (separate repo, separate runtime)
  reads skills/ and .space/sources/ at execution time
  no code import from @tpw/* packages
```

Data flow for sync (phase 1 -- pull only):

```
Jira REST API
  → space sync jira
  → .space/sources/jira/issues.json    (native Jira REST format, ADF intact)
  → @tpw/crew / agent reads at invocation

Confluence REST API
  → space sync confluence
  → .space/sources/confluence/pages/   (native storage XHTML, unchanged)
  → @tpw/crew / agent reads at invocation
```

Write-back (future phase -- not in scope now):

```
Authored .md doc (confluence_page_id frontmatter)
  → space publish confluence <path>
  → markdown → Confluence storage XHTML (convert only at publish step)
  → Confluence REST API PUT /pages/{id}
  → local mirror updated from response
```

---

## Package Design: `@tpw/skills`

### Responsibilities

- Ship delivery activity skill files as a versioned npm package.
- Provide a `sync-skills` postinstall bin that copies skills into the consuming
  workspace without deleting project-local skills.

### Skill directory structure

Each skill occupies its own directory named `{verb}-{topic}/`:

```
packages/skills/
  {verb}-{topic}/
    SKILL.md           required -- frontmatter + instruction body
    template.md        optional -- output template the skill fills in
    template-*.md      optional -- named variant templates
    examples/          optional -- worked examples the agent reads as context
    scripts/           optional -- shell or Node scripts the skill invokes
```

### `SKILL.md` frontmatter schema

```yaml
---
name: write-product            # required; matches directory name
description: string            # required; one-line description shown in skill pickers
when_to_use: string            # required; prose trigger conditions
allowed-tools:                 # optional; tools the skill may call
  - Read
  - Write
argument-hint: string          # optional; hint to the caller, e.g. '<scope: platform|domain>'
version: '0.1'                 # required; bump minor on incompatible template changes
---
```

### Canonical verb set

| Verb | Semantics |
| --- | --- |
| `write-` | Author a document from scratch |
| `review-` | Review an existing artifact against stated criteria |
| `plan-` | Orchestrate a multi-step planning activity |
| `implement` | Execute a story against approved requirements and design |
| `validate` | Final acceptance check that an epic is complete |
| `create-` | Automate a process that produces an external artifact (e.g. MR) |

### `sync-skills` bin

Entry point: `bin/sync-skills.js`. Invoked as a `postinstall` npm script in
consumer workspaces.

Algorithm:

1. Resolve workspace root -- the directory containing the nearest `package.json`
   above `process.cwd()`.
2. Resolve source from `node_modules/@tpw/skills/`.
3. For each skill directory in source: copy `SKILL.md`, `template*.md`,
   `examples/`, `scripts/` into `{workspace-root}/skills/{skill-name}/`.
4. Never delete a destination skill directory that has no counterpart in source
   (preserves project-local skills).
5. Write `skills/.manifest.json` recording which skills came from `@tpw/skills`
   and at which version.

```typescript
interface SkillsManifest {
  generatedAt: string;  // ISO 8601
  source: {
    package: '@tpw/skills';
    version: string;
  };
  skills: Record<
    string,
    {
      origin: 'package' | 'local';
      version?: string; // from SKILL.md frontmatter when present
    }
  >;
}
```

### Published file patterns

```
bin/**
*/SKILL.md
*/template.md
*/template-*.md
*/template.*.md
*/examples/**
*/scripts/**
README.md
CHANGELOG.md
```

No TypeScript source, no `dist/`. Skills are Markdown; the package has no build
step.

---

## Package Design: `@tpw/create-space`

### Responsibilities

Scaffold a complete, standards-compliant delivery workspace from a single
command. Runs once at project start. The output workspace is immediately
usable by humans and agents.

### CLI interface

```
pnpm create @tpw/space [project-name] [options]

Options:
  --yes             Accept all defaults; non-interactive (CI-safe)
  --key <KEY>       Override the project key (default: PROJECT-NAME uppercased)
  --dir <path>      Override the output directory (default: {project-name}-space)
  --use-npm | --use-pnpm | --use-yarn | --use-bun
  --skip-install    Skip dependency installation
  --disable-git     Skip git init and initial commit
```

### Interactive prompt sequence

Prompts are skipped entirely when `--yes`, `--key`, or `CI=true`:

1. Project name (required when not provided as positional argument)
2. Project key (confirm or override the derived default)
3. Source code provider (GitHub is default; GitLab, Bitbucket, None)
4. AI/LLM provider (Anthropic is default; OpenAI, Cursor, Other)
5. Package manager (resolved from environment; confirm or override)

### Config type

```typescript
interface SpaceConfig {
  projectName: string;    // human-readable name
  projectKey: string;     // SHORT-KEY used in Jira references and artifacts
  project: string;        // kebab-case; used in directory name
  targetDir: string;      // absolute output directory path
  sourceProvider: 'github' | 'gitlab' | 'bitbucket' | 'none';
  llmProvider: 'anthropic' | 'openai' | 'cursor' | 'other';
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  skipInstall: boolean;
  disableGit: boolean;
}
```

### Scaffolding sequence

1. Validate `targetDir` is empty; prompt to overwrite if not (exit if declined).
2. Check npm registry for a newer version of `@tpw/create-space`; warn if stale.
3. Copy `template/default/` into `targetDir`, interpolating template tokens
   (`{projectName}`, `{project}`, `{projectKey}`, `{sourceRepo}`,
   `{llmProviders}`, `{defaultModel}`) in file content.
4. Write the resolved `.space/config`.
5. Run the selected package manager's install command (unless `--skip-install`).
6. Run `git init && git add -A && git commit -m "chore: scaffold {project}-space"`
   (unless `--disable-git`).
7. Print a success summary with explicit next-step instructions.

### Template directory structure

```
template/default/
  AGENTS.md                             templated; describes workspace layout
  README.md
  package.json                          includes @tpw/skills, @tpw/space as
                                        devDependencies; postinstall: sync-skills;
                                        sync: space sync
  .gitignore                            includes .env, work/, node_modules/
  .space/
    config                              templated with project identity + empty sources
    team                                empty roster template
    raci                                empty RACI template
  product/
    prd.md                              product requirements template
    backlog.md                          backlog template
    roadmap.md                          roadmap template
  architecture/
    solution.md                         solution architecture template
    decisions/
      register.md                       ADR register
      adr-template.md                   ADR writing template
  docs/
    conventions/
      definition-of-done.md
      definition-of-ready.md
  work/                                 gitignored; active in-progress work
```

Symlinks (`.cursor/skills -> ../skills`, `.claude/skills -> ../skills`) are
created by the `sync-skills` postinstall step, not included in the template
directory.

---

## Package Design: `@tpw/space`

### Responsibilities

Operate an existing workspace: pull data from external sources into
`.space/sources/` in native upstream format. Later phases add publish-back to
Confluence for opted-in documents. Installed as a `devDependency` and invoked
via the `space` bin.

### CLI interface

```
space sync [provider]            sync one or all configured sources
space sync jira                  pull Jira project → .space/sources/jira/
space sync confluence            pull Confluence space → .space/sources/confluence/
space publish confluence <path>  push opted-in doc to Confluence  [future]
```

### Source directory structure

```
packages/space/src/
  index.ts                CLI entry point (Commander program registration)
  commands/
    sync.ts               sync command group + provider dispatch
    publish.ts            publish command group [future]
  providers/
    jira/
      client.ts           Jira REST API client (fetch wrapper)
      sync.ts             pull logic → .space/sources/jira/
      types.ts            Jira API response types
    confluence/
      client.ts           Confluence REST API client
      sync.ts             pull logic → .space/sources/confluence/
      types.ts            Confluence API response types
  config.ts               reads and validates .space/config (YAML)
  credentials.ts          reads .env via dotenv
  fs.ts                   atomic write helpers: temp-dir → atomic rename
```

### Configuration loading

`config.ts` locates `.space/config` by walking up from `process.cwd()` until
it finds one or reaches filesystem root; exits non-zero if not found. Parses
YAML using the `yaml` package.

```typescript
interface WorkspaceConfig {
  project: {
    name: string;
    key: string;
  };
  sources?: {
    issues?: JiraSourceConfig;
    docs?: ConfluenceSourceConfig;
  };
}

interface JiraSourceConfig {
  provider: 'jira';
  base_url: string;  // e.g. https://org.atlassian.net
  project: string;   // Jira project key, e.g. STORE
}

interface ConfluenceSourceConfig {
  provider: 'confluence';
  space: string;     // Confluence space key, e.g. STOREFRONT
  url?: string;      // informational only; not used programmatically
}
```

Credentials are loaded from `.env` at workspace root:

```
JIRA_BASE_URL          optional override for config.sources.issues.base_url
JIRA_USER              required for Jira sync
JIRA_API_TOKEN         required for Jira sync
CONFLUENCE_BASE_URL    optional override; defaults to JIRA_BASE_URL (same tenant)
CONFLUENCE_USER        required for Confluence sync
CONFLUENCE_API_TOKEN   required for Confluence sync
```

### Jira sync

**API:** Jira REST API v3.

**Endpoint:** `GET /rest/api/3/search?jql={jql}&fields=*all&maxResults=100`
(paginated via `startAt` offset until `total` is reached).

**JQL:** `project = {project} ORDER BY key ASC` -- deterministic ordering.

**Output:** `.space/sources/jira/`

| File | Content |
| --- | --- |
| `issues.json` | `JiraIssue[]` -- all project issues, native Jira REST v3 shape |
| `epics.json` | `JiraIssue[]` -- subset where `issuetype.name === 'Epic'` |
| `links.json` | `JiraIssueLink[]` -- `issuelinks` extracted from all issues, deduped |
| `meta.json` | `JiraSyncMeta` -- sync timestamp, JQL, counts |

Issues are sorted by key before writing. All fields are stored as returned by
the API without conversion. `description` stays in Atlassian Document Format
(ADF). Fetches all pages before writing any output.

**Atomicity:** write all output files to `.space/sources/jira/.tmp/`, then
`rename` the `.tmp` directory to `.space/sources/jira/` on success. On
failure, leave `.tmp/` in place and exit non-zero. The existing mirror is never
partially corrupted.

### Confluence sync

**API:** Confluence REST API v2.

**Page list:** `GET /wiki/api/v2/spaces/{spaceKey}/pages?limit=250` (paginated).

**Page body:** `GET /wiki/api/v2/pages/{id}?body-format=storage` for each
page. Fetched concurrently with a concurrency limit of 5 to avoid rate limiting.

**Output:** `.space/sources/confluence/`

| File | Content |
| --- | --- |
| `pages/{id}.xhtml` | Native Confluence storage XHTML, unchanged |
| `pages/{id}.meta.json` | `ConfluencePageMeta` |
| `index.json` | `Record<pageId, ConfluenceIndexEntry>` -- full page tree map |
| `meta.json` | `ConfluenceSyncMeta` -- sync timestamp, space, counts |

Pages that no longer exist upstream are removed from the local mirror on the
next sync. Atomicity follows the same temp-dir-then-rename pattern as Jira sync.

### Publish model (future phase)

When `space publish confluence <path>` is implemented:

1. Parse `confluence_page_id` from the document frontmatter. Exit if absent.
2. Convert the Markdown body to Confluence storage XHTML.
3. Read the current version number from
   `.space/sources/confluence/pages/{id}.meta.json`.
4. `PUT /wiki/api/v2/pages/{id}` with `version.number + 1` and the converted
   body.
5. Overwrite the local mirror with the API response.

A document must explicitly declare `confluence_page_id` in frontmatter to be
publishable. No document reaches Confluence without opt-in.

---

## Data Models

### `.space/config` schema (stable interface)

New keys are additive within the same major version. Breaking changes require a
major version bump and a migration note.

```yaml
project:
  name: string           # required; human-readable name
  key: string            # required; short uppercase key

crew:                    # optional; autonomous runtime configuration
  providers:
    {provider-name}:
      api_key_env: string
      models:
        {alias}: string

sources:                 # optional; external data sources
  issues:
    provider: 'jira'
    base_url: string
    project: string
  docs:
    provider: 'confluence'
    space: string
    url: string          # informational only
```

### `.space/sources/` layout (stable interface)

This layout is the content contract between Space and `@tpw/crew`. Changes to
file names or shapes are breaking and require a major version bump.

```
.space/sources/
  jira/
    issues.json          JiraIssue[]    -- native Jira REST v3 shape
    epics.json           JiraIssue[]    -- issuetype Epic only
    links.json           JiraIssueLink[] -- deduped from all issues
    meta.json            JiraSyncMeta
  confluence/
    pages/
      {id}.xhtml         string         -- native Confluence storage XHTML
      {id}.meta.json     ConfluencePageMeta
    index.json           Record<string, ConfluenceIndexEntry>
    meta.json            ConfluenceSyncMeta
```

```typescript
interface JiraSyncMeta {
  sync_at: string;  // ISO 8601
  project: string;
  jql: string;
  counts: {
    total: number;
    epics: number;
    stories: number;
    bugs: number;
  };
}

interface ConfluencePageMeta {
  id: string;
  title: string;
  parentId: string | null;
  spaceKey: string;
  labels: string[];
  version: number;
  sync_at: string;  // ISO 8601
}

interface ConfluenceIndexEntry {
  title: string;
  parentId: string | null;
}

interface ConfluenceSyncMeta {
  sync_at: string;  // ISO 8601
  space: string;
  counts: { total: number };
}
```

---

## Performance Targets

| Operation | p95 target | Strategy |
| --- | --- | --- |
| `create-space` scaffold (excluding install) | < 2 s | Local I/O only; no network during copy |
| `pnpm install` after scaffold (cold cache) | < 60 s | Acceptable for one-time setup |
| `sync-skills` postinstall | < 1 s | ~20 files, local filesystem copy |
| CLI startup (any command) | < 200 ms | Minimal dependencies; no dynamic requires |
| `space sync jira` (500 issues) | < 30 s | ~5 paginated requests at 100 per page |
| `space sync confluence` (100 pages) | < 60 s | Concurrent page fetches, cap 5 |
| Atomic rename (any sync) | < 10 ms | OS-level rename; same-device only |

Confluence page fetches are parallelised with a configurable concurrency cap
(default 5) to stay within Atlassian rate limits. Jira pagination is sequential
per page.

---

## Security

- **No credentials in source control.** `.env` is added to `.gitignore` by
  `create-space`. `@tpw/space` reads credentials only from `dotenv`; never
  from config files or CLI arguments.
- **No secrets in mirrors.** Jira and Confluence responses may contain sensitive
  business data. Workspace repos must have appropriate access controls. Space
  does not redact or filter mirror content.
- **No write-back without opt-in.** `space publish` requires an explicit
  `confluence_page_id` frontmatter field. No document reaches an external
  system without declaring intent.
- **Path traversal protection.** `sync-skills` validates that every resolved
  destination path is inside the workspace root before writing.
- **Atomic writes.** Sync operations write to `.tmp` and rename on success.
  Partial writes cannot corrupt an existing mirror.
- **API authentication.** Jira and Confluence use HTTP Basic Auth (user +
  API token, Atlassian standard). Tokens should be scoped to read-only access
  in phase 1. Write scope is required only for publish operations.

---

## Error Handling

### `create-space`

| Condition | Behaviour |
| --- | --- |
| Target directory not empty | Prompt to overwrite; exit non-zero if declined |
| Network unreachable for version check | Warn; continue with installed version |
| Template copy fails | Exit non-zero with the failing path and OS error message |
| Package install fails | Exit non-zero; instruct user to run install manually |

### `space sync`

| Condition | Behaviour |
| --- | --- |
| `.space/config` not found | Exit non-zero: "Run from inside a space workspace" |
| Missing required credential | Exit non-zero listing the missing env var name |
| API auth failure (401 / 403) | Exit non-zero immediately; no partial output |
| Rate limit (429) | Retry with exponential backoff: 1 s, 2 s, 4 s; max 3 retries |
| Network timeout | Retry up to 3 times; exit non-zero if all attempts fail |
| Unexpected API response shape | Log warning with entity ID to stderr; continue sync; flag in `meta.json` |
| Write failure mid-sync | Leave `.tmp/` in place; exit non-zero; existing mirror untouched |

All error messages go to `stderr`. `stdout` is reserved for progress lines.

### `sync-skills`

| Condition | Behaviour |
| --- | --- |
| `@tpw/skills` not resolvable | Exit non-zero with install instruction |
| `skills/` directory creation fails | Exit non-zero with OS error |
| Individual file copy fails | Log warning to stderr; continue; do not block install |

---

## Test Strategy

### `@tpw/skills`

Skills are Markdown content. Correctness is verified through review, not
automated assertion.

- **Structural lint (CI):** verify every skill directory contains `SKILL.md`;
  verify frontmatter includes `name`, `description`, `when_to_use`, `version`.
- **`sync-skills` unit tests (Vitest, mock filesystem):** correct file copy,
  manifest written with accurate origins, project-local skills not deleted,
  path traversal inputs rejected.

### `@tpw/create-space`

| Layer | Scope | Target |
| --- | --- | --- |
| Unit | `config.ts`: prompt defaults, key derivation, `--yes` fast path | 100% branches |
| Unit | `template.ts`: token interpolation, file copy | 100% branches |
| Unit | `helpers/`: git, install, pkg-manager, validation | 100% branches |
| Snapshot | Rendered `.space/config` and `AGENTS.md` for each LLM + source provider combination | All permutations |
| Integration | Full scaffold into a temp directory; assert output tree matches expected structure | `--yes` path + interactive happy path |

### `@tpw/space`

| Layer | Scope | Target |
| --- | --- | --- |
| Unit | `config.ts`: valid config, missing fields, unknown keys | 100% branches |
| Unit | `credentials.ts`: dotenv loading, missing var detection | 100% branches |
| Unit | `fs.ts`: atomic rename on success, `.tmp` left on failure | 100% branches |
| Unit | `providers/jira/sync.ts`: pagination, deterministic sort, atomic write | 100% branches |
| Unit | `providers/confluence/sync.ts`: page tree walk, XHTML write, stale page removal | 100% branches |
| Integration | `space sync jira` against fixture HTTP responses (msw) | Happy path, 429 retry, auth failure |
| Integration | `space sync confluence` against fixture HTTP responses (msw) | Happy path, pagination, deleted page |

No end-to-end tests against live Jira or Confluence in CI. Manual smoke tests
run against the `storefront-space` workspace before each release.

---

## Risks and Open Questions

1. **`@tpw/space` package home.** Currently in the space monorepo
   (`packages/space/`). If the CLI grows substantially, extract to its own
   repo (following the `skills` precedent). No action required now.

2. **Confluence sync volume.** Phase 1 syncs the full space. If page count
   makes syncs slow or diffs noisy, add a label or ancestor-path filter. Validate
   against the real STOREFRONT space before shipping; add filtering if
   `space sync confluence` exceeds the 60 s p95 target.

3. **Incremental Jira sync.** Phase 1 is full-refresh. If STORE grows beyond
   ~2,000 issues, add `updatedDate > {last_sync}` JQL filtering. Validate sync
   time against current STORE issue count; defer filtering until it is needed.

4. **Apply and publish mechanics.** The Markdown → Confluence XHTML conversion
   step for `space publish` is not designed here. Defer until demand is validated
   by the storefront-space integration. `confluence_page_id` frontmatter key is
   reserved.

5. **Multi-project Jira.** Config schema reserves `sources.issues` as a single
   block. When multi-project sync is needed, extend to `sources.issues[]` array;
   this is an additive, backward-compatible schema change.

6. **`sync-skills` copy vs symlink.** Current approach copies files. Symlinking
   `node_modules/@tpw/skills` directly into `.cursor/skills` and `.claude/skills`
   is cleaner but breaks in some monorepo setups. The copy approach is portable.
   Revisit if copy-on-update friction proves significant.

7. **Skill version staleness.** `SKILL.md` frontmatter carries a `version` field
   but there is no enforcement that consumers are on the latest. Add a
   `sync-skills --check` mode reporting stale skills if drift between projects
   becomes a problem. Deferred.
