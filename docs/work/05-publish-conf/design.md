---
type: Design
scope: work-package
mode: tdd
work_package: 05-publish-conf
epic: SPACE-05
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
  - docs/work/04-publish-jira/design.md
  - docs/work/05-publish-conf/backlog.md
---

# Design -- Publish pipeline: Confluence (SPACE-05)

TDD-mode design for the **Publish pipeline: Confluence** work package at
`docs/work/05-publish-conf/`, implementing SPACE-05 from
[`docs/backlog.md`](../../backlog.md).

This work package builds on substrate two earlier sprints shipped:

- **SPACE-01** (foundation): `@tpw/space` CLI, `.space/config` and credential
  loading, `atomicWrite()` helper, and the `space sync confluence` mirror at
  `.space/sources/confluence/pages/{id}.xhtml` + `{id}.meta.json`.
- **SPACE-04** (`space publish jira`): the `publish` command shell on the CLI,
  the publisher error philosophy, and the convention that publish runs are
  opt-in via per-document state.

Platform-wide patterns (atomic writes, faithful upstream mirrors, opt-in
write-back, single Atlassian credential set, error philosophy) are
authoritative in [`docs/solution.md`](../../solution.md) and
[`docs/design/space-artefact-model.md`](../../design/space-artefact-model.md)
and are **not** repeated here. Section references appear inline throughout.

The validation target for this WP is `storefront-space`, which already runs
`space sync confluence` against a real Atlassian tenant. One pre-existing
Confluence page is opted in for the smoke test.

## 1. Scope

### 1.1 In scope

Implement `space publish confluence <path>` per
[`docs/solution.md`](../../solution.md) §5.5:

- **New subcommand:** `space publish confluence <path>` registered on the
  `publish` command shell that SPACE-04 introduced. Reads the doc at
  `<path>`, converts the Markdown body to Confluence storage XHTML,
  increments the page version per the local mirror, calls `PUT
  /wiki/api/v2/pages/{id}`, and overwrites the local mirror with the API
  response. Exactly one page per invocation.
