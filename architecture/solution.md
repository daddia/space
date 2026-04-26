---
type: Solution
product: space
stage: full
version: '1.1'
owner: daddia
status: Current
last_updated: 2026-04-26
related:
  - product/space/product.md
  - product/space/roadmap.md
  - product/space/backlog.md
  - architecture/space/design/space-artefact-model.md
---

# Solution -- Space

Solution design for the `space` monorepo. Defines the architecture,
cross-cutting concepts, data contracts, and key decisions behind the
three packages (`@daddia/skills`, `@daddia/create-space`, `@daddia/space`). Uses
the arc42-lite structure described in
`architecture/space/design/space-artefact-model.md` Section 4.7.

For the product context, problem statement, and user targets see
`product/space/product.md`.

## 1. Context and scope

Space is a pnpm monorepo producing three cooperating packages
distributed through the npm registry. It has no runtime services of its
own. The packages are installed into a consumer workspace that Space
scaffolded.

```text
                          npm registry
  +-------------------+-------------------+-------------------+
  | @daddia/skills       | @daddia/create-space | @daddia/space        |
  |  markdown library |  scaffold CLI     |  operations CLI   |
  +---------+---------+---------+---------+---------+---------+
            |                   |                   |
            v                   v                   v
  +----------------------- Consumer workspace -----------------------+
  |  (e.g. storefront-space)                                          |
  |    .space/          workspace identity, config, source mirrors    |
  |    skills/          synced from @daddia/skills by postinstall bin    |
  |    docs/, work/,                                                  |
  |    domain/,         human / agent-authored artefacts              |
  |    architecture/                                                  |
  |    AGENTS.md                                                      |
  +-------------------------+-----------------------------------------+
                            |
                            v
             +--------------+---------------+
             |  @daddia/crew (external)     |
             |  reads skills/ and           |
             |  .space/sources/ at runtime  |
             +------------------------------+
```

### 1.1 System boundary

Space owns:

- The skills content library and its distribution format.
- The scaffold template and its interactive CLI.
- The operations CLI (`space sync`, `space publish`).
- The `.space/` directory convention (identity, config, sources).

Space does not own:

