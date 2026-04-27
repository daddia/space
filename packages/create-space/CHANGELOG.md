# @daddia/create-space

## 0.2.0

### Minor Changes

- Stop adding `@daddia/skills` as a devDependency in scaffolded workspaces. The
  scaffold now runs `space skills sync` (best-effort) after `pnpm install` to
  populate `.agents/skills/` via the public mirror. The `.gitignore` template
  gains entries for `.agents/skills/`, `.cursor/skills`, and `.claude/skills`.
  Agent symlinks inside `.cursor/` and `.claude/` now resolve to `.agents/skills/`
  rather than `node_modules/@daddia/skills`.

## 0.1.0

- Initial release.