- **Frontmatter opt-in.** The publisher only runs against documents whose
  YAML frontmatter declares `confluence_page_id: <string>`. A document
  without that key is rejected with a non-zero exit; this matches
  [`docs/solution.md`](../../solution.md) §3 strategy 5 ("opt-in
  write-back") and §7.1 security ("no write-back without opt-in").
- **Markdown frontmatter parser.** Deterministic split of a `.md` file into
  `{ frontmatter, body }`. `frontmatter.confluence_page_id` is required;
  `frontmatter.title` is optional (used as the Confluence page title when
  present, otherwise the first H1 of the body, otherwise the mirror's
  current title).
- **Markdown to storage-XHTML converter.** Bespoke `unified` /
  `remark-parse` walker producing the v1 storage-XHTML subset listed in
  §4.4. Pure function: `markdown -> string`. Closes
  [`docs/solution.md`](../../solution.md) §10.2 open question about the
  conversion library by ratifying the bespoke walker over a generic
  `rehype-stringify` toolchain.
- **Confluence write client.** Extension to
  `providers/confluence/client.ts`: `getPage` retained for re-reads;
  `updatePage(options): Promise<ConfluencePage>` added. Reuses the
  401/403 / 429 retry shell from the existing `fetchWithRetry` helper.
- **Mirror version handshake.** The publisher reads the current page
  version from `.space/sources/confluence/pages/{id}.meta.json` and uses
  `version.number = mirrorVersion + 1` in the PUT payload. A 409 from
  Confluence is treated as "Confluence has drifted from the local
  mirror" and surfaces as a typed error pointing to `space sync
  confluence` (see §7).
- **Mirror overwrite (atomic).** On a successful PUT the response (XHTML
  body, version, parentId, title) is written back to
  `.space/sources/confluence/pages/{id}.xhtml` and `{id}.meta.json`
  through `atomicWrite()`. The mirror's `index.json` and `meta.json` are
  not touched -- those are owned by `syncConfluence`.
- **No-op short-circuit.** If the converted XHTML is byte-identical to
  the local mirror's XHTML and the resolved title matches the mirror's
  title, the publisher skips the PUT and exits 0 with a "no changes"
  log line. (Confluence rejects PUTs that do not increment the version
  number, and bumping the version for an identical body would be
  observable noise in the page history.)
- **Path-traversal protection.** The `<path>` argument is resolved
  relative to the workspace root; any path that escapes the workspace
  root is rejected before reading. Inherits the protection pattern in
  [`docs/solution.md`](../../solution.md) §7.1.
- **Validation.** End-to-end smoke against `storefront-space`: one
  Markdown doc opted in, one round-trip publish, mirror reflects the
  Confluence response.

### 1.2 Out of scope

- `space publish jira` -- shipped in SPACE-04 (sibling WP).
- **Bulk publish.** The command takes exactly one path. A glob-aware
  bulk variant (e.g. `space publish confluence docs/**/*.md`) is a
  follow-up, deferred until the single-page command has shipped and
  been used.
- **Auto-creation of Confluence pages.** A page must exist in Confluence
  and its id must be known up front; the publisher only updates. New
  pages are created in Confluence and the id pasted back into
  frontmatter manually for v1.
- **Round-trip XHTML -> Markdown.** Conversion is one direction only.
  The local mirror keeps the *XHTML* the API returned; the Markdown
  source is the authored doc. SPACE-05 does not provide a "pull edits
  from Confluence into Markdown" path.
- **Macro support beyond fenced code blocks.** The v1 converter handles
  `<ac:structured-macro ac:name="code">` for fenced code blocks and
  ignores every other Confluence macro. Pages that depend on richer
  macros (info / warning panels, page properties, jira-issue macros)
  must be edited in Confluence directly; round-tripping them through
  Markdown is deferred.
- **Image and attachment publishing.** A Markdown image link rendered
  as an `<img>` tag round-trips; *uploading* a new image attachment to
  Confluence is out of scope. Authors stage images in Confluence first
  and reference the rendered URL in Markdown.
- **Title rename detection.** If the resolved title differs from the
  mirror's title the publisher submits the new title in the PUT payload
  but does not warn about an apparent rename; teams that want stricter
  semantics can opt into a future `--strict-title` flag.
- **Conflict resolution UX.** A 409 surfaces as an error with a one-line
  remediation hint. A "show me the remote diff" affordance is deferred.
- **Confluence Cloud vs Data Center coverage.** This WP targets
  Confluence Cloud REST API v2 only -- the same surface
  `space sync confluence` already targets. Data Center support is not
  pursued.
- **`--dry-run` mode.** SPACE-04 has it because the Jira side has a
  meaningful plan to print; the Confluence side has at most a "the body
  changed" or "no change" outcome which the no-op short-circuit already
  covers. A dry-run flag is not needed for v1.
- **Concurrent publishes.** A single `space publish confluence` run
  publishes one document. Two concurrent runs against the same
  workspace are unsafe (the mirror overwrite races). Documented as a
  user constraint; not enforced via locking.

### 1.3 Capabilities this work package delivers

Mapped to story-level AC in `./backlog.md`:

- **Frontmatter parser** (split + opt-in validation): SPACE-05-01.
- **Markdown to storage-XHTML converter** (v1 subset): SPACE-05-02.
- **Confluence `updatePage` client method**: SPACE-05-03.
- **Publish orchestration** (read mirror, convert, PUT, overwrite mirror):
  SPACE-05-04.
- **No-op short-circuit and idempotency**: SPACE-05-05.
- **CLI wiring under the `publish` command shell**: SPACE-05-06.
- **Error taxonomy + per-code surface treatment**: SPACE-05-07.
- **`storefront-space` smoke validation**: SPACE-05-08.

## 2. Architecture fit

This WP adds one new subcommand (`publish confluence`) and one new
conversion module to `@tpw/space`. It introduces no new packages, no new
patterns, and no new external network surface -- the publisher reuses the
Confluence REST client SPACE-01 shipped, extending it with a single write
method.

```text
space CLI (Commander)
  +-- sync                           (SPACE-01, KEEP)
  +-- publish                        (SPACE-04, EVOLVE: register confluence)
        +-- jira [--dry-run]         (SPACE-04, KEEP)
        +-- confluence <path>        (THIS WP, NEW)
              |
              +-- findWorkspaceRoot()              (SPACE-01, KEEP)
              +-- loadCredentials()                (SPACE-01, KEEP)
              +-- resolveDocPath(<path>, root)     (NEW)
              +-- readDoc(absPath)                 (NEW: split frontmatter)
              +-- requireConfluencePageId(doc)     (NEW: opt-in gate)
              +-- loadMirrorMeta(root, pageId)     (NEW: read .meta.json)
              +-- loadMirrorXhtml(root, pageId)    (NEW: read .xhtml)
              +-- convertMarkdownToStorage(body)   (NEW)
              +-- if convertedXhtml == mirrorXhtml && title == mirrorTitle:
              |     log "no changes"; exit 0
              +-- buildUpdatePayload(...)          (NEW)
              +-- confluenceClient.updatePage(...) (NEW method on existing client)
              +-- writeMirror(root, response)      (NEW: atomicWrite per page)
              +-- print summary
```

References in [`docs/solution.md`](../../solution.md):

- §3 Strategy 3 (faithful upstream mirrors): the publisher does not edit
  the mirror's shape -- the API response after a PUT is written back
  verbatim, exactly as `syncConfluence` would have written it.
- §3 Strategy 4 (atomic writes): the per-page mirror overwrite goes
  through `atomicWrite()` even though only two files change; the page
  body and meta must be replaced as a unit.
- §3 Strategy 5 (opt-in write-back): the `confluence_page_id` frontmatter
  field is the opt-in switch. Without it the publisher refuses to run.
- §4.4 (`@tpw/space` source layout): the new files under
  `providers/confluence/` are placed exactly where §4.4 already reserves
  them.
- §5.5 (publish runtime view): the five-step pseudocode in §5.5 is the
  authoritative behaviour; this WP implements it.
- §6.4 (`SKILL.md` frontmatter schema, illustrative `confluence_page_id`
  usage): the same field name is reused for any publishable doc, not
  just skill files.
- §7.1 Security (no write-back without opt-in, atomic writes, API auth,
  path-traversal protection): inherited verbatim.
- §7.2 Error handling: the per-command table is extended with a
  `space publish confluence` row in §7 below.
- §10.2 Open questions: this WP closes the "conversion library" question
  by choosing the bespoke `unified` walker.

References in
[`docs/design/space-artefact-model.md`](../../design/space-artefact-model.md):

- §6.1 -- doc-to-destination mapping (this WP delivers the prose-doc
  rows: `docs/product.md`, `docs/solution.md`, `domain/{d}/product.md`,
  `domain/{d}/solution.md`, `domain/{d}/contracts.md`,
  `work/{d}/{wp}/design.md`).
- §6.3 -- `space publish confluence` is named there as the analogue of
  `space publish jira`.

## 3. Files and components

### 3.1 New files

```text
packages/space/src/
  providers/
    confluence/
      publish.ts                      NEW   orchestration: read doc, convert, PUT, overwrite mirror
      publish.test.ts                 NEW   unit tests
      publish-types.ts                NEW   PublishResult, PublishErrorCode, internal types
      frontmatter.ts                  NEW   split YAML frontmatter from Markdown body
      frontmatter.test.ts             NEW   unit tests
      markdown-to-storage.ts          NEW   Markdown -> storage XHTML converter
      markdown-to-storage.test.ts     NEW   unit + golden-file tests (subset coverage)
      markdown-to-storage.fixtures.ts NEW   md/xhtml pairs covering the v1 subset
      mirror.ts                       NEW   read/write helpers for .space/sources/confluence/pages/
      mirror.test.ts                  NEW   unit tests with tmp dirs
```

### 3.2 Files modified

- `src/index.ts` -- register the publish command (already added by
  SPACE-04 -- this WP makes no further change to the entry point).
- `src/commands/publish.ts` -- add the `confluence <path>` subcommand
  alongside the existing `jira [--dry-run]` subcommand. Only the
  subcommand registration is new; SPACE-04 owns the parent shell.
- `src/providers/confluence/client.ts` -- add an `updatePage(options:
  UpdatePageOptions): Promise<ConfluencePage>` method on
  `ConfluenceClient`. Refactor the existing `fetchWithRetry` helper
  into a body-aware `request<T>(url, init)` (additive, no breaking
  signature change for `listPages` / `getPage` / `getPages`). Add two
  typed errors: `ConfluenceVersionConflictError` (409) and
  `ConfluenceNotFoundError` (404).
- `src/providers/confluence/types.ts` -- add `UpdatePagePayload` matching
  `PUT /wiki/api/v2/pages/{id}` and `UpdatePageOptions`. Existing types
  unchanged.
- `src/providers/confluence/client.test.ts` -- add tests for the new
  `updatePage` method (happy, 401, 404, 409, 429 with retries, 5xx).
  Existing tests unchanged.

### 3.3 Files NOT modified

- `src/credentials.ts` -- the publisher uses the same `ATLASSIAN_*` env
  vars. The token must already grant Confluence write scope (the v2
  `pages` write API requires the `write:page:confluence` scope on a
  granular API token, or write permission on a classic API token).
  Documented in the README update bundled with this WP.
- `src/fs.ts` -- `atomicWrite()` reused verbatim for the per-page
  mirror overwrite.
- `src/config.ts` -- no schema changes. Publish is opted in per
  document, not per workspace.
- `src/providers/confluence/sync.ts` -- when SPACE-01 lands it; the
  publisher reads the mirror that `syncConfluence` produced but does
  not call back into it.
- `src/providers/jira/*` -- untouched by this WP.
- `src/commands/sync.ts` -- untouched.

## 4. Data contracts

### 4.1 `UpdatePageOptions` and `UpdatePagePayload`

```typescript
// File: packages/space/src/providers/confluence/types.ts (additions)

/** Body sent in PUT /wiki/api/v2/pages/{id}. */
export interface UpdatePagePayload {
  id: string;
  status: 'current';
  title: string;
  body: {
    representation: 'storage';
    value: string; // storage XHTML
  };
  version: {
    number: number; // must be currentVersion + 1
    message?: string;
  };
}

/** Caller-facing options for `client.updatePage`. */
export interface UpdatePageOptions {
  id: string;
  title: string;
  storageBody: string;
  /** The version *currently* in Confluence; the client sends this+1. */
  currentVersion: number;
  /** Optional human-readable change message recorded in page history. */
  versionMessage?: string;
}
```

### 4.2 `ConfluenceClient.updatePage` method

```typescript
// File: packages/space/src/providers/confluence/client.ts (additions)

export interface ConfluenceClient {
  listPages(options: ListPagesOptions): Promise<ConfluencePageSummary[]>;
  getPage(options: GetPageOptions): Promise<ConfluencePage>;
  getPages(ids: string[]): Promise<ConfluencePage[]>;
  /** PUT /wiki/api/v2/pages/{id}. Returns the updated page (with new version). */
  updatePage(options: UpdatePageOptions): Promise<ConfluencePage>;
}

export class ConfluenceVersionConflictError extends Error {
  readonly pageId: string;
  readonly attemptedVersion: number;
  constructor(pageId: string, attemptedVersion: number) {
    super(
      `Confluence rejected the update for page ${pageId} at version ${attemptedVersion}. ` +
        `The remote page has been edited since the last sync. Run \`space sync confluence\` ` +
        `and re-publish.`,
    );
    this.name = 'ConfluenceVersionConflictError';
    this.pageId = pageId;
    this.attemptedVersion = attemptedVersion;
  }
}

export class ConfluenceNotFoundError extends Error {
  readonly pageId: string;
  constructor(pageId: string) {
    super(
      `Confluence page ${pageId} not found. The id in frontmatter may be wrong, ` +
        `or the page may have been deleted.`,
    );
    this.name = 'ConfluenceNotFoundError';
    this.pageId = pageId;
  }
}
```

### 4.3 Frontmatter parser shape

```typescript
// File: packages/space/src/providers/confluence/frontmatter.ts

export interface ParsedDoc {
  /** Raw frontmatter object (YAML parsed). */
  frontmatter: Record<string, unknown>;
  /** Markdown body, frontmatter delimiters and body removed; trailing newline preserved. */
  body: string;
  /** Source location for error messages. */
  source: { file: string };
}

/**
 * Splits a Markdown file into frontmatter and body. Tolerates files without
 * frontmatter (returns `{ frontmatter: {}, body: <raw> }`). Throws
 * `FrontmatterParseError` only on malformed YAML between delimiters.
 */
export function parseDoc(absPath: string, raw: string): ParsedDoc;

/**
 * Returns the publishable shape if the doc is opted in; throws
 * `MissingOptInError` otherwise. Opt-in keys (only the first is required):
 *   - confluence_page_id: string  (required; non-empty)
 *   - title: string               (optional; otherwise first H1; otherwise mirror title)
 */
export function requireConfluenceOptIn(doc: ParsedDoc): {
  pageId: string;
  titleOverride?: string;
  body: string;
};

export class FrontmatterParseError extends Error {
  readonly file: string;
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = 'FrontmatterParseError';
    this.file = file;
  }
}