- The runtime that executes skills (Crew, via `@daddia/crew`).
- The code the consumer workspace describes (the team's product).
- Upstream systems (Jira, Confluence, etc.).

### 1.2 Upstream / downstream systems

- **npm registry** -- the distribution channel for all three packages.
- **Atlassian Jira (Cloud)** -- issue source; read via REST API v3.
- **Atlassian Confluence (Cloud)** -- page source; read via REST API v2.
- **Consumer workspaces** -- downstream; consume the three packages.
- **@daddia/crew** -- downstream runtime; reads the workspace file-system
  conventions at execution time. Consumes `skills/` and `.space/sources/`.
- **AI coding tools** (Cursor, Claude Code, etc.) -- downstream; read
  synced skill files from the workspace.

### 1.3 Out of scope for this solution

- Non-Atlassian source providers (deferred; see `product/space/roadmap.md`).
- Any runtime service hosted by Space (the platform is package-only).
- A UI or web dashboard.
- Credential management beyond reading a local `.env`.

## 2. Quality goals and constraints

### 2.1 Quality goals (top 5)

Ordered; the top goal dominates when goals conflict.

1. **Multi-tool portability.** Skills must work unchanged across every
   AI coding tool that reads Markdown skill files. No proprietary
   format, no runtime embedding.
2. **Reproducibility and determinism.** Scaffolding the same
   configuration produces the same output. Syncing the same upstream
   state produces the same mirror, byte-identical. Publishing runs
   produce reviewable diffs.
3. **Safety of the existing workspace.** No operation partially
   corrupts a workspace. No operation writes to an external system
   without explicit opt-in. No operation deletes content that the
   consumer added locally.
4. **Fast default path.** CLI startup under 200 ms; a cold scaffold
   under 2 s (excluding package install); a Jira sync of 500 issues
   under 30 s; a Confluence sync of 100 pages under 60 s.
5. **Forward compatibility of conventions.** Consumers do not have to
   re-scaffold or migrate when Space releases a minor version.
   Breaking changes require a major version bump and a migration note.

### 2.2 Constraints

- **Technical:** pnpm workspace; TypeScript for CLIs; Markdown-only for
  skills; Node 18+; no custom runtime.
- **Organisational:** single team of 1-2 engineers; daddia-internal
  users first; OSS deferred.
- **Regulatory:** program mirrors may contain sensitive business data;
  workspace repos inherit the parent organisation's access controls.
  Credentials never committed.

## 3. Solution strategy

Six strategy choices that shape every detailed decision below.

1. **Markdown-only skills.** Every skill is a plain Markdown file the
   agent can read directly. No build, no runtime, no framework. Works
   across tools that support Markdown skill files without coupling to
   any one tool's runtime.
2. **File-system convention as the integration point.** The three
   packages share no runtime imports. Coupling is the `.space/` and
   `skills/` directory conventions the packages all read and write.
   This keeps each package independently testable and releasable.
3. **Faithful upstream mirrors, converted only on egress.** Sync
   writes what the upstream API returned, unchanged. Conversion to
   Markdown, or from Markdown to storage XHTML, happens only when
   publishing back, and only for documents that opt in.
4. **Atomic writes everywhere.** Every operation that touches multiple
   files writes to a sibling `.tmp` directory and renames on success.
   Failed runs never leave a partially-updated mirror.
5. **Opt-in write-back.** No document is published to an external
   system without a dedicated frontmatter field (for example
   `confluence_page_id`). The default for any authored doc is
   workspace-local.
6. **Ship the skill library as a versioned npm package.** Consumers
   install and update skills the same way they install and update
   code dependencies. Improvements are distributed once and adopted
   by every workspace on next install.

How the strategy satisfies the quality goals:

| Quality goal           | Strategy choices that satisfy it |
| ---------------------- | -------------------------------- |
| Multi-tool portability | 1, 6                             |
| Reproducibility        | 3, 4, 6                          |
| Safety                 | 2, 4, 5                          |
| Fast default path      | 1, 2, 6                          |
| Forward compatibility  | 2, 6                             |

## 4. Building block view

### 4.1 Level 1 -- the three packages

| Package             | Role                                           | Language                   | Runtime          |
| ------------------- | ---------------------------------------------- | -------------------------- | ---------------- |
| `@daddia/skills`       | Versioned delivery-activity skill library      | Markdown + a tiny sync bin | npm postinstall  |
| `@daddia/create-space` | Interactive CLI that scaffolds a new workspace | TypeScript (CLI)           | Node (one-shot)  |
| `@daddia/space`        | Operations CLI: sync and (future) publish      | TypeScript (CLI)           | Node (on-demand) |

The packages have no runtime imports between them. Coupling is purely
through the file-system layout they all agree on.

### 4.2 Level 2 -- @daddia/skills

Responsibilities:

- Ship delivery-activity skill files as a versioned npm package.
- Provide a `sync-skills` postinstall bin that copies skills into the
  consuming workspace without deleting project-local skills.

Skill directory convention:

```text
packages/skills/
  {verb}-{topic}/
    SKILL.md           required -- frontmatter + instruction body
    template.md        optional -- output template the skill fills in
    template-*.md      optional -- named variant templates
    examples/          optional -- worked examples the agent reads
    scripts/           optional -- shell or Node scripts the skill invokes
```

Canonical verb set:

| Verb        | Semantics                                                       |
| ----------- | --------------------------------------------------------------- |
| `write-`    | Author a document from scratch                                  |
| `review-`   | Review an existing artefact against stated criteria             |
| `plan-`     | Orchestrate a multi-step planning activity                      |
| `implement` | Execute a story against approved requirements and design        |
| `validate`  | Final acceptance check that an epic is complete                 |
| `create-`   | Automate a process that produces an external artefact (e.g. MR) |

`sync-skills` algorithm:

1. Resolve workspace root -- the directory containing the nearest
   `package.json` above `process.cwd()`.
2. Resolve source from `node_modules/@daddia/skills/`.
3. For each skill directory in source, copy `SKILL.md`, `template*.md`,
   `examples/`, `scripts/` into `{workspace-root}/skills/{skill-name}/`.
4. Never delete a destination skill directory that has no counterpart
   in source (preserves project-local skills).
5. Write `skills/.manifest.json` recording which skills came from
   `@daddia/skills` and at which version.

Published file patterns: `bin/**`, `*/SKILL.md`, `*/template*.md`,
`*/examples/**`, `*/scripts/**`, `README.md`, `CHANGELOG.md`. No
TypeScript source, no `dist/`.

### 4.3 Level 2 -- @daddia/create-space

CLI interface:

```text
pnpm create @daddia/space [project-name] [options]

Options:
  --yes             Accept all defaults; non-interactive (CI-safe)
  --key <KEY>       Override the project key (default: PROJECT-NAME uppercased)
  --dir <path>      Override the output directory (default: {project-name}-space)
  --use-npm | --use-pnpm | --use-yarn | --use-bun
  --skip-install    Skip dependency installation
  --disable-git     Skip git init and initial commit
```

Interactive prompts (skipped when `--yes`, `--key`, or `CI=true`):

1. Project name (required if not provided as positional).
2. Project key (confirm or override the derived default).
3. Source code provider (GitHub default; GitLab, Bitbucket, None).
4. AI tool (Anthropic default; OpenAI, Cursor, Other).
5. Package manager (resolved from environment; confirm or override).

Scaffolding sequence:

1. Validate target directory is empty; prompt to overwrite if not.
2. Check npm registry for a newer version of `@daddia/create-space`; warn
   if stale.
3. Copy `template/default/` into the target directory, interpolating
   template tokens in file content.
4. Write the resolved `.space/config`.
5. Run the selected package manager's install command (unless
   `--skip-install`).
