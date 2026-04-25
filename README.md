# Space

Delivery workspace ecosystem for AI-assisted engineering.

Space gives any team the tools to scaffold a structured workspace, equip AI
agents with versioned activity skills, and keep external program data -- Jira
issues, Confluence pages -- available offline inside the environment where
agents work.

## Packages

| Package                                       | Version | Description                                       |
| --------------------------------------------- | ------- | ------------------------------------------------- |
| [`@daddia/skills`](packages/skills/)             | 0.1.0   | Delivery activity skills for AI coding agents     |
| [`@daddia/create-space`](packages/create-space/) | 0.1.0   | Scaffold a new delivery workspace                 |
| [`@daddia/space`](packages/space/)               | 0.1.0   | Operate a workspace -- sync sources, publish docs |

## Scaffolding a new workspace

```bash
pnpm create @daddia/space my-project
cd my-project-space
pnpm install
```

Produces a complete workspace with `AGENTS.md`, `.space/config`, `product/`,
`architecture/`, `docs/`, `work/`, and IDE configuration.

## Using skills

Install in any project and skills sync automatically on install:

```bash
pnpm add -D @daddia/skills
```

Add a postinstall script:

```json
{
  "scripts": {
    "postinstall": "sync-skills"
  }
}
```

Link into your IDE (one-time setup, committed to git):

```bash
ln -s ../skills .cursor/skills
ln -s ../skills .claude/skills
```

Skills are plain Markdown. They work in Cursor, Claude Code, Copilot, Windsurf,
and any IDE that supports Markdown skill files.

## Syncing sources

From inside a workspace:

```bash
space sync jira           # sync Jira project to .space/sources/jira/
space sync confluence     # sync Confluence space to .space/sources/confluence/
space sync                # sync all configured sources
```

Configure sources in `.space/config`. Credentials in `.env`.

## Development

```bash
pnpm install
pnpm build        # build create-space and space
pnpm typecheck
pnpm test
pnpm lint
```

## Releasing

Changesets manages versioning and publishing.

```bash
pnpm changeset          # record a change
pnpm version-packages   # bump versions
pnpm release            # build and publish
```

## Licence

(c) 2026 daddia
