# AGENTS.md

## Package Overview

`@tpw/skills` is a collection of delivery activity skills for AI coding agents. Each skill is a self-contained `SKILL.md` file that an agent reads and follows to perform a specific delivery activity (writing requirements, technical design, ADRs, code review, implementation, etc.).

## Package Structure

Each skill lives in its own directory named after the activity:

```
packages/skills/
  requirements/SKILL.md
  design/SKILL.md
  adr/SKILL.md
  review-adr/SKILL.md
  review-code/SKILL.md
  review-docs/SKILL.md
  implement/SKILL.md
  create-mr/SKILL.md
```

## Implementation Notes

- Skills are plain Markdown with YAML frontmatter; no build step required.
- The `files` field in `package.json` restricts publishing to `*/SKILL.md` and `README.md` -- no tooling or config files are shipped.
- Consumers symlink individual skill directories (or the whole package) into `.cursor/skills/` or `.claude/skills/`.
- Each `SKILL.md` must be self-contained: role definition, step-by-step instructions, quality rules, and output format -- all in one file.
- Do not add framework-specific logic to skills; they must work across all supported IDEs.

## Change Guidance

- When adding a new skill, create `{skill-name}/SKILL.md` following the structure of existing skills.
- When updating a skill, ensure the output format section remains consistent with how agents consume the result.
- Bump `package.json` version and add a `CHANGELOG.md` entry after any changes intended for release.