export class MissingOptInError extends Error {
  readonly file: string;
  constructor(file: string) {
    super(
      `${file}: missing \`confluence_page_id\` in frontmatter. ` +
        `Add the key to opt this document into \`space publish confluence\`.`,
    );
    this.name = 'MissingOptInError';
    this.file = file;
  }
}
```

### 4.4 Markdown to storage-XHTML converter -- v1 subset

The converter is a `unified` pipeline: `remark-parse` produces an mdast
tree which a bespoke walker serialises to storage-XHTML. The supported
subset is the union of constructs the four canonical artefacts
(`product.md`, `solution.md`, `roadmap.md`, `backlog.md`) actually use,
plus the few ASCII-art / table constructs that show up in
`design/space-artefact-model.md`.

```typescript
// File: packages/space/src/providers/confluence/markdown-to-storage.ts

/**
 * Converts a Markdown body (no frontmatter) to Confluence storage XHTML.
 * Pure function: same input -> same output.
 *
 * Throws `UnsupportedMarkdownError` if the source contains a construct
 * outside the v1 subset (e.g. directive-like extensions, custom HTML
 * blocks the walker does not recognise).
 */
export function markdownToStorage(markdown: string): string;

export class UnsupportedMarkdownError extends Error {
  readonly nodeType: string;
  readonly line: number;
  constructor(nodeType: string, line: number, hint?: string) {
    super(
      `Unsupported Markdown construct \`${nodeType}\` at line ${line}` +
        (hint ? ` -- ${hint}` : '') +
        `. The v1 publisher does not yet round-trip this through Confluence storage XHTML.`,
    );
    this.name = 'UnsupportedMarkdownError';
    this.nodeType = nodeType;
    this.line = line;
  }
}
```

The v1 supported constructs:

| mdast node | Storage-XHTML output |
| --- | --- |
| `heading` | `<h1>` .. `<h6>` |
| `paragraph` | `<p>...</p>` |
| `text` | XML-escaped text |
| `strong` | `<strong>...</strong>` |
| `emphasis` | `<em>...</em>` |
| `inlineCode` | `<code>...</code>` |
| `code` (fence) | `<ac:structured-macro ac:name="code">...<ac:plain-text-body><![CDATA[...]]></ac:plain-text-body></ac:structured-macro>` (lang via `<ac:parameter ac:name="language">`) |
| `link` | `<a href="...">...</a>` |
| `image` | `<img src="..." alt="..."/>` (no attachment upload; see §1.2) |
| `list` + `listItem` | `<ul>` / `<ol>` with nested `<li>` |
| `blockquote` | `<blockquote>...</blockquote>` |
| `thematicBreak` | `<hr/>` |
| `table` (gfm) | `<table><thead><tr><th>...</th></tr></thead><tbody>...</tbody></table>` |
| `break` | `<br/>` |
| `html` block | passed through verbatim **iff** it parses as well-formed XHTML; `UnsupportedMarkdownError` otherwise |

Anything outside this list (definition lists, footnotes, custom
directives, raw HTML that does not parse as XHTML) raises
`UnsupportedMarkdownError`. The error message names the offending node
type and line, so the author either restructures the Markdown or files
a follow-up to widen the subset.

### 4.5 Mirror helpers

```typescript
// File: packages/space/src/providers/confluence/mirror.ts
import type { ConfluencePageMeta } from './types.js';

