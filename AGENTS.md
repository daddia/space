# AGENTS.md

## Package overview

`@tpw/skills` is a collection of delivery activity skills for AI coding agents. Each skill guides an agent through a specific delivery activity (writing requirements, technical design, ADRs, code review, implementation, etc.).

## Package structure

Each skill lives in its own directory named after the activity. The directory may contain up to four file types:

```
{skill-name}/
├── SKILL.md           # Main prompt (required)
├── template.md        # Blank output scaffold (optional)
├── examples/
│   └── sample.md      # Worked output examples (optional)
└── scripts/
    └── check.sh       # Helper scripts the agent may execute (optional)
```


## File roles

**`SKILL.md` (required)** — The file an agent reads and executes. Must be self-contained: YAML frontmatter (name, description, `when_to_use`, `allowed-tools`, argument declarations) followed by a Markdown prompt body with role, steps, quality rules, and output format. Do not split instructions across multiple files.

**`template.md` (optional)** — A blank scaffold the agent fills in when producing the skill's primary output. Reference it explicitly in `SKILL.md` steps (e.g. "Use the structure from `template.md` as your starting point"). The agent reads it, fills in the sections, and writes the result to the target file.

**`examples/` (optional)** — One or more high-quality worked outputs. Agents use these for quality calibration — tone, depth, section proportions. File names should describe the example (`cart-domain-design.md`, not `example1.md`). At least one example is expected for any skill where quality judgement is required.

**`scripts/` (optional)** — Helper scripts the agent may execute as part of the skill's steps (e.g. a DoD validation script). Must be self-contained and executable. Document them in the skill's steps section.

## Skill naming convention

Skills follow the `{verb}-{topic}` pattern. Canonical verbs: `write`, `plan`, `review`, `validate`, `implement`, `extract`, `update`, `analyse`, `decompose`.

> The current skills (`requirements`, `design`, `adr`) pre-date this convention. A rename is in progress — see `_docs/backlog.md` task C1–C2.

## Implementation rules

- `SKILL.md` must be self-contained. An agent that reads only `SKILL.md` must be able to execute the skill correctly.
- `template.md` and `examples/` are additive; `SKILL.md` must work without them (they improve quality, not correctness).
- Scripts in `scripts/` must not have side effects that break the consuming project. Treat them as read-only validators unless the skill explicitly requires writes.
- Do not add framework-specific logic to skills. They must work across Cursor, Claude Code, Copilot, and Windsurf.
- Every skill in `SKILL.md` must declare `allowed-tools` so IDEs can sandbox tool access appropriately.

## `package.json` `"files"` allowlist

The published tarball includes:

```json
"files": [
  "*/SKILL.md",
  "*/template.md",
  "*/template.*.md",
  "*/examples/**",
  "*/scripts/**",
  "README.md",
  "CHANGELOG.md"
]
```

`AGENTS.md`, `_docs/`, `.gitlab-ci.yml`, `.changeset/`, and any root-level tooling scripts are excluded. Run `npm pack --dry-run` to verify before release.

## Change guidance

- **Adding a skill:** create `{verb}-{topic}/SKILL.md`. Add `template.md` and `examples/` if quality calibration benefits the agent. Update `README.md` skill table and `package.json` version.
- **Updating a skill:** preserve the `SKILL.md` output format section — agents and consumers may depend on it. Update examples if the expected output changes.
- **Adding a template or example to an existing skill:** no version bump required unless the published shape changes.
- **Adding a new file type to the skill structure:** update `"files"` in `package.json`, update this file and `README.md`, and run `npm pack --dry-run` to confirm.
- **Every release:** bump `package.json` version and add a `CHANGELOG.md` entry. The GitLab CI pipeline publishes to the `@tpw` scoped registry automatically on merge to `main` via changesets.