6. Run `git init` and make the initial commit (unless `--disable-git`).
7. Print a success summary with next-step instructions.

Template layout:

```text
template/default/
  AGENTS.md                             templated; describes workspace layout
  README.md
  package.json                          includes @daddia/skills, @daddia/space as
                                        devDependencies; postinstall: sync-skills;
                                        sync: space sync
  .gitignore                            includes .env, work/, node_modules/
  .space/
    config                              templated with project identity + empty sources
    team                                empty roster template
    raci                                empty RACI template
  docs/
    product.md                          product template
    solution.md                         solution template
    roadmap.md                          roadmap template
    backlog.md                          backlog template
  architecture/
    decisions/
      register.md                       ADR register
      adr-template.md                   ADR writing template
  work/                                 gitignored; active in-progress work
```

Symlinks (`.cursor/skills`, `.claude/skills`) are created by the
`sync-skills` postinstall step, not included in the template directory.

### 4.4 Level 2 -- @daddia/space

CLI interface:

```text
space sync [provider]            sync one or all configured sources
space sync jira                  pull Jira project -> .space/sources/jira/
space sync confluence            pull Confluence space -> .space/sources/confluence/
space publish confluence <path>  push opted-in doc to Confluence     [future]
space publish jira               push epic/story backlogs to Jira    [future]
```

Source-file layout:

```text
packages/space/src/
  index.ts                CLI entry point (Commander program registration)
  commands/
    sync.ts               sync command group + provider dispatch
    publish.ts            publish command group [future]
  providers/
    jira/
      client.ts           Jira REST API client (fetch wrapper)
      sync.ts             pull logic -> .space/sources/jira/
      types.ts            Jira API response types
    confluence/
      client.ts           Confluence REST API client
      sync.ts             pull logic -> .space/sources/confluence/
      types.ts            Confluence API response types
  config.ts               reads and validates .space/config (YAML)
  credentials.ts          reads .env via dotenv
  fs.ts                   atomic write helpers: temp-dir -> atomic rename
```

Configuration loading walks up from `process.cwd()` until it finds
`.space/config`; exits non-zero if not found. Credentials are loaded
from `.env` at workspace root. Jira and Confluence share a single
Atlassian credential set because they always run on the same tenant.

## 5. Runtime view

### 5.1 Install-time skill sync

Triggered by `npm install` / `pnpm install` in the consumer workspace.

```text
pnpm install
  -> reads @daddia/skills from node_modules
  -> runs postinstall: sync-skills
     1. Resolve workspace root
     2. Copy skills from node_modules/@daddia/skills/ to workspace skills/
     3. Preserve project-local skills (never delete non-source entries)
     4. Write skills/.manifest.json
```

The agent reads skills from the workspace directly; it does not resolve
them through npm at invocation time.

