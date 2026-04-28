# AGENTS.md

{projectName} is ... <!-- one-line product description -->

## Repository layout

This Space workspace is **embedded** inside the `{project}` code repository.
Delivery artifacts (product strategy, architecture, backlog, design documents,
delivery reports) live here alongside the application code.

| Path             | Purpose                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `.space/`        | Space workspace configuration (config, team, RACI)                |
| `product/`       | Product strategy and roadmap                                       |
| `architecture/`  | Solution architecture and architecture decision records            |
| `work/`          | Work-package artifacts: design, backlog, delivery reports          |
| `docs/`          | Conventions, runbooks, and shared team documentation               |

## Key documents

Before working in this repo, read:

- `product/product.md` -- product strategy and requirements
- `product/roadmap.md` -- phased roadmap
- `architecture/solution.md` -- solution architecture
- `docs/conventions/definition-of-ready.md` -- when a story is ready to implement
- `docs/conventions/definition-of-done.md` -- when a story is actually done

## Skills

Delivery activity skills are provided by `@daddia/skills` and discovered automatically via `.cursor/skills/` and `.claude/skills/`. Skills include prompts for requirements writing, technical design, ADRs, code review, and more.

## Conventions

- All delivery artifacts are Markdown with YAML frontmatter
- Epic artifacts go in `work/{EPIC_ID}/`
- This workspace is embedded — application code lives alongside these artifacts in the same repository
