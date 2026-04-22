# @tpw/skills

## 0.2.0

- Add `bin/sync-skills.mjs` CLI binary: copies skills from the package into a git-tracked `skills/` directory; preserves project-local skills; idempotent on re-runs
- New install model: `"postinstall": "sync-skills"` + `skills/` dir + `ln -s ../skills .claude/skills`
- New skills: `plan-adr`, `write-adr`, `write-backlog`, `write-metrics`, `write-product`, `write-roadmap`
- `write-adr`, `plan-adr`: full template + examples (cart domain)
- `write-backlog`, `write-metrics`, `write-product`, `write-roadmap`: full template + examples (cart domain)
- Add `bin/**` to published `files`
- Update `README.md` with new installation model and configuration options

## 0.1.4

- Add `write-product` skill with template and cart example
- Add `write-roadmap` skill with template and cart example
- Add `write-metrics` skill with template and cart example
- Add `write-backlog` skill with domain + work-package templates and cart examples
- Update `README.md` skills table with discovery category and template/example indicators
- Expand `"files"` to include `*/template-*.md` for skills with multiple templates

## 0.1.3

- Document full skill structure (`SKILL.md` + `template.md` + `examples/` + `scripts/`) in `README.md` and `AGENTS.md`
- Expand `"files"` in `package.json` to include `template.md`, `examples/`, `scripts/`, and `CHANGELOG.md`
- Switch registry to GitLab Package Registry (`@tpw:registry`); `license` changed to `UNLICENSED`
- Fix `repository.url` normalisation warning

## 0.1.2

- New skill: Validate
- Generalise example task IDs in all skills from project-specific `CREW-##` to generic `PROJ-##`

## 0.1.1

- Update skills structure

## 0.1.0

- Initial release of `@tpw/skills`.
