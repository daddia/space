---
type: Architecture Decision Record (ADR)
status: Accepted
date: 2026-04-27
supersedes:
---

# ADR-0001 — Skill delivery mechanism: three-repo split with stripped public mirror

## Context

`@daddia/skills` was delivered to consumer workspaces via a `postinstall` npm script
(`bin/sync-skills.js`) that symlinked skill folders from `node_modules/@daddia/skills/`
into `.cursor/skills/` and `.claude/skills/`. This conflated the authoring toolkit
(TypeScript source, lint rules, profile YAML) with the public consumer surface (SKILL.md
content), made skill updates dependent on an npm publish + consumer `npm update` cycle, and
produced fragile symlinks that broke whenever `node_modules` was rebuilt in CI. A
delivery mechanism that separates content publication from package management was needed.

## Decision

Adopt a three-repo split with a stripped public mirror:

- **Source of truth** — `packages/skills/skills/` in `daddia/space`. Rich daddia
  frontmatter (`track`, `role`, `stage`, `consumes`, `produces`, `version`, `tags`) used by
  Space tooling and the Crew runtime. Not published directly to consumers.
- **Public mirror** — `github.com/daddia/skills`. A flat repo of skill folders whose
  frontmatter is stripped to the open agent skills spec (`name`, `description`,
  `allowed-tools`, `argument-hint`, `license`). No CI, no profiles, no views.
  Updated automatically by a GitHub Action on every merge to `main` touching
  `packages/skills/**`.
- **Consumer install path** — `npx skills add daddia/skills` (Vercel CLI) or
  `space skills sync` (Space CLI). Skills land in `.agents/skills/` (canonical);
  `.cursor/skills/` and `.claude/skills/` are symlinks into `.agents/skills/`.
  A `skills-lock.json` (daddia-extended format) is committed to pin the ref and
  record content hashes.
- **Authoring toolkit** — `packages/skills/src/` (TypeScript), published to npm as
  `@daddia/skills`. Consumed by Space CLI tooling. Not required in consumer workspaces.

The publish pipeline is one-way and runs in CI. Postinstall side-effects in consumer
repos are eliminated. No consumer repo takes a dependency on `@daddia/skills`.

## Consequences

- Benefit: skill content and toolkit release cycles are decoupled — a new skill ships
  by merging to `main` in `daddia/space`, not by bumping an npm version in every
  consumer.
- Benefit: the public mirror is inspectable and consumable by any agent ecosystem that
  supports the `skills` CLI spec (`skills.sh`, Cursor, Claude Code, etc.).
- Benefit: no postinstall symlinks in consumer workspaces; `node_modules` rebuilds are
  safe.
- Benefit: daddia-specific frontmatter (tracks, roles, profiles, handoff graphs) never
  leaks to the public mirror.
- Trade-off: two repositories to maintain (`daddia/space` and `daddia/skills`); the
  public mirror is derived and must never be edited directly.
- Trade-off: the GitHub Action deploy key requires periodic rotation; the rotation
  runbook is in `architecture/skills/delivery.md`.
- Trade-off: updating the consumer install path (`npx skills add` replacing
  `npm install @daddia/skills`) is a breaking change for any existing consumer —
  mitigated by the `crew-space` migration serving as the reference smoke test.

## Confirmation

- The `publish-skills.yml` GitHub Action runs successfully on a real push that touches
  `packages/skills/**` and produces a commit on `daddia/skills@main`.
- `npx skills add daddia/skills --skill write-product` in a fresh directory installs
  `write-product/SKILL.md` into `.agents/skills/` and the skill is auto-discovered by
  Cursor and Claude Code on the next session.
- After running `space skills sync` in `crew-space`, no `@helmiq/crew-skills`
  references remain in the workspace and the skills are discoverable.
- `pnpm validate` from the `daddia/space` root exits 0 after every story in SPACE-15.

## Alternatives considered

- **MCP server delivery**: skills served at model inference time via an MCP endpoint.
  Rejected for SPACE-15 scope — requires a running server, introduces network
  dependency at inference time, and is not yet supported by all agent runtimes.
  Documented as a future option in `architecture/skills/delivery.md`.
- **npm package (current model)**: keep `@daddia/skills` as the sole delivery artefact.
  Rejected because postinstall symlinks are fragile in CI, and the release cycle couples
  content updates to package management operations in every consumer.
- **Vercel CLI verbatim (`npx skills add`) without a dedicated public repo**: install
  directly from `daddia/space`. Rejected because the source repo contains internal
  frontmatter, project-specific examples, and tooling source that must not be published.
  A stripped public mirror is required to give consumers a clean, stable surface.