/**
 * Reads `.space/sources/confluence/pages/{id}.meta.json`.
 * Throws `MirrorPageMissingError` if the meta file does not exist.
 */
export async function readMirrorMeta(
  workspaceRoot: string,
  pageId: string,
): Promise<ConfluencePageMeta>;

/**
 * Reads `.space/sources/confluence/pages/{id}.xhtml`. Returns the raw XHTML.
 * Throws `MirrorPageMissingError` if the XHTML file does not exist.
 */
export async function readMirrorXhtml(
  workspaceRoot: string,
  pageId: string,
): Promise<string>;

/**
 * Replaces both `{id}.xhtml` and `{id}.meta.json` for a single page atomically.
 * The two files are written under a per-page temp dir, then renamed into
 * place; the page directory is not destroyed (other pages are untouched).
 *
 * Implementation note: `atomicWrite()` swaps a directory; here we swap
 * the *files* by writing to `{id}.xhtml.tmp` and `{id}.meta.json.tmp`
 * then renaming each. A failure between the two renames leaves a stale
 * `{id}.meta.json.tmp` for inspection; the original `.xhtml` and
 * `.meta.json` remain consistent.
 */
export async function writeMirrorPage(
  workspaceRoot: string,
  page: ConfluencePage,
  spaceKey: string,
): Promise<void>;

