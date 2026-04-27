# @daddia/space

## 0.2.0

### Minor Changes

- Add `space skills sync` and `space skills install` commands (SPACE-15).

  `space skills sync [--profile <name>]` resolves the active profile, calls
  `npx skills add daddia/skills` for the listed skills, and writes
  `skills-lock.json` at the workspace root.

  `space skills install` reads `skills-lock.json` and reinstalls the pinned
  set, for use in CI and on fresh clones.

  Profile YAML files are bundled inside `@daddia/space` at build time; the
  default profile is read from `.space/profile.yaml` when `--profile` is not
  supplied.
