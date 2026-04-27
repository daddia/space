# Release Process

How to publish a new version of any Space package.

## Packages

| Package | npm name | Release trigger |
| --- | --- | --- |
| `@daddia/skills` | Skills and views | New or changed skill, profile change |
| `@daddia/create-space` | Scaffolding CLI | Template change, new config key, new prompt option |
| `@daddia/space` | Operations CLI | New command, new provider, bug fix |

## 1. Record the change with a changeset

```bash
pnpm changeset
```

Select the package(s) affected. Choose bump type:

| Change | Bump |
| --- | --- |
| New skill, new command, new feature | `minor` |
| Bug fix, description update, step correction | `patch` |
| Breaking change (removed scope, renamed output path, removed skill) | `major` |

Write a one-line summary: what changed and why.

## 2. Verify quality

```bash
pnpm validate
```

This runs: install → build → typecheck → lint → test.

For `@daddia/skills` specifically:

```bash
pnpm --filter @daddia/skills run lint:skills     # all skills must pass
pnpm --filter @daddia/skills run generate:index  # index must be current (exits 0)
```

If the index is stale, commit the updated `space-index/SKILL.md` first.

## 3. Bump versions

```bash
pnpm version-packages
```

This reads the pending changesets, bumps package versions, and updates changelogs.

## 4. Publish

```bash
pnpm release
```

Publishes to npm using the credentials configured in `.npmrc`.

## 5. Tag and push

```bash
git push --follow-tags
```

## 6. Publish skills to the public mirror

Skill content in `packages/skills/skills/` is published to `github.com/daddia/skills`
automatically by the `publish-skills.yml` GitHub Action. **The Action is the primary
publish mechanism.** No manual step is required for a normal merge to `main`.

The Action triggers on push to `main` when any file under `packages/skills/**` changes:

1. Runs `pnpm --filter @daddia/skills run validate:public` (lint + drift check + strip validator).
2. Checks out `daddia/skills@main` via deploy key (`secrets.SKILLS_DEPLOY_KEY`).
3. Runs `sync-public` to copy stripped skills to the public mirror.
4. Commits and pushes if there are changes.

**Manual fallback** (use only if the Action is unavailable):

```bash
pnpm --filter @daddia/skills run validate:public  # must pass before publishing
pnpm --filter @daddia/skills run sync-public      # requires daddia/skills checked out locally
```

See `architecture/skills/delivery.md` for the full pipeline, deploy-key setup, and
rotation runbook.

## Pre-release (beta)

When `main` is in pre-release mode, all packages on `main` publish as `beta`. To release a stable version, backport to the stable branch.

Do not backport new packages to a stable branch — it causes version conflicts.

## Description eval gate

Before publishing a minor or major release of `@daddia/skills`, run the description eval loop to confirm no routing regression:

```bash
python scripts/eval-descriptions.py
```

A trigger-rate regression on any query in `scripts/eval-queries.json` blocks the release.