export class MirrorPageMissingError extends Error {
  readonly pageId: string;
  constructor(pageId: string) {
    super(
      `No local mirror entry for Confluence page ${pageId}. Run ` +
        `\`space sync confluence\` to populate the mirror, then retry.`,
    );
    this.name = 'MirrorPageMissingError';
    this.pageId = pageId;
  }
}
```

### 4.6 `PublishResult`

```typescript
// File: packages/space/src/providers/confluence/publish-types.ts

export type PublishOutcome = 'updated' | 'no-change';

export interface PublishResult {
  outcome: PublishOutcome;
  pageId: string;
  title: string;
  /** Version after the run. Equal to `before` when outcome is 'no-change'. */
  versionAfter: number;
  versionBefore: number;
  bytesIn: number; // size of converted XHTML
  bytesOnDisk: number; // size of the new mirror XHTML (== bytesIn on update)
  durationMs: number;
}
```

## 5. Runtime view

The publisher runs in a single phase: read the doc, convert, decide
whether to PUT, write back the mirror. The flow is straight-line; there
is no plan/apply split (Confluence has no batchable operations).

### 5.1 Happy path

```text
space publish confluence <path>
  -> findWorkspaceRoot()
     loadCredentials()                   -- fail-fast on missing tokens
  -> resolveDocPath(<path>, root)
        normalise to absolute path
        reject if path escapes workspace root           ({SOLUTION} §7.1)
  -> readDoc(absPath)
        readFile + parseDoc
        build ParsedDoc { frontmatter, body }
  -> requireConfluenceOptIn(doc)
        extract { pageId, titleOverride?, body }
        on missing pageId -> MissingOptInError
  -> resolveTitle(titleOverride, body, mirrorTitle)
        precedence: frontmatter.title > first H1 of body > mirror title
  -> readMirrorMeta(root, pageId)
        on miss -> MirrorPageMissingError
        meta provides currentVersion, currentTitle, parentId
  -> readMirrorXhtml(root, pageId)
  -> markdownToStorage(body)
        on unsupported node -> UnsupportedMarkdownError
        produce storageXhtml: string
  -> if storageXhtml === mirrorXhtml && resolvedTitle === currentTitle:
        log "no changes"; result.outcome = 'no-change'
        skip the PUT and the mirror overwrite
        exit 0
  -> confluenceClient.updatePage({
        id: pageId,
        title: resolvedTitle,
        storageBody: storageXhtml,
        currentVersion,
        versionMessage: 'space publish confluence',
     })
        -> PUT /wiki/api/v2/pages/{id}
           body: UpdatePagePayload
           on 200 -> return ConfluencePage (new version, server-canonical title)
           on 401/403 -> ConfluenceAuthError                ({SPACE-01})
           on 404 -> ConfluenceNotFoundError
           on 409 -> ConfluenceVersionConflictError
           on 429 -> retry shell 1s/2s/4s; exit on third   ({SPACE-01})
           on 5xx -> generic; surface as `UNKNOWN`
  -> writeMirrorPage(root, response, spaceKey)
        atomic per-file rename for .xhtml and .meta.json
  -> print summary { outcome, pageId, title, versionBefore, versionAfter }
  -> exit 0
