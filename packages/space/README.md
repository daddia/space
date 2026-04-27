# @daddia/space

Operational CLI for a daddia delivery space. Sync external sources (Jira,
Confluence) into the workspace and manage installed skills.

## Install

```bash
pnpm add -D @daddia/space
```

## Commands

| Command                       | Description                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `space skills sync`           | Resolve a profile, install skills, write `skills-lock.json`  |
| `space skills install`        | Restore the skills pinned in `skills-lock.json`              |
| `space sync jira`             | Sync a Jira project into `.space/sources/jira/`              |
| `space sync confluence`       | Sync a Confluence space into `.space/sources/confluence/`    |
| `space sync`                  | Sync all configured sources                                  |
| `space init`                  | Initialise or reinitialise a workspace                       |

Run `space --help` or `space <command> --help` for full options.

## Configuration

Reads `.space/config` (YAML) at the workspace root for source definitions and
`.space/profile.yaml` for the active skills profile. Credentials come from
`.env` in the workspace root.

## Skills

Skills are installed via the open agent skills CLI from the public mirror
[`github.com/daddia/skills`](https://github.com/daddia/skills). The set of
skills installed is governed by a profile (`minimal`, `domain-team`,
`platform`, `full`) selected per workspace.

```bash
space skills sync --profile domain-team
```

`skills-lock.json` at the workspace root pins the installed skills and their
content hashes for reproducible installs in CI and on fresh clones.

## Licence

MIT. (c) 2026 daddia. See [`LICENSE`](./LICENSE).
