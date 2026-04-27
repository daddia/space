# Naming Conventions

Naming rules for skills, packages, and workspace artefacts.

## Skill names — `{verb}-{topic}`

Skills use a `{verb}-{topic}` compound name. The verb signals the operation and the delivery track:

### Canonical verbs

| Verb | Track | Meaning |
| --- | --- | --- |
| `write-` | any | Author an artefact from scratch |
| `review-` | any | Critical quality gate — senior lens, blocking verdict |
| `refine-` | refine | Regular cadence update — record learnings, advance state |
| `plan-` | architecture / strategy | Identify or sequence decisions before authoring |
| `implement` | delivery | Execute a story against approved design |
| `validate` | delivery | Final acceptance check that a work item meets its DoD |
| `create-` | delivery | Automate creating an external artefact (e.g. a PR) |
| `refactor-` | delivery | Restructure code without changing observable behaviour |

### Topic naming

Topic is the subject noun, in the singular where natural:

- `write-product`, not `write-products`
- `review-solution`, not `review-architecture-solution`
- `refine-backlog`, not `refine-backlogs`

### What makes a good skill name

- **Unambiguous at a glance** — `write-retrospective` is clearer than `write-sprint-notes`
- **Consistent with the verb's meaning** — `review-` is for critical quality gates; don't use it for light-touch checks (those are `refine-`)
- **Does not duplicate an existing skill** — check `packages/skills/` before naming

### Reserved names

`space-index` is reserved for the router meta-skill. Do not use this prefix for other skills.

## Package names

| Package | Scope | Name |
| --- | --- | --- |
| Skills | `@daddia` | `@daddia/skills` |
| Scaffolding CLI | `@daddia` | `@daddia/create-space` |
| Operations CLI | `@daddia` | `@daddia/space` |
| Tooling configs | `@daddia` | `@daddia/{type}-config` |

New packages in the `space` monorepo use the `@daddia` scope.

## Workspace artefact names

Artefact filenames are fixed — the skill defines where to save. Do not invent ad-hoc filenames. Fixed names:

| Artefact | File |
| --- | --- |
| Product strategy | `product.md` |
| Roadmap | `roadmap.md` |
| Backlog | `backlog.md` |
| Architecture | `solution.md` |
| Technology stack | `tech-stack.md` |
| Contracts | `contracts.md` |
| Metrics definition | `metrics.md` |
| Metrics report | `metrics-report.md` |
| Retrospective | `retrospective.md` |
| WP design | `design.md` |
| ADR | `ADR-{NNNN}-{short-title}.md` |
| Refinement session | `refine-session.md` |

## Epic and story IDs

| Scope | Format | Example |
| --- | --- | --- |
| Epic | `{KEY}-{nn}` | `SPACE-01`, `CART01` |
| Story (work-package) | `{KEY}{nn}-{nn}` | `CART01-03` |
| ADR | `ADR-{NNNN}` | `ADR-0007` |
