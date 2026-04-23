---
title: Scaffold a new workspace
description: Create a standards-compliant, agent-ready delivery workspace in minutes using @tpw/create-space.
---

Use `@tpw/create-space` to produce a complete delivery workspace with the standard directory layout, agent instruction files, IDE configuration, and skill installation -- all from a single command.

## What you'll learn

- How to run the scaffolder interactively and non-interactively
- What the scaffolder produces and why each part matters
- What to do immediately after scaffolding

## Prerequisites

- Node 20 or later
- pnpm (run `corepack enable` to activate it)
- An npm token with access to `@tpw/*` packages set in `~/.npmrc`:

```ini
//registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN
```

## Run the scaffolder

```bash
pnpm create @tpw/space my-project
cd my-project-space
```

The scaffolder prompts for:

| Prompt          | Example                                            |
| --------------- | -------------------------------------------------- |
| Project name    | `Checkout`                                         |
| Project key     | `CHECKOUT` (used as a prefix for backlog item IDs) |
| Package manager | `pnpm`                                             |

> Pass `--yes` to skip all prompts and accept defaults. Use `--key` to set the project key without entering interactive mode.

## Run non-interactively

Useful in CI or when an agent is initialising a workspace:

```bash
pnpm dlx @tpw/create-space my-project --yes --key ACME --use-pnpm
```

## What gets scaffolded

| Path                       | Purpose                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| `AGENTS.md`                | Agent instruction file -- describes the workspace conventions for any IDE agent |
| `.space/config`            | Project identity and source configuration                                       |
| `product/`                 | Product strategy documents                                                      |
| `architecture/`            | Architecture decision records and C4 diagrams                                   |
| `docs/`                    | Internal documentation                                                          |
| `work/`                    | Task workspaces (one directory per Jira issue or work item)                     |
| `reports/`                 | Generated reports and summaries                                                 |
| `{project}.code-workspace` | VS Code / Cursor multi-root workspace file                                      |
| `package.json`             | Declares `@tpw/skills` and `@tpw/space` as dev dependencies                     |

## Install dependencies

```bash
pnpm install
```

This installs `@tpw/skills` and runs `sync-skills` as a postinstall step, which copies the skill library into `skills/`. The skills directory is then symlinked into `.cursor/skills` and `.claude/skills` for agent access.

## Configure your sources

Open `.space/config` and fill in the project details and source references:

```yaml
project:
  name: My Project
  key: ACME
  description: What this project is building.

sources:
  issues:
    provider: jira
    base_url: https://yourorg.atlassian.net
    project: ACME
```

See [Configure your space](02-configure-your-space.md) for the full reference.

## Verify your setup

1. Open the workspace in Cursor or your IDE -- confirm `AGENTS.md` is visible
2. Check `skills/` contains the skill library (created by `sync-skills` on install)
3. Run `pnpm typecheck` -- should pass with no errors

## Commit the workspace

Commit the scaffolded files. The `skills/` directory is managed by `sync-skills` and should be committed so agents can read it without running `pnpm install` first.

## See also

- [Configure your space](02-configure-your-space.md) -- wire up Jira, Confluence, and other sources
- [Use skills](03-use-skills.md) -- install and invoke delivery activity skills
- [Space product](../product.md) -- why Space exists, who uses it, and what outcomes it targets
- [Space solution](../solution.md) -- architecture of the three packages and how they fit together
