# @tpw/skills

Delivery activity skills for AI coding agents. Works with any IDE that supports Markdown skill files: Cursor, Claude Code, Copilot, Windsurf, and others.

## What are skills?

Skills are self-contained prompts that guide an AI coding agent through a specific delivery activity. Each skill is a single `SKILL.md` file with:

- YAML frontmatter declaring the skill's name, description, and tool permissions
- A complete prompt body the LLM reads directly -- role, steps, quality rules, output format

## Skills included

| Skill          | Description                                               |
| -------------- | --------------------------------------------------------- |
| `requirements` | Write a requirements document for an epic or task         |
| `design`       | Write a technical design document for a feature           |
| `adr`          | Document an architecture decision record                  |
| `review-adr`   | Review and finalise a draft ADR                           |
| `review-code`  | Perform a comprehensive code review                       |
| `review-docs`  | Review requirements and design documents for completeness |
| `implement`    | Implement a feature end-to-end                            |
| `create-mr`    | Create a merge request or pull request for a branch       |
| `validate`     | Validate a story implementation against acceptance criteria |

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

## Prompt structure

All skills follow the same structure:

- Markdown headers for instructions (role, steps, quality rules, output format)
- XML tags for data boundaries (`<artifacts>` for injected context, `<example>` for output demonstrations)
- Each constraint stated once
- Output format shown by concrete example, not template syntax

## Full runtime

These open source skills are a curated subset. The full Crew runtime includes exhaustive skill libraries for all delivery personas (PM, Engineer, Architect, Reviewer, DM) and integrates with the Crew execution engine. See [horizon/crew](https://github.com/horizon/crew).
