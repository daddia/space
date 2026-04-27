# Publish Pipeline

How Space moves data between a workspace and external systems — reading from them with `space sync`, writing back with `space publish`.

## The two directions

```
External systems          Space workspace
───────────────           ────────────────────────────────────
Jira              ←sync─  .space/sources/jira/
Confluence        ←sync─  .space/sources/confluence/
Slack             ←sync─  .space/sources/slack/
Vercel            ←sync─  .space/sources/vercel/

workspace docs    ─publish→  Confluence (opt-in per doc)
workspace backlog ─publish→  Jira (source-mode-dependent)
```

**Reading is always safe.** `space sync` never modifies the upstream system. It writes an atomic mirror to `.space/sources/{provider}/` and overwrites the previous mirror on success.

**Writing requires intent.** `space publish` only touches external systems for artefacts that explicitly declare the destination. No file reaches an external system by accident.

## `space sync`

```bash
space sync               # dispatch to all configured sources
space sync jira          # pull Jira project
space sync confluence    # pull Confluence space
```

Each provider writes its mirror atomically: data is written to a temp directory, verified, then renamed into place. On failure the previous mirror is untouched and the temp output is preserved for inspection.

**Idempotency.** Re-running sync when upstream has not changed produces a byte-identical mirror.

**Rate limiting.** Providers apply a concurrency cap and exponential retry consistent with each upstream API's rate limits.

## `space publish jira`

```bash
space publish jira --dry-run    # print plan: N creates, N updates, N no-ops
space publish jira               # apply the plan
```

Parses `domain/{d}/backlog.md` (epics) and `work/{d}/{wp}/backlog.md` (stories) per the backlog schema, diffs against the current mirror in `.space/sources/jira/`, and produces a plan.

### Issue key ownership

Configured per workspace in `.space/config`:

```yaml
issues:
  source: markdown # markdown | jira
```

| Mode               | Who owns the key                         | `space publish jira` behaviour                                                              |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `source: markdown` | Space Markdown — local IDs are canonical | Creates and updates Jira issues; writes Jira key back to `.space/sources/jira/mapping.json` |
| `source: jira`     | Jira — the Jira key is canonical         | Only reconciles updates; never creates issues from Markdown alone                           |

### Field mapping

| Markdown field | Jira field                                                     |
| -------------- | -------------------------------------------------------------- |
| `[ID]` title   | Summary                                                        |
| Status         | Status (via workflow transitions)                              |
| Priority       | Priority                                                       |
| Estimate       | Story points                                                   |
| Epic           | Parent (Epic link)                                             |
| Labels         | Labels                                                         |
| Depends on     | Issue link: blocks / is blocked by                             |
| Deliverable    | Description (first paragraph)                                  |
| Design         | Description (remote link to Confluence)                        |
| Acceptance     | Description checklist or sub-tasks (per `ac_placement` config) |

### AC placement config

```yaml
issues:
  ac_format: ears+gherkin # ears | gherkin | ears+gherkin
  ac_placement: description # description | subtasks
```

Default is `description` (lower Jira noise). `subtasks` enables per-criterion tracking.

## `space publish confluence`

```bash
space publish confluence <path>
```

Publishes a single Markdown file to Confluence. The file must declare a `confluence_page_id` in its frontmatter to opt in:

```yaml
confluence_page_id: 12345678
```

Files without this field are silently skipped. The command converts Markdown to Confluence storage XHTML, increments the page version, and writes the updated mirror back locally.

## Doc-to-destination mapping

| Workspace artefact          | Destination                                      |
| --------------------------- | ------------------------------------------------ |
| `product/{name}/product.md` | Confluence — strategy context page               |
| `product/{name}/roadmap.md` | Confluence + Jira Plans                          |
| `domain/{d}/solution.md`    | Confluence — architecture page linked from epics |
| `domain/{d}/contracts.md`   | Confluence — index page linking to source files  |
| `domain/{d}/backlog.md`     | Jira — one epic per row                          |
| `work/{d}/{wp}/backlog.md`  | Jira — one story per block, under the epic       |
| `work/{d}/{wp}/design.md`   | Confluence — linked from the Jira epic           |

**Principle: Confluence owns prose, Jira owns work.**