### 5.2 One-shot scaffold

Triggered by `pnpm create @daddia/space {name}` in an empty directory.

```text
create-space
  -> interactive prompts (or --yes defaults)
  -> copy template/default/ -> targetDir (interpolate tokens)
  -> write .space/config
  -> run pnpm install in targetDir
       postinstall: sync-skills copies skills into workspace
  -> git init && initial commit
  -> print success summary
```

Output is a complete, immediately-usable workspace.

### 5.3 Jira sync (pull)

Triggered by `space sync jira` from the workspace root.

```text
space sync jira
  -> read .space/config (Jira project key)
  -> read .env (Atlassian credentials)
  -> GET /rest/api/3/search?jql=...&fields=*all&maxResults=100
       (paginated via startAt until total reached)
  -> retry on 429 with exponential back-off (1s, 2s, 4s; max 3)
  -> write all output to .space/sources/jira/.tmp/
       issues.json    sorted by key
       epics.json     subset issuetype.name === 'Epic'
       links.json     deduped issuelinks from all issues
       meta.json      sync_at, project, jql, counts
  -> atomic rename .tmp -> .space/sources/jira/
```

On failure: `.tmp/` left in place for inspection; existing mirror
untouched; exit non-zero; error to stderr.

### 5.4 Confluence sync (pull)

Same shape as Jira, with two differences: page bodies are fetched
concurrently with a cap (default 5) to respect rate limits; pages
absent from the current response are removed from the local mirror on
the next sync.

```text
space sync confluence
  -> GET /wiki/api/v2/spaces/{key}/pages?limit=250    (paginated)
  -> for each page: GET /wiki/api/v2/pages/{id}?body-format=storage
       (concurrency capped at 5)
  -> write to .space/sources/confluence/.tmp/
       pages/{id}.xhtml
       pages/{id}.meta.json
       index.json     { pageId: { title, parentId } }
       meta.json      sync_at, space, counts
  -> atomic rename .tmp -> .space/sources/confluence/
```

### 5.5 Publish (future phase)

```text
space publish confluence <path>
  1. Parse confluence_page_id from doc frontmatter (exit if absent)
  2. Convert Markdown body -> Confluence storage XHTML
  3. Read current version number from local mirror
  4. PUT /wiki/api/v2/pages/{id} with version.number + 1 and new body
  5. Overwrite local mirror with the API response
```

A document must explicitly declare `confluence_page_id` in frontmatter
to be publishable. The `space publish jira` command is described
separately in `architecture/space/design/space-artefact-model.md` Section 6.

## 6. Data model and ubiquitous language

### 6.1 Glossary

- **Space** -- the workspace ecosystem and the pnpm monorepo producing
  it (both meanings; context disambiguates).
- **Workspace** -- a directory produced by `create-space`, containing
  `.space/`, `skills/`, and delivery artefacts.
- **Skill** -- a directory under `skills/{verb}-{topic}/` containing
  `SKILL.md` and optional templates, examples, scripts.
- **Source** -- an upstream system (Jira, Confluence, ...) mirrored
  into the workspace.
- **Mirror** -- the local copy of upstream state, stored under
  `.space/sources/{provider}/` in native upstream format.
- **Profile** -- a YAML file in `@daddia/skills/profiles/` listing which
  skills a workspace activates (see
  `architecture/space/design/space-artefact-model.md` Section 3.7).
- **Provider** -- a named upstream integration (`jira`, `confluence`).
- **Consumer workspace** -- any workspace that installs `@daddia/skills`
  and optionally `@daddia/space`.

### 6.2 `.space/config` schema

New keys are additive within the same major version. Breaking changes
require a major version bump and a migration note.

```yaml
project:
  name: string # required; human-readable name
  key: string # required; short uppercase key

space: # optional; autonomous runtime configuration
  providers:
    { provider-name }:
      api_key_env: string
      models:
        { alias }: string

sources: # optional; external data sources
  issues:
    provider: 'jira'
    base_url: string
    project: string
  docs:
    provider: 'confluence'
    space: string
    url: string # informational only

issues: # controls Jira publish (future)
  source: jira # jira | markdown
  key_canonical: jira # jira | local
  ac_format: ears+gherkin
  ac_placement: description
```