```

### 5.2 No-op short-circuit

The short-circuit is the publisher's main correctness lever for
idempotency. Confluence requires the version number to be strictly
greater than the current; pushing the same body twice would still
land in the page history, which the team must not see.

```text
re-run with no source change
  -> resolveDocPath, readDoc, requireConfluenceOptIn  (unchanged)
  -> readMirrorMeta, readMirrorXhtml                  (unchanged)
  -> markdownToStorage(body)                          (unchanged -- pure)
  -> storageXhtml === mirrorXhtml      true
     resolvedTitle === currentTitle    true
  -> no PUT issued
  -> log "no changes"; exit 0
```

A third run is identical. The second observable effect is zero (no
remote write, no mirror touch).

### 5.3 Mirror-drift handling

When the local mirror is stale (someone edited the page in Confluence
since the last sync) the publisher cannot guarantee a clean overwrite:

```text
publisher PUT with version = mirror.version + 1
Confluence rejects with 409 (its current version is mirror.version + N)
  -> ConfluenceVersionConflictError surfaces to the CLI
  -> stderr: "Confluence has drifted from the local mirror.
              Run `space sync confluence` and re-publish."
  -> exit 1
```

The publisher does **not** auto-rebase. Forcing a rebase risks losing
edits made in Confluence. The user explicitly resyncs (which writes the
remote XHTML back into the mirror), reads the diff against their
Markdown source, reconciles, and re-publishes.

### 5.4 Mirror-write failure (rare)

If `writeMirrorPage` fails after the PUT has already succeeded, the
remote and the local mirror diverge: the remote has the new version,
the mirror still shows the old one. The publisher surfaces the failure
with a `WRITE_FAILED` code (§7) and exits non-zero. The next
`space sync confluence` reconciles the mirror with the remote, after
which a re-publish is a no-op. Documented as a known recovery path.

## 6. Cross-squad coordination

This WP is platform-internal; no cross-squad interface. The validation
target (`storefront-space`) is owned by the same team that owns Space.
The Atlassian REST API contract is external but stable; `space sync
confluence` already depends on it. No new auth scope is added beyond
write permission to the configured space, which the consumer's API
token must already grant.

## 7. Error paths

The publisher inherits the philosophy in
[`docs/solution.md`](../../solution.md) §7.2: every error exits non-zero,
writes to stderr, and leaves the workspace in the state it was in before
the command ran (with one documented exception in `WRITE_FAILED`,
covered below). Typed error codes:

```typescript
// File: packages/space/src/providers/confluence/publish-types.ts

export type PublishConfluenceErrorCode =
  | 'PATH_OUTSIDE_WORKSPACE'
  | 'DOC_NOT_FOUND'
  | 'FRONTMATTER_INVALID'
  | 'MISSING_OPT_IN'
  | 'UNSUPPORTED_MARKDOWN'
  | 'MIRROR_PAGE_MISSING'
  | 'CONFLUENCE_AUTH_FAILED'
  | 'CONFLUENCE_NOT_FOUND'
  | 'CONFLUENCE_VERSION_CONFLICT'
  | 'CONFLUENCE_RATE_LIMIT'
  | 'CONFLUENCE_FIELD_REJECTED'
  | 'NETWORK_ERROR'
  | 'WRITE_FAILED'
  | 'UNKNOWN';
