# Deprecate a Skill

How to retire a skill without breaking workspaces that reference it by name.

## When to deprecate

Deprecate (not delete) when:

- A skill is replaced by a new skill with a better name or scope
- A skill is split into two more focused skills
- A skill was added speculatively and has never been used

Do not delete a skill immediately. Workspaces may reference it by name in their `.space/profile.yaml` or in session transcripts. A `stage: deprecated` skill stays in the package as a backward-compat shim.

## Steps

### 1. Update the SKILL.md

Replace the body with a minimal redirect:

```yaml
---
name: old-skill-name
description: >
  Deprecated alias for new-skill-name. Use new-skill-name for all new work.
  This alias will be removed in @daddia/skills vX.Y.0. Do NOT use this
  skill — use new-skill-name instead.
when_to_use: >
  Deprecated. Use new-skill-name for all new work.
allowed-tools:
  - Read
  - Write
stage: deprecated
related:
  - new-skill-name
owner: '@daddia'
version: 'x.y'
---

<!-- Alias: deprecated in favour of new-skill-name -->

# {old-skill-name} — Deprecated

Use **{new-skill-name}** instead.

...one-line description of what the replacement skill does...
```

Deprecated skills are:

- Exempt from description length, verb, and disambiguation lint checks
- Excluded from the generated index (not shown to routing agents)
- Required to have `related:` pointing at the live replacement

### 2. Add a changeset

```bash
pnpm changeset
```

Choose `patch` (the skill is still in the package, just deprecated).

### 3. Update consuming profiles

If the deprecated skill appears in any profile YAML, remove it:

```bash
# packages/skills/profiles/*.yaml — remove the deprecated skill name
```

### 4. Schedule removal

Add a `# TODO: remove in vX.Y.0` comment at the top of the deprecated SKILL.md body. The target version is typically one major release after the replacement ships.

When the removal version ships, delete the directory and add a major-bump changeset.

## Current deprecated skills

| Skill          | Replaced by                                          | Removal target           |
| -------------- | ---------------------------------------------------- | ------------------------ |
| `review-docs`  | `review-design`, `review-solution`, `review-product` | v0.5.0                   |
| `requirements` | `write-backlog` (work-package scope)                 | v0.5.0                   |
| `design`       | `write-wp-design`                                    | v0.4.0 — already removed |
