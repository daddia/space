# @tpw/skills

Delivery activity skills for AI coding agents. Works with any IDE that supports Markdown skill files: Cursor, Claude Code, Copilot, Windsurf, and others.

## What are skills?

A skill is a self-contained prompt package that guides an AI coding agent through one specific delivery activity — writing a requirements document, reviewing code, documenting an architecture decision, and so on. The agent reads the skill's files, follows the steps, and produces a consistent artifact.

Skills are plain Markdown. No build step, no runtime dependency, no framework lock-in.

## Skill package structure

Each skill lives in its own directory named `{verb}-{topic}` (for example `write-requirements`, `review-code`). The directory may contain up to four files:

```
{skill-name}/
  SKILL.md        # required — the agent-facing prompt
  template.md     # optional — the blank output template
  examples/       # optional — concrete example artifacts
    example.md
  scripts/        # optional — helper scripts the skill invokes
    scaffold.sh
```

## Skills included

### Discovery

| Skill | Description | Template | Examples |
|---|---|---|---|
| `write-product` | Write a product document for a platform or domain | ✓ | cart |
| `write-roadmap` | Write a phased delivery roadmap | ✓ | cart |
| `write-metrics` | Write a metrics document (north star, inputs, guardrails) | ✓ | cart |
| `write-backlog` | Write a domain or work-package backlog | ✓ (×2 for domain + WP) | cart domain + cart WP01 |
| `requirements` | Write a requirements document for an epic or task | — | — |
| `design` | Write a technical design document for a feature | — | — |

### Decisions

| Skill | Description |
|---|---|
| `adr` | Document an architecture decision record |
| `review-adr` | Review and finalise a draft ADR |

### Implementation

| Skill | Description |
|---|---|
| `implement` | Implement a feature end-to-end |
| `create-mr` | Create a merge request or pull request for a branch |

### Reviews & gates

| Skill | Description |
|---|---|
| `review-code` | Perform a comprehensive code review |
| `review-docs` | Review requirements and design documents for completeness |
| `validate` | Validate a story implementation against acceptance criteria |

> **Naming:** skill names follow the `{verb}-{topic}` convention. Existing skills (`requirements`, `design`, `adr`) are being renamed — see `_docs/backlog.md` task C1–C2.

## Installation

```bash
npm install @tpw/skills
```

## Usage with Cursor

Symlink into your project's `.cursor/skills/` directory:

```bash
ln -s ../../node_modules/@tpw/skills/requirements .cursor/skills/requirements
```

Or symlink the entire package:

```bash
mkdir -p .cursor/skills
for skill in node_modules/@tpw/skills/*/; do
  ln -s "../../$skill" ".cursor/skills/$(basename $skill)"
done
```

## Usage with Claude Code

Symlink into `.claude/skills/`:

```bash
mkdir -p .claude/skills
for skill in node_modules/@tpw/skills/*/; do
  ln -s "../../$skill" ".claude/skills/$(basename $skill)"
done
```

## Adding a new skill

1. Create `{verb}-{topic}/SKILL.md` following the frontmatter reference above and the structure of existing skills.
2. Add `template.md` if the skill produces a structured artifact with repeating sections.
3. Add `examples/` with at least one real-world output when the skill is mature enough to have one.
4. Add `scripts/` only for mechanical automation that meaningfully reduces agent error rate.
5. Register the skill in the table above.
6. Bump `package.json` version and add a `CHANGELOG.md` entry.

The `files` field in `package.json` publishes `*/SKILL.md` and `README.md` only. To publish `template.md` or `examples/`, add them to the `files` array explicitly.

## Full runtime

These open-source skills are a curated subset. The full Crew runtime includes exhaustive skill libraries for all delivery personas (PM, Engineer, Architect, Reviewer, DM) and integrates with the Crew execution engine. See [horizon/crew](https://github.com/horizon/crew).
