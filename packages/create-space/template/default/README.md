# {projectName} Workspace

Delivery workspace for **{projectName}**.

This repo is managed as a VS Code multi-root workspace via `{project}.code-workspace`.

| Repo              | Path            | Purpose                                                                                            |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `{project}-space` | `.` (this repo) | Delivery management: product strategy, architecture, backlog, epics, design docs, delivery reports |
| `{project}`       | `../{project}`  | Application code                                                                                   |

## Repository structure

```
{project}-space/
  .crew/
  product/                       # Product strategy artifacts
  architecture/                  # Solution architecture and ADRs
    decisions/
      register.md
      adr-template.md
  work/                          # Delivery artifacts per epic and task
  docs/                          # Design documents and references
```

## Setup

```bash
git clone git@github.com:{org}/{project}-space.git
cd {project}-space
pnpm install
```