```

Per code:

| Code | Behaviour |
| --- | --- |
| `PATH_OUTSIDE_WORKSPACE` | Path resolution fails before any file read. Stderr names the resolved absolute path. No remote calls, no writes. |
| `DOC_NOT_FOUND` | `<path>` does not exist. Stderr names the path. No remote calls, no writes. |
| `FRONTMATTER_INVALID` | YAML frontmatter is present but malformed. Stderr surfaces the YAML parser error. |
| `MISSING_OPT_IN` | `confluence_page_id` is absent from frontmatter. Stderr quotes the file path and the required key. Exit 1. Default safe outcome -- the publisher *only* runs against opted-in docs. |
| `UNSUPPORTED_MARKDOWN` | Converter encountered a node outside the v1 subset. Stderr names the node type and source line. No PUT, no mirror touch. |
| `MIRROR_PAGE_MISSING` | No `.meta.json` for the configured page id. Stderr instructs the user to run `space sync confluence`. No PUT, no mirror touch. |
| `CONFLUENCE_AUTH_FAILED` | First 401/403 from Confluence aborts immediately (re-uses `ConfluenceAuthError` from `client.ts`). No mirror touch. |
| `CONFLUENCE_NOT_FOUND` | 404 on the configured page id. Stderr suggests checking the id in frontmatter. No mirror touch. |
| `CONFLUENCE_VERSION_CONFLICT` | 409 from the PUT. Stderr instructs the user to run `space sync confluence` and re-publish. No mirror touch. |
| `CONFLUENCE_RATE_LIMIT` | Inherits the 1s/2s/4s retry shell from `client.ts`. After three retries the run aborts. No mirror touch. |
| `CONFLUENCE_FIELD_REJECTED` | 400 from the PUT (e.g. malformed storage XHTML the server rejects). Stderr surfaces the response body. No mirror touch -- the converter widens its subset on the next release. |
| `NETWORK_ERROR` | Treated as transient; same retry shell as `CONFLUENCE_RATE_LIMIT`. |
| `WRITE_FAILED` | The PUT succeeded but writing the local mirror failed. Stderr explains that the remote is updated and the mirror is stale; suggests `space sync confluence` to reconcile. **This is the one case where the workspace ends in a different state than it began.** Documented as a known recovery path. |
| `UNKNOWN` | Catch-all (e.g. unexpected 5xx). Logs full context and aborts non-zero. |

The order of the `MIRROR_PAGE_MISSING` and `MISSING_OPT_IN` checks matters:
the opt-in check runs first (cheaper, file-only), so the user is told why
their unopted-in doc is being rejected before they are told to sync the
mirror.

## 8. Observability

Per [`docs/solution.md`](../../solution.md) §7.3, observability is
human-readable stdout / stderr plus a final structured summary; no
telemetry back to Space.

This WP introduces:

- **Pre-PUT line (stdout).** Names the doc, the page id, the resolved
  title, and the converted XHTML byte count:

  ```text
  publishing docs/solution.md to confluence page 12345 ("Solution -- Space")
    converted body: 18.4 KB storage XHTML
  ```

- **Post-PUT summary (stdout).** Outcome, version transition, duration:

  ```text
  updated 12345 ("Solution -- Space"): version 7 -> 8 in 412 ms
  ```

  No-op variant:

  ```text
  no changes for 12345 ("Solution -- Space") (version 7)
  ```

- **Errors (stderr).** One typed error message per failure plus a final
  non-zero exit. The error message contains the remediation hint.
- **Exit codes.** `0` clean run (including no-op); `1` any error. No
  `2` schema-only branch -- there is no plan phase to short-circuit.
- **`--json` mode.** Reserved (mirrors the `--json` future flag in
  `solution.md` §7.3) but **deferred** -- the human format is
  sufficient for the storefront validation target.

## 9. Testing strategy

| Layer | Scope | Target |
| --- | --- | --- |
| Unit (Vitest) | `frontmatter.ts`: present + missing + malformed; opt-in present + missing | 100% branches |
| Unit (Vitest) | `markdown-to-storage.ts`: every supported node type, every unsupported branch | 100% branches + golden fixtures |
| Unit (Vitest) | `mirror.ts`: read existing meta + xhtml; missing meta -> `MirrorPageMissingError`; atomic write succeeds + fails halfway | 100% branches |
| Unit (Vitest) | `publish.ts`: orchestration with mock client and mock fs -- happy, no-op, version conflict, mirror-page-missing | 100% branches |
| Unit (Vitest) | `client.ts` `updatePage` extension: happy + 401 + 404 + 409 + 429 retries + 5xx | 100% branches |
| Integration (Vitest + msw) | `space publish confluence <path>` against a fixture workspace + msw Confluence: PUT issued + mirror overwritten | Required release gate |
| Integration (Vitest + msw) | No-op: re-run against the same fixture without source change -- assert no PUT issued | Required release gate |
| Integration (Vitest + msw) | 409 mid-run: assert error message, mirror untouched | Required release gate |
| Integration (Vitest + msw) | `WRITE_FAILED` (induce fs error after PUT): assert recovery message and exit code | Required release gate |
| Golden file (Vitest) | Convert a snapshot of `docs/solution.md` to XHTML; compare byte-for-byte | Catches converter regressions |
| Smoke (manual) | `storefront-space`: publish a single opted-in page round-trip against a real space; review the page history | Pass before 0.5.0 |

No live-Atlassian tests in CI per
[`docs/solution.md`](../../solution.md) §7.4. msw fixtures cover the
v2 REST surface this WP touches (the same surface
`space sync confluence` already exercises).

The `markdown-to-storage.fixtures.ts` file pairs short Markdown snippets
with the expected XHTML; tests assert exact equality. The fixture set
is the executable spec for the v1 subset -- adding a supported node
means adding a fixture pair.

## 10. Acceptance gates (subset of `solution.md` §2.1 for this WP)

The publisher must satisfy the subset of Space's quality goals that bind
on a write-back operation:

- **Multi-tool portability.** Not directly tested by this WP; the
  Markdown source remains a plain Markdown file. (Goal 1.)
- **Reproducibility.** `markdownToStorage(body)` is a pure function:
  same Markdown -> byte-identical XHTML across runs. The no-op
  short-circuit means a re-run with no source change yields zero
  remote effect. (Goal 2.)
- **Safety of the existing workspace.** No publish without
  `confluence_page_id` in frontmatter. The mirror overwrite is atomic
  per file. The one documented divergence path (`WRITE_FAILED`) is
  recoverable via `space sync confluence`. No path outside the
  workspace root is read. (Goal 3.)
- **Fast default path.** A single-page publish of a 20 KB doc finishes
  under 3 s end-to-end on a warm filesystem (network-bound; aligns
  with `solution.md` §7.5). (Goal 4.)
- **Forward compatibility.** Adding a Markdown node to the v1 subset is
  additive; the converter exposes new nodes via new fixture pairs and
  is released as a minor version. The `confluence_page_id` frontmatter
  key is reserved by `solution.md` §10.2 risk 4 and cannot collide.
  (Goal 5.)
- **Quality bars.** `pnpm typecheck && pnpm test && pnpm lint` clean
  across `@tpw/space`. Every new file ships with the test files listed
  in §3.1. `pnpm validate` clean from the monorepo root before the
  0.5.0 changeset is published.

## 11. Handoff to later WPs

When SPACE-05 closes the following surface is stable and downstream WPs
can rely on it:

- **The Markdown to storage-XHTML converter.** A pure function with a
  golden-file fixture set. SPACE-09 (skill-library expansion) and any
  future "publish skill descriptions to Confluence" workstream reuse it
  verbatim.
- **The frontmatter parser.** `parseDoc()` and `requireConfluenceOptIn()`
  are reusable for any future opt-in pattern (e.g. `notion_page_id`,
  `gitbook_page_id`); only the `requireXOptIn()` helper changes.
- **The Confluence write client.** The `updatePage` method and its two
  typed errors (`ConfluenceVersionConflictError`,
  `ConfluenceNotFoundError`) form the write surface a future
  bulk-publish command (`space publish confluence <glob>`) will call.
- **The per-page mirror overwrite pattern.** `writeMirrorPage()` is the
  template for any future per-record write inside a multi-record mirror
  (e.g. a future `space publish confluence` bulk run that updates many
  pages in one invocation; or a multi-project Jira sync per SPACE-08
  that needs to refresh one project at a time).
- **The publish-command shell.** SPACE-04 introduced the shell;
  SPACE-05 demonstrates the second subcommand. Future destinations
  (`space publish slack`, `space publish vercel`) follow the same
  registration shape.

## 12. Open questions for this WP

1. **Conversion library: bespoke walker vs `rehype-stringify` plus a
   storage-XHTML rehype plugin.** Recommended default: bespoke walker
   built on `unified` + `remark-parse`. Closes
   [`docs/solution.md`](../../solution.md) §10.2 question 3. Bespoke is
   smaller, has zero generic-rehype surface to keep aligned with the
   storage-XHTML quirks (CDATA-wrapped code bodies, `ac:structured-macro`
   wrappers), and is testable with simple golden fixtures. The cost is
   adding new node types one fixture at a time -- acceptable given the
   v1 scope. **Owner:** @horizon-platform. **Blocks:** SPACE-05-02
   acceptance.
2. **Title precedence.** Three plausible sources: frontmatter `title`,
   first `<h1>` of the body, current Confluence title. Recommended
   precedence (in §5.1): frontmatter first, body H1 second, mirror
   third. The mirror fallback prevents accidental retitle when an author
   removes the H1. **Owner:** @horizon-platform. **Blocks:** SPACE-05-04
   release notes.
3. **Version-message text.** The PUT payload supports a
   `version.message` recorded in page history. Default proposed:
   `"space publish confluence"`. An optional `--message <text>` CLI
   flag could let the user supply a richer message; deferred unless
   the storefront review asks for it. **Owner:** @horizon-platform.
   **Blocks:** none.
4. **Markdown lists with strict `loose` semantics.** GitHub Flavored
   Markdown distinguishes loose vs tight lists; storage-XHTML does
   not. Default proposed: render every list as tight (`<li>` content
   inline; no inner `<p>`). Authors who need paragraph-per-item must
   use a single paragraph per `<li>` followed by a blank line --
   handled by the walker but not exposed as a configuration knob.
   **Owner:** @horizon-platform. **Blocks:** none.
5. **Image attachment policy.** v1 round-trips `<img src>` without
   uploading the binary. If the source path is a relative file
   reference (e.g. `./diagram.png`) the image renders broken in
   Confluence. Recommended: error with a typed
   `UNSUPPORTED_MARKDOWN` for relative image paths in v1; absolute
   URLs pass through. Bulk-attachment upload is a follow-up WP.
   **Owner:** @horizon-platform. **Blocks:** SPACE-05-02 fixture set.
6. **Mirror-write atomicity granularity.** `atomicWrite()` swaps a
   directory; the per-page write swaps two files. A failure between
   the two file renames is the only divergence path inside the
   mirror. Recommended: leave both `.tmp` files in place for
   inspection on a partial failure (mirrors the directory-swap
   semantics) and surface `WRITE_FAILED`. Documented in §5.4 already;
   confirm the recovery story is acceptable in code review.
   **Owner:** @horizon-platform. **Blocks:** none.
