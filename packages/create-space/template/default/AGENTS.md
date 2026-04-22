# AGENTS.md

{projectName} is ... <!-- one-line product description -->

## Repository layout

This is the **delivery workspace** (`{project}-space`). It contains product strategy, architecture, backlog, design documents, and delivery reports. Application code lives in the separate `{project}` repo.

| Repo              | Path            | Purpose                                                            |
| ----------------- | --------------- | ------------------------------------------------------------------ |
| `{project}-space` | `.` (this repo) | Delivery artifacts: product, architecture, backlog, epics, reports |
| `{project}`       | `../{project}`  | Application code                                                   |

## Key documents

Before working in this repo, read:

- `product/product.md` -- product strategy and requirements
- `product/roadmap.md` -- phased roadmap
- `architecture/solution.md` -- solution architecture
- `architecture/decisions/register.md` -- architecture decision register
- `docs/conventions/definition-of-ready.md` -- when a story is ready to implement
- `docs/conventions/definition-of-done.md` -- when a story is actually done

## Skills

Delivery activity skills are provided by `@tpw/skills` and discovered automatically via `.cursor/skills/` and `.claude/skills/`. Skills include prompts for requirements writing, technical design, ADRs, code review, and more.

## Conventions

- All delivery artifacts are Markdown with YAML frontmatter
- Architecture decisions follow the ADR template at `architecture/decisions/adr-template.md`
- Epic artifacts go in `work/{EPIC_ID}/`
- This is a documentation and coordination workspace -- no application code belongs here