### 6.3 `.space/sources/` layout

Content contract between Space and `@daddia/space`. Changes to file names
or shapes are breaking and require a major version bump.

```text
.space/sources/
  jira/
    issues.json          JiraIssue[]     -- native Jira REST v3 shape
    epics.json           JiraIssue[]     -- issuetype Epic only
    links.json           JiraIssueLink[] -- deduped from all issues
    meta.json            JiraSyncMeta
  confluence/
    pages/
      {id}.xhtml         string          -- native Confluence storage XHTML
      {id}.meta.json     ConfluencePageMeta
    index.json           Record<pageId, { title, parentId }>
    meta.json            ConfluenceSyncMeta
```

Meta shapes (TypeScript; the canonical definitions live in
`packages/space/src/providers/{provider}/types.ts`):

```typescript
interface JiraSyncMeta {
  sync_at: string; // ISO 8601
  project: string;
  jql: string;
  counts: { total: number; epics: number; stories: number; bugs: number };
}

interface ConfluencePageMeta {
  id: string;
  title: string;
  parentId: string | null;
  spaceKey: string;
  labels: string[];
  version: number;
  sync_at: string; // ISO 8601
}

interface ConfluenceSyncMeta {
  sync_at: string; // ISO 8601
  space: string;
  counts: { total: number };
}
```

### 6.4 `SKILL.md` frontmatter schema

Current (v0) schema and the v2 schema additions per the artefact model
design.

```yaml
---
name: write-solution # required; matches directory name
description: string # required; LLM router input -- see below
when_to_use: string # required; prose trigger conditions
allowed-tools: [Read, Write] # optional; tools the skill may call
argument-hint: string # optional; e.g. '<scope: platform|domain>'
version: '0.1' # required; bump minor on incompatible changes

# v2 additions (docs/design/space-artefact-model.md Section 3.2):
artefact: solution.md
phase: discovery # discovery | definition | delivery | operation
role: [architect, engineer]
domain: architecture # product | architecture | engineering | ops | qa
stage: stable # experimental | beta | stable | deprecated
consumes: [product.md]
produces: [solution.md]
prerequisites: [product.md]
related: [write-product, write-adr, write-contracts]
tags: [architecture, arc42, c4]
owner: '@daddia'
---
```

The `description` field is authored to Anthropic skill-creator rules:
third person, verb-ing, literal trigger phrases, neighbour
disambiguation, artefact names verbatim, 200-500 chars. See
`architecture/space/design/space-artefact-model.md` Section 3.3.

## 7. Cross-cutting concepts

### 7.1 Security

- **No credentials in source control.** `.env` is gitignored by
  `create-space`. `@daddia/space` reads credentials only via `dotenv`;
  never from config or CLI arguments.
- **No secrets in mirrors.** Jira and Confluence responses may contain
  sensitive business data. Consumer repos inherit the org's access
  controls. Space does not redact or filter mirror content.
- **No write-back without opt-in.** Publish commands require explicit
  frontmatter (`confluence_page_id`, `issues.source: markdown`) per
  target. Default is workspace-local.
- **Path traversal protection.** The skill-sync bin validates that
  every resolved destination path is inside the workspace root before
  writing.
- **Atomic writes.** All sync and scaffold operations write to `.tmp`
  and rename on success. Partial writes cannot corrupt a mirror.
- **API authentication.** Jira and Confluence use HTTP Basic Auth
  (user + Atlassian API token). Tokens should be scoped read-only for
  sync; write scope is required only for publish.

### 7.2 Error handling

Error philosophy: every error exits non-zero, writes to stderr, and
leaves the workspace in the state it was before the command ran.

Per-command behaviours:

**`create-space`:**

| Condition                             | Behaviour                                            |
| ------------------------------------- | ---------------------------------------------------- |
| Target directory not empty            | Prompt to overwrite; exit non-zero if declined       |
| Network unreachable for version check | Warn; continue with installed version                |
| Template copy fails                   | Exit non-zero with failing path + OS error           |
| Package install fails                 | Exit non-zero; instruct user to run install manually |

**`space sync`:**

