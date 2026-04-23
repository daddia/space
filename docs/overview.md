---
title: Space
description: The delivery workspace ecosystem for AI-assisted engineering at Temple & Webster.
---

Space gives any team the tools to scaffold a structured workspace, equip AI agents with versioned delivery skills, and keep external program data -- Jira issues, Confluence pages -- available offline inside the environment where agents work.

A space is a first-class product artifact. It knows who the team is, what they are building, where the code lives, and what program context agents need. When an agent knows how to navigate a space, it can navigate any team's workspace. When a skill improves, every workspace that installs the update improves simultaneously.

## Key concepts

- **Workspace as product** -- a space is not a folder you happen to check out. It is designed, versioned, and maintained alongside the code it supports. The `.space/` directory holds the identity, configuration, and source mirrors.
- **Skills as content** -- delivery skills are plain Markdown files. They require no build, no runtime, and no framework. Any IDE that supports Markdown skill files can read them: Cursor, Claude Code, Copilot, Windsurf.
- **Faithful source mirrors** -- Jira issues and Confluence pages are synced into space in their native upstream format. Nothing is converted on the way in. Agents reason over real program state without live API access.
- **Opt-in write-back** -- reading from external systems is always safe. Publishing a document back to Confluence requires an explicit declaration in the document's frontmatter. No file reaches an external system without opting in.
- **Compounding quality** -- skills and workspace conventions are versioned dependencies. An improvement to the requirements skill benefits every team that installs the next version, not just the team that wrote it.

## What is Space?

Space is a collaborative workspace for AI-assisted engineering. It gives a team -- engineers, leads, and agents -- a shared, structured environment that holds the product strategy, architecture decisions, open work, and delivery conventions for a project.

The workspace is backed by a set of tools that keep it current: skills that agents can invoke, a scaffolder to stand one up from scratch, and a sync CLI to pull live program data from Jira and Confluence.

| Package                                          | Description                                                |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [`@tpw/skills`](../packages/skills/)             | Versioned delivery activity skills for AI coding agents    |
| [`@tpw/create-space`](../packages/create-space/) | Scaffold a new delivery workspace from a single command    |
| [`@tpw/space`](../packages/space/)               | Operate a workspace -- sync external sources, publish docs |

## How you can use Space

**Scaffold a workspace** -- run `@tpw/create-space` to stand up a structured delivery workspace alongside your codebase. The workspace holds your product strategy, architecture decisions, open work, and agent instructions in one place.

**Use skills only** -- install `@tpw/skills` in any existing repo to give agents access to the delivery skill library. No workspace scaffolding required.

**Connect to external sources** -- use `@tpw/space` to sync Jira issues and Confluence pages into the workspace. Agents can then reason over live program context -- open issues, decisions, documentation -- without manual copy-paste or live API calls.

```text
myproject-space/      delivery workspace
  .space/             identity, config, source mirrors
  skills/             synced from @tpw/skills
  docs/               product, solution, roadmap, backlog (platform level)
  domain/             per-domain product, solution, roadmap, backlog
  architecture/       ADRs and diagrams
  work/               active work packages

myproject/            product codebase
```

## The four-doc set

Every space uses the same canonical artefact set, at two levels:

- **Platform level** (`docs/`): `product.md`, `solution.md`,
  `roadmap.md`, `backlog.md`.
- **Domain level** (`domain/{d}/`): the same four docs, scoped to a
  sub-product or surface.
- **Work-package level** (`work/{wp}/`): `design.md` and `backlog.md`
  only; the sprint-scale unit of delivery.

See [`design/space-artefact-model.md`](design/space-artefact-model.md)
for the full artefact model, phase gating, and publish pipeline.

## Space's own artefacts

The Space monorepo dogfoods the model. The canonical set:

| Doc                                                                     | Scope        | Purpose                                                                 |
| ----------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| [`docs/product.md`](product.md)                                         | Platform     | Business context: problem, appetite, users, outcomes, principles        |
| [`docs/solution.md`](solution.md)                                       | Platform     | Architecture: components, data flows, cross-cutting concepts, decisions |
| [`docs/roadmap.md`](roadmap.md)                                         | Platform     | Phased delivery: Now / Next / Later, with exit criteria                 |
| [`docs/backlog.md`](backlog.md)                                         | Platform     | Epic list with dependencies, critical path, assumptions, risks          |
| [`docs/design/space-artefact-model.md`](design/space-artefact-model.md) | Design       | The artefact-model design this workspace implements                     |
| [`work/01-source-sync/backlog.md`](../work/01-source-sync/backlog.md)   | Work package | Active sprint backlog for EPIC-01 (source sync)                         |

## How these docs are organised

| Page                                                                   | What it covers                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------- |
| [Scaffold a new workspace](getting-started/01-scaffold-a-workspace.md) | Create a complete, agent-ready workspace in minutes      |
| [Configure your space](getting-started/02-configure-your-space.md)     | Wire up Jira, Confluence, and other external sources     |
| [Use skills](getting-started/03-use-skills.md)                         | Install and invoke delivery activity skills from any IDE |
