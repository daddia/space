# Edit an Existing Skill

When to edit vs. deprecate, and how to make changes safely.

## Edit vs deprecate

**Edit** when you are:
- Correcting the description (routing improvement, length fix, missing `Do NOT use`)
- Updating steps to reflect a changed convention
- Adding missing body sections (negative constraints, quality rules)
- Updating scope — e.g. adding `portfolio` to a skill that only had `domain`
- Bumping version after a substantive change

**Deprecate** when you are:
- Replacing the skill with a different name or split into two skills
- Removing a skill entirely (deprecate first; do not delete immediately)

See `contributing/deprecate-skill.md` for the deprecation process.

## Making changes

1. **Read the current SKILL.md before editing.** Understand the existing description, scope, and body.

2. **Edit the frontmatter** — update `version:` (patch bump for small fixes, minor bump for substantive changes to steps or scope), update `last_updated:` if present.

3. **Edit the body** — follow the section structure in `architecture/skills/skill-anatomy.md`.

4. **Lint the skill:**

   ```bash
   node packages/skills/bin/lint-skills.js {skill-name}
   ```

5. **Regenerate the index** if you changed `name:`, `description:`, `artefact:`, `track:`, `role:`, `consumes:`, or `produces:`:

   ```bash
   node packages/skills/bin/generate-index.js
   ```

   Commit the updated `space-index/SKILL.md` alongside the skill change.

6. **Add a changeset:**

   ```bash
   pnpm changeset
   ```

   For description-only fixes: `patch`. For step or scope changes: `minor`. For breaking changes (removing scope, changing output path): `major`.

## What counts as a breaking change

A skill change is breaking if consumers that invoke it with existing arguments would get a different output path or a different set of produced artefacts. Specifically:
- Renaming the `argument-hint` parameters in a way that changes existing call sites
- Removing a scope value that workspaces currently use
- Changing the `artefact:` field or output file path

Bump `major` and add a migration note to the changeset.
