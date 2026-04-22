---
title: Use skills
description: Install @tpw/skills in any repo and invoke delivery activity skills from Cursor, Claude Code, and other Markdown-aware IDEs.
---

Skills are versioned, portable delivery activity guides you install like a dependency. Each skill is a plain Markdown file that any agent can read and follow -- no build, no runtime, no proprietary format. Install once, invoke from any IDE.

## What you'll learn

- How to install `@tpw/skills` and keep it up to date
- How to link the skill library into your IDE
- What skills are available and when to use them
- How to invoke a skill from an agent

## Install the skills package

```bash
pnpm add -D @tpw/skills
```

That single command does everything automatically:

1. Installs `@tpw/skills` and runs `sync-skills`, which copies the skill library into a `skills/` directory at your workspace root.
2. Adds `"postinstall": "sync-skills"` to your `package.json` so skills stay in sync on every future `pnpm install`. If you already have a `postinstall` script it is chained with `&&`.
3. Creates `.cursor/skills` and `.claude/skills` symlinks if the IDE directories exist and the links are not already present.

> If you scaffolded your workspace with `@tpw/create-space`, the package and postinstall script are already configured. Run `pnpm install` to sync the skills.

### IDE skill paths

| IDE | Skill path |
|---|---|
| Cursor | `.cursor/skills/` |
| Claude Code | `.claude/skills/` |
| Copilot (VS Code) | `.github/skills/` (if supported by your version) |
| Windsurf | `.windsurf/skills/` |

Symlinks for Cursor and Claude Code are created automatically. For other IDEs, create the link manually:

```bash
ln -s ../skills .github/skills
ln -s ../skills .windsurf/skills
```

## Available skills

| Skill | What it does |
|---|---|
| `requirements` | Write a requirements document for an epic or task |
| `design` | Write a technical design document for a feature or epic |
| `implement` | Implement a feature or task using existing patterns and standards |
| `write-product` | Write a product document for a platform or domain sub-product |
| `write-backlog` | Write an epic-level domain backlog or a story-level work-package backlog |
| `write-roadmap` | Write a phased delivery roadmap for a platform or domain |
| `write-metrics` | Write a metrics document defining north star, input, and guardrail metrics |
| `write-adr` | Document a consequential architecture decision as an ADR |
| `plan-adr` | Identify and prioritise the architecture decisions an epic needs |
| `review-adr` | Review and finalise a draft Architecture Decision Record |
| `review-code` | Perform a comprehensive code review of changes in a branch or MR |
| `review-docs` | Review requirements and design documents before development begins |
| `validate` | Perform a final stakeholder review that an epic is complete |
| `create-mr` | Open a merge request for the current branch |

## Invoke a skill

Open your IDE's agent chat and ask for the skill by name or description:

```
Use the requirements skill to write requirements for the checkout redesign epic.
```

```
Use the review-code skill to review the changes on this branch.
```

The agent reads the `SKILL.md` file, follows its instructions, and produces the output in your workspace. Most skills write their output to `work/{TASK_ID}/` or the path they are given.

Skills are designed to work best when the workspace has the relevant context available: an open Jira issue in `work/`, synced source data in `.space/sources/`, and a configured `AGENTS.md`. A fully configured space gives the agent everything it needs without manual copy-paste.

## Update skills

```bash
pnpm update @tpw/skills
```

`sync-skills` runs automatically as part of the install, copying the updated skills into `skills/`. Commit the diff -- the updated skill files are the change record.

> The source of truth is the npm package. Do not edit files inside `skills/` that came from `@tpw/skills` -- your changes will be overwritten on the next update. For project-local skills, add them alongside the synced ones and they will be preserved.

## See also

- [Scaffold a new workspace](01-scaffold-a-workspace.md) -- create a workspace before installing skills
- [Configure your space](02-configure-your-space.md) -- give agents access to program context via source sync
- [Space overview](../overview.md) -- product strategy and how the packages fit together