| Condition                    | Behaviour                                                         |
| ---------------------------- | ----------------------------------------------------------------- |
| `.space/config` not found    | Exit non-zero: "Run from inside a space workspace"                |
| Missing required credential  | Exit non-zero listing missing env var name                        |
| API auth failure (401 / 403) | Exit non-zero immediately; no partial output                      |
| Rate limit (429)             | Retry with backoff 1s, 2s, 4s; max 3; then exit non-zero          |
| Network timeout              | Same retry; exit non-zero if all attempts fail                    |
| Unexpected API shape         | Log warning to stderr with entity ID; continue; flag in meta.json |
| Write failure mid-sync       | Leave `.tmp/`; exit non-zero; existing mirror untouched           |

**`sync-skills`:**

| Condition                    | Behaviour                                      |
| ---------------------------- | ---------------------------------------------- |
| `@daddia/skills` not resolvable | Exit non-zero with install instruction         |
| `skills/` creation fails     | Exit non-zero with OS error                    |
| Individual file copy fails   | Warn to stderr; continue; do not block install |

### 7.3 Observability

Current footprint is minimal -- CLIs print progress lines to stdout
and errors to stderr.

- `stdout` is reserved for human-readable progress; piping is safe.
- `stderr` is reserved for warnings and errors.
- `--json` (future) will emit structured events for CI consumption.
- No telemetry back to Space itself; workspaces are private.

### 7.4 Testing strategy

Per package.

**`@daddia/skills`:**

- Structural lint (CI): every directory contains `SKILL.md`; frontmatter
  includes required fields; directory name matches `name`.
- Description eval loop (CI): 20 representative queries x 3 samples per
  description; block merge on trigger-rate regression
  (`architecture/space/design/space-artefact-model.md` Section 3.4).
- `sync-skills` unit tests (Vitest, mock filesystem): correct file
  copy; manifest written with accurate origins; project-local skills
  preserved; path-traversal inputs rejected.

**`@daddia/create-space`:**

| Layer       | Scope                                                           | Target           |
| ----------- | --------------------------------------------------------------- | ---------------- |
| Unit        | `config.ts`: prompt defaults, key derivation, `--yes` fast path | 100% branches    |
| Unit        | `template.ts`: token interpolation, file copy                   | 100% branches    |
| Unit        | `helpers/`: git, install, pkg-manager, validation               | 100% branches    |
| Snapshot    | Rendered `.space/config` and `AGENTS.md` per LLM + source combo | All permutations |
| Integration | Full scaffold into a temp dir; assert output tree matches       | `--yes` + happy  |

**`@daddia/space`:**

| Layer       | Scope                                                           | Target           |
| ----------- | --------------------------------------------------------------- | ---------------- |
| Unit        | `config.ts`: valid, missing, unknown keys                       | 100% branches    |
| Unit        | `credentials.ts`: dotenv, missing-var detection                 | 100% branches    |
| Unit        | `fs.ts`: atomic rename success, `.tmp` on failure               | 100% branches    |
| Unit        | `providers/jira/sync.ts`: pagination, sort, atomic write        | 100% branches    |
| Unit        | `providers/confluence/sync.ts`: tree walk, XHTML, stale removal | 100% branches    |
| Integration | `space sync jira` against msw fixtures                          | Happy, 429, 401  |
| Integration | `space sync confluence` against msw fixtures                    | Happy, page, del |

No end-to-end tests against live Atlassian in CI. Manual smoke tests
run against `storefront-space` before each release.

### 7.5 Performance targets

| Operation                                   | p95 target | Strategy                               |
| ------------------------------------------- | ---------- | -------------------------------------- |
| `create-space` scaffold (excluding install) | < 2 s      | Local I/O only; no network during copy |
| `pnpm install` after scaffold (cold cache)  | < 60 s     | Acceptable for one-time setup          |
| `sync-skills` postinstall                   | < 1 s      | ~20 files, local filesystem copy       |
| CLI startup (any command)                   | < 200 ms   | Minimal deps; no dynamic requires      |
| `space sync jira` (500 issues)              | < 30 s     | ~5 paginated requests at 100 per page  |
| `space sync confluence` (100 pages)         | < 60 s     | Concurrent page fetches, cap 5         |
| Atomic rename (any sync)                    | < 10 ms    | OS-level rename; same-device only      |

### 7.6 Feature flags and stages

