# @tpw/skills

## 0.3.0

### New skills

- `write-solution`: Drafts `domain/{d}/solution.md` or `docs/solution.md` (platform scope) in two modes:
  - `--stage stub` (Phase 0): fills §1 Context + §2 Quality goals; scaffolds §3–11 with `[NEEDS CLARIFICATION]`
  - `--stage full` (Phase 2+): populates all 11 arc42-lite sections including §11 Graduation candidates
  - Ships `template-stub.md`, `template-full.md`, `examples/space-solution.md`, `examples/cart-solution.md`
- `write-contracts`: Drafts `domain/{d}/contracts.md` with executable TypeScript / Zod / OpenAPI code fences
  - Ships `template.md` (7-section scaffold), `examples/cart-contracts.md`

### Refactored skills

- `write-product`: Split `template.md` into `template-pitch.md` (Shape Up, ≤2 pages) and `template-product.md` (extended, ≤5 pages)
  - New `--stage pitch|product` parameter; legacy `template.md` kept as a backward-compatible alias for one release
  - Updated examples: `space-product.md`, `cart-product.md`
- `write-backlog`: Phase-1 default enforced (Now-phase epics only unless `--depth full`)
  - Work-package scope enforces canonical story schema: Status, Priority, Estimate, Epic, Labels, Depends on, Deliverable, Design, Acceptance (EARS), Acceptance (Gherkin)
  - Updated examples: `cart-domain-backlog.md`, `cart-wp01-backlog.md`
- `design` → `write-wp-design`: New skill with two modes:
  - `--mode walking-skeleton` (foundation sprint, 2–4 pages): 6-section structure
  - `--mode tdd` (sprint 2+, 5–10 pages): 12-section full TDD structure
  - Ships `template-walking-skeleton.md`, `template-tdd.md`, `examples/cart-wp01-walking-skeleton.md`, `examples/cart-wp02-tdd.md`
  - Legacy `design/SKILL.md` retained as a backward-compatible alias for one release

### Cross-cutting improvements (all 14 active skills)

- **v2 frontmatter**: All skills now carry `artefact`, `phase`, `role`, `domain`, `stage`, `consumes`, `produces`, `prerequisites`, `related`, `tags`, `owner` fields
- **Handoff graph**: `consumes`/`produces` fields form a fully resolvable directed acyclic graph with zero dangling references; enables `space-index` router construction in SPACE-03
- **Anthropic-format descriptions**: All descriptions rewritten to 200–500 chars, third-person verb-ing form, ≥2 trigger phrases, ≥1 `Do NOT` neighbour disambiguation, output artefact name verbatim
- **Negative-constraint blocks**: All `template*.md` files carry a `DRAFTING AIDE — DELETE THIS BLOCK` comment listing what must not appear in the output (with canonical destination). Skills without template files carry a `## Negative constraints` section in their `SKILL.md` body

### New tooling

- `bin/lint-skills.js`: Structural linter for the v2 skill contract
  - Exposed as `pnpm lint` (within this package) and `pnpm lint:skills` (from monorepo root)
  - Exposed as the `lint-skills` bin for consumer workspaces
  - Checks: required frontmatter, handoff-graph integrity, description length/verb/disambiguation/artefact/uniqueness, negative-constraint coverage per template or SKILL.md
  - Supports `--json` for machine-readable CI output and named-skill filters
  - Exit 0 on pass, 1 on any error

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
