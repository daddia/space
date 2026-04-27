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

The scaffolder passes the profile to the postinstall `sync-skills` call, which materialises only the profile's skills into `.cursor/skills/` and `.claude/skills/`.

## Changing a workspace profile

1. Edit `.space/profile.yaml` (created at scaffold time)
2. Run `space sync skills` to rematerialise

```bash
space sync skills                          # use profile from .space/profile.yaml
space sync skills --profile platform       # override with a named profile
```

## Adding a new profile

1. Create `packages/skills/profiles/{name}.yaml`
2. Validate: `node bin/profile-utils.js validate profiles/{name}.yaml`
3. Reference in `packages/create-space/` templates if it should appear as a scaffold option
4. Add changeset

Profile YAML files are validated by `bin/profile-utils.js` against the lint-skills output: every skill name in the profile must exist and have `stage: stable`.