Skills carry a `stage` field (`experimental | beta | stable | deprecated`)
in v2 frontmatter. The `space-index` router and workspace profiles can
filter on stage. `deprecated` skills emit a warning to stderr when
invoked by the router.

## 8. Deployment and environments

### 8.1 Build and release

- **Monorepo orchestration:** pnpm workspaces + turborepo.
- **Versioning:** changesets (`pnpm changeset`) per package.
- **Publish:** `pnpm release` after `pnpm validate` (install, build,
  typecheck, lint, test) passes clean.
- **Distribution channel:** npm registry, public; `@daddia` scope.
- **Consumer update path:** `pnpm update @daddia/skills` (or any package).

### 8.2 CI/CD shape

- **Per-PR:** install, typecheck, lint, test, structural skill lint,
  description eval loop (P1), docs lint (P1).
- **Per-merge to main:** same as PR plus snapshot-test updates.
- **Release:** manual; changeset-driven; no auto-publish from merges.

### 8.3 Environments

Space itself has no environments (no hosted service). Consumer
workspaces may have multiple environments for their own product, but
that is outside Space's concern.

## 9. Architectural decisions (ADR log)

No ADRs have been written yet. Entries are added as decisions arise
per Ambler JBGE (`architecture/space/design/space-artefact-model.md` Section 2.3).
Candidate first ADRs, to be written at the point each decision is
defended:

- **ADR-0001 -- Markdown-only skills over a proprietary DSL.** (captures
  the multi-tool portability call.)
- **ADR-0002 -- File-system convention over runtime coupling between
  the three packages.**
- **ADR-0003 -- Faithful upstream mirrors over normalised schema.**
- **ADR-0004 -- Atomic-write pattern (temp-dir + rename) as the
  universal write primitive.**
- **ADR-0005 -- Single Atlassian credential set for Jira + Confluence.**
- **ADR-0006 -- Issue-key ownership rule (`issues.source: jira | markdown`).**
  (Captured in the artefact model design; formalise as an ADR before
  `space publish jira` ships.)
- **ADR-0007 -- Description-only LLM routing; no embedding search.**
  (Captured in the artefact model design; formalise before the
  `space-index` router ships.)

## 10. Risks, technical debt, and open questions

### 10.1 Risks

1. **`@daddia/space` package home.** Currently inside the space monorepo.
   If the CLI grows substantially, extract to its own repo (following
   the `skills` precedent). No action required now.
2. **Confluence sync volume.** Phase 1 syncs the full space. If page
   count makes syncs slow or diffs noisy, add a label or ancestor-path
   filter. Validate against the real STOREFRONT space before shipping;
   add filtering if `space sync confluence` exceeds the 60 s p95 target.
3. **Incremental Jira sync.** Phase 1 is full-refresh. If any Jira
   project grows beyond ~2,000 issues, add `updatedDate > {last_sync}`
   JQL filtering. Defer until needed.
4. **Publish mechanics.** Markdown -> Confluence XHTML conversion is
   not yet designed. Defer until demand is validated by a real
   storefront-space use case; `confluence_page_id` frontmatter key is
   reserved.
5. **Multi-project Jira.** Config schema currently reserves
   `sources.issues` as a single block. When multi-project is needed,
   extend to an array; additive, backward-compatible schema change.
6. **`sync-skills` copy vs symlink.** Current approach copies files.
   Symlinking directly from `node_modules/@daddia/skills` is cleaner but
   breaks in some monorepo setups. Copy is portable. Revisit if
   copy-on-update friction proves significant.
7. **Skill version staleness.** `SKILL.md` frontmatter carries
   `version` but there is no enforcement that consumers are on the
   latest. Add `sync-skills --check` reporting stale skills if drift
   between projects becomes a problem. Deferred.

### 10.2 Open questions

- **Role views rebuild frequency.** Regenerate on every skill change in
  CI, or on demand via `space sync skills --regenerate-views`? Leaning
  CI; confirm when the router ships.
- **Profile resolution precedence** when `.space/profile.yaml` and
  `--profile` flag conflict on `space sync skills`. Leaning flag
  overrides file for one-off runs.
- **`space publish confluence` conversion library.** Options include
  `remark` + a storage-XHTML rehype plugin, or a bespoke walker. Defer
  until spike work on the first real publish target.
