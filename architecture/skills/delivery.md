# Skill Delivery

How skills are published from `daddia/space` and installed into consumer workspaces.

The delivery mechanism is governed by [ADR-0001](../decisions/ADR-0001-skill-delivery-mechanism.md).

## Overview

Skill content lives in `packages/skills/skills/` in the `daddia/space` private monorepo.
A GitHub Action publishes a stripped copy to `github.com/daddia/skills` (the public mirror)
on every merge to `main` that touches `packages/skills/**`. Consumer workspaces install from
the public mirror via the `skills` CLI.

```
daddia/space (private)           daddia/skills (public mirror)
  packages/skills/                  <name>/SKILL.md   (stripped frontmatter)
    skills/<name>/SKILL.md   →      <name>/template.md
    profiles/
    src/                         ↑
                                 GitHub Action (deploy key)
                                 runs on push to main
                                 touching packages/skills/**

Consumer workspace
  .agents/skills/<name>/SKILL.md   (installed via npx skills add)
  .cursor/skills/  → .agents/skills/
  .claude/skills/  → .agents/skills/
  skills-lock.json
```

## Publish pipeline

### Trigger

The `publish-skills.yml` GitHub Action runs on push to `main` in `daddia/space` when
any file under `packages/skills/**` changes.

### Steps

1. Check out `daddia/space` at `HEAD`.
2. `pnpm install --frozen-lockfile`.
3. `pnpm --filter @daddia/skills run validate:public` — runs lint, index generation
   drift check, views drift check, and public-strip validator. Any failure aborts the
   pipeline; no publish occurs.
4. Check out `daddia/skills@main` into a temporary working directory using the deploy
   key SSH credential (`secrets.SKILLS_DEPLOY_KEY`).
5. `pnpm --filter @daddia/skills run sync-public --target <tmp>` — copies stripped
   skills, removes stale entries, applies the public asset policy.
6. `git -C <tmp> add -A`.
7. If no diff: exit 0 (`"no changes to publish"`).
8. `git -C <tmp> commit -m "Sync from daddia/space@<sha>"`.
9. `git -C <tmp> push origin main`. On push conflict: `git pull --rebase` once and
   retry. If still conflicting: fail with an actionable error.

### Public asset policy

The public mirror strips daddia-specific frontmatter and excludes internal assets:

- **Frontmatter**: only `name`, `description`, `allowed-tools`, `argument-hint`,
  `license` are published. All other daddia fields (`track`, `role`, `stage`,
  `consumes`, `produces`, etc.) are removed.
- **Templates**: each skill ships at most one template, named exactly `template.md`.
  Mode-specific variants (`template-pitch.md`, `template-tdd.md`, etc.) are excluded.
- **Examples**: `examples/*.md` files whose name matches an internal project prefix
  (`cart-`, `space-`, `workflow-engine`) are excluded. Generic examples
  (`example-app-*.md`) are published.
- **Internal directories**: `examples/.internal/` is excluded.
- **Tooling**: `package.json`, `CHANGELOG.md`, `AGENTS.md`, `src/`, `bin/`, `profiles/`,
  `views/`, `space-index/` are not present in the public mirror.

The filter rules are implemented in `packages/skills/src/publish/strip-policy.ts`
(`shouldShipFile` predicate and `INTERNAL_EXAMPLE_PREFIXES` / `INTERNAL_DIRS` constants).

## Consumer install path

### First install

```bash
npx skills add daddia/skills --skill write-product --skill implement
```

Or via the Space CLI (preferred in daddia workspaces):

```bash
space skills sync                        # use profile from .space/profile.yaml
space skills sync --profile domain-team  # override with a named profile
```

`space skills sync` resolves the profile, invokes `npx skills add daddia/skills` with
the appropriate `--skill` flags, and writes `skills-lock.json` at the workspace root.

### Restore from lockfile (CI, fresh clones)

```bash
space skills install
```

Reads `skills-lock.json`, calls `npx skills install --lockfile skills-lock.json`.
Exits 1 if the installed content hashes drift from the lockfile; re-run
`space skills sync` to refresh.

### Scaffold (new workspaces)

`@daddia/create-space` calls `space skills sync` automatically after rendering the
workspace template. The `.gitignore` template excludes `.agents/skills/`,
`.cursor/skills`, and `.claude/skills` so installed skills are not committed.

### `skills-lock.json` format

The lockfile is the daddia-extended Vercel format (see `packages/space/src/skills/lockfile.ts`):

```json
{
  "version": 1,
  "source": "daddia/skills",
  "ref": "<commit-sha>",
  "profile": "domain-team",
  "syncedAt": "2026-04-27T10:00:00Z",
  "skills": [{ "name": "write-product", "contentHash": "<sha256>" }]
}
```

The Vercel CLI tolerates the daddia-extended fields on read. Daddia always writes the
extended form. Commit `skills-lock.json` to pin the ref for reproducible installs.

## Deploy-key management

The GitHub Action authenticates to `daddia/skills` using a dedicated SSH deploy key
scoped to that repository only. This avoids exposing a personal access token.

### Initial setup

1. Generate a fresh SSH key pair (no passphrase):
   ```bash
   ssh-keygen -t ed25519 -C "daddia/space skills publish" -f /tmp/skills-deploy
   ```
2. Add the **public key** (`/tmp/skills-deploy.pub`) as a deploy key in
   `daddia/skills` → Settings → Deploy keys. Enable **write access**.
3. Add the **private key** (`/tmp/skills-deploy`) as a repository secret in
   `daddia/space` → Settings → Secrets → `SKILLS_DEPLOY_KEY`.
4. Delete both key files from your local machine.

### Rotation runbook

Rotate annually, or immediately on any of: admin role change, suspected key exposure,
or CI infrastructure migration.

1. Generate a new key pair as above.
2. In `daddia/skills`: add the new public key as a deploy key (write access).
3. In `daddia/space`: update the `SKILLS_DEPLOY_KEY` secret to the new private key.
4. Trigger a manual publish run to verify the new key works.
5. Remove the old deploy key from `daddia/skills`.
6. Record the rotation date in this document under **Key history**.

### Key history

| Date       | Reason                   | Rotated by   |
| ---------- | ------------------------ | ------------ |
| 2026-04-27 | Initial setup (SPACE-15) | daddia admin |

## Future delivery options

The following mechanisms were considered and deferred:

- **MCP server delivery**: skills served at model inference time via an MCP endpoint.
  Attractive for real-time skill updates without a reinstall, but requires a running
  server and is not universally supported across agent runtimes. Revisit when the
  agent ecosystem stabilises around a common MCP skill-server interface.
- **skills.sh registry**: submitting `daddia/skills` to the public skills registry.
  A manual external action; can happen any time after the first publish. Tracked
  outside this epic.
