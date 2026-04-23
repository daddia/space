---
title: Configure your space
description: Wire your workspace to Jira, Confluence, and other external sources using .space/config.
---

`.space/config` is the identity and sources layer for a delivery workspace. It tells Space who the project is, where its external data lives, and what credentials to use when syncing.

## What you'll learn

- The structure of `.space/config` and what each field does
- How to register Jira, Confluence, GitLab, Slack, and Vercel sources
- How to provide credentials without committing secrets
- How to run a sync and what it produces

## The `.space/` directory

| Path | Contents |
|---|---|
| `.space/config` | Project identity and source references (committed) |
| `.space/team` | Team members and roles (committed) |
| `.space/raci` | Responsibility matrix (committed) |
| `.space/sources/` | Native-format mirrors of external sources (committed) |

## Configure project identity

The `project` block identifies the workspace. Every space needs it.

```yaml
project:
  name: Storefront
  key: STORE
  description: Temple & Webster's new Next.js storefront.
```

`key` is used as a prefix for backlog item IDs (e.g. `STORE-001`). Use a short uppercase acronym that matches your Jira project key.

## Register sources

The `sources` block wires the workspace to external systems. Add only the sources your project uses.

```yaml
sources:
  repo:
    provider: gitlab
    path: products/storefront
    url: https://twgit.mytw.io/products/storefront

  issues:
    provider: jira
    base_url: https://templeandwebster.atlassian.net
    project: STORE
    url: https://templeandwebster.atlassian.net/browse/STORE

  docs:
    provider: confluence
    space: STOREFRONT
    url: https://templeandwebster.atlassian.net/wiki/spaces/STOREFRONT/overview

  chat:
    provider: slack
    channel: '#horizon-storefront'

  hosting:
    provider: vercel
    url: https://vercel.com/temple-and-webster/storefront-next
    project_id: prj_abc123
```

> The `workspace.work` key controls where task workspaces are created. The default is `work/{TASK_ID}/`.

## Provide credentials

Credentials are read from `.env` in the workspace root at runtime. Never commit `.env`.

```ini
# .env
JIRA_TOKEN=your-jira-api-token
JIRA_EMAIL=you@templeandwebster.com.au

CONFLUENCE_TOKEN=your-confluence-api-token
CONFLUENCE_EMAIL=you@templeandwebster.com.au

GITLAB_TOKEN=your-gitlab-personal-access-token
```

Add `.env` to `.gitignore` if it is not already there.

## Sync external sources

Run syncs from the workspace root using the `space` CLI (provided by `@tpw/space`):

```bash
space sync jira           # sync Jira project to .space/sources/jira/
space sync confluence     # sync Confluence space to .space/sources/confluence/
space sync                # sync all configured sources
```

| Command | Output path | Format |
|---|---|---|
| `space sync jira` | `.space/sources/jira/` | Jira issue JSON (native API format) |
| `space sync confluence` | `.space/sources/confluence/` | Confluence storage-format XHTML |

Syncs are deterministic and idempotent -- safe to re-run. Partial writes go to a temp directory and are only moved into place on success.

Once synced, agents can read program context -- open issues, architecture decisions, design documents -- without live API access and without manual copy-paste.

## Commit the sources

Commit `.space/sources/` to the repo. This makes program context available to agents without requiring credentials or network access, and gives you a version history of external data.

## See also

- [Scaffold a new workspace](01-scaffold-a-workspace.md) -- create a workspace before configuring it
- [Use skills](03-use-skills.md) -- install and invoke delivery activity skills
- [`docs/design/source-sync.md`](../design/source-sync.md) -- full technical design for the sync system
