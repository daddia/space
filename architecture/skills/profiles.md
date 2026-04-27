# Skill Profiles

Profiles let a workspace install only the skills it needs. A profile is a YAML file listing active skill names.

## Profile files

```
packages/skills/profiles/
  minimal.yaml
  domain-team.yaml
  platform.yaml
  full.yaml
```

Each file lists the `name:` values of included skills:

```yaml
# domain-team.yaml
skills:
  - implement
  - review-code
  - refactor-code
  - create-mr
  - write-product
  - write-solution
  - write-backlog
  - write-contracts
  - write-wp-design
  - review-design
  - review-backlog
  - refine-backlog
  - plan-delivery
  - space-index
```

### Starter profiles

| Profile | Best for |
| --- | --- |
| `minimal` | Code-focused teams: implement, review-code, refactor-code, create-mr, write-adr |
| `domain-team` | Squads delivering a domain: add write-product, write-solution, write-backlog, write-contracts, write-wp-design, review-design |
| `platform` | Platform and architecture teams: add plan-adr, review-adr, review-solution, write-tech-stack |
| `full` | All stable skills |

Deprecated and deferred skills are **never** included in any profile, regardless of the profile setting.

## Profile selection at scaffold

```bash
pnpm create @daddia/space my-project --profile domain-team
```

The scaffolder passes the profile to `space skills sync`, which calls
`npx skills add daddia/skills` with the profile's skill list and writes
`skills-lock.json`. Skills land in `.agents/skills/`; `.cursor/skills/` and
`.claude/skills/` are symlinks into `.agents/skills/`.

See `architecture/skills/delivery.md` for the full install flow.

## Changing a workspace profile

1. Edit `.space/profile.yaml` (created at scaffold time).
2. Run `space skills sync` to rematerialise.

```bash
space skills sync                          # use profile from .space/profile.yaml
space skills sync --profile platform       # override with a named profile
```

## Adding a new profile

1. Create `packages/skills/profiles/{name}.yaml`.
2. Validate: `pnpm --filter @daddia/skills run lint:skills` — every skill name in
   the profile must exist and have `stage: stable`.
3. Reference in `packages/create-space/` templates if it should appear as a scaffold option.
4. Add changeset.

Profile YAML files are validated by the typed lint engine in
`packages/skills/src/lint/` against the full skill inventory.
