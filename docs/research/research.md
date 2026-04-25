# Evolving the space/skills system for agentic-first delivery

**Keep one skills package, invest in descriptions and a router, not folders.** Splitting by role optimises a problem Claude doesn't have — the LLM pre-loads every skill's `description` regardless of directory — while breaking the cross-role handoffs that are the whole point of the artefact set. Fix discoverability with richer frontmatter, hygienic trigger descriptions, and a `space-index` router skill; layer role views on top as curated lists, the ESLint-preset pattern. **Give product.md its intent back** by enforcing a hard WHAT/WHY–HOW seam and moving technical content out to a new `solution.md` skill modelled on arc42-lite + C4 Level 1–2. **Cut the pre-sprint doc pile in half.** The cart module needs six artefacts before Monday — pitch, AGENTS.md, contracts, walking-skeleton, constitution, backlog — everything else is Phase 1 or Phase 2 output. This is what Cockburn, Ambler, Cagan, Singer, and Anthropic's own context-engineering guidance all converge on: the walking skeleton is what proves the architecture, not the document pile. The rest of this report gives you the concrete skills set, templates, and sequenced process to implement it.

---

## 1. Skills package management and discoverability

### One package, richer metadata, a router — not three packages

The decision is settled by how Claude actually matches skills. Anthropic's Agent Skills spec pre-loads every installed skill's `name` + `description` pair into the system prompt at session start; the body is only read when Claude judges it relevant (progressive disclosure, three levels). **Skill matching is LLM routing on the description field, not embedding search, not keyword search, and not filesystem layout.** Folder structure is literally invisible to Claude's router. Whether your skills sit in one directory or three does not change discoverability by one bit for the primary consumer.

Role-splitting fails on three further counts. First, **handoffs cross roles by design** — a PM writes `product.md`, the engineer's Claude session needs to read it intelligently to generate `backlog.md`, so the engineer's package must know PM skills exist. Second, the Diátaxis framework (adopted by Canonical, Cloudflare, Gatsby, Sequin) explicitly argues against role-based segmentation in favour of *need-based* segmentation within one corpus — role splits were what those teams moved *away from*. Third, **ESLint and typescript-eslint never shipped `-for-juniors` / `-for-seniors` packages**; they ship one package with multiple named presets (`recommended`, `strict`, `all`). Presets are cheap; forks are expensive.

The failure mode you'd lock in by splitting is coordination drift: three changelogs, three CI pipelines, three eval suites, three router vocabularies, and a handoff boundary where the engineer's skills don't know the PM's templates. You would have optimised human browsability at the cost of the LLM routing quality — which is the thing that actually governs discoverability.

### The four moves that actually improve discoverability

**First, enrich the frontmatter with a small controlled vocabulary** — but understand that **Claude only routes on `description`**, so you must also mirror the salient terms in natural language inside that string. Add these fields (Backstage's `tags`/`relations`/`lifecycle` conventions, ESLint's `extends` pattern, and Cursor's activation-mode taxonomy are the precedents):

```yaml
---
name: drafting-product-spec
description: >
  Drafts a product.md spec during the DISCOVERY phase from a rough problem
  statement. Use whenever the user mentions "PRD", "product spec", "product
  brief", "problem statement", or "what are we building". Produces product.md
  via template.md. Do NOT use for roadmap (use drafting-roadmap) or backlog
  (use drafting-backlog).
when_to_use: Discovery phase, before roadmap/ADRs exist.
allowed-tools: [Read, Write, Edit]
artefact: product.md
phase: discovery          # discovery | definition | delivery | operation
role: [pm, founder]       # array — skills often span
domain: product           # product | architecture | engineering | ops | qa
stage: stable             # experimental | beta | stable | deprecated
consumes: []
produces: [product.md]
prerequisites: []
related: [drafting-roadmap, drafting-backlog]
tags: [spec, brief, prd]
version: 1.2.0
owner: @jd
---
```

The taxonomy fields aren't mechanically honoured by Claude's router, but they power the `space-index` skill, human CLI tooling, and governance. **The `consumes`/`produces` pair is the single highest-value addition** — it encodes the cross-role handoff graph and lets the router answer "I have product.md; what's next?" deterministically.

**Second, rewrite every description to Anthropic's own guidance**: third-person, verb-ing, with literal trigger phrases and explicit disambiguation against neighbours. Keep to 1–3 sentences, 200–500 characters. Be mildly pushy where a skill under-triggers ("Make sure to use this whenever the user mentions…, even if they don't explicitly ask"). Anthropic's `skill-creator` ships a `run_loop.py` that runs 20 queries × 3 samples against each description and proposes rewrites on a held-out set — **adopt this as a CI check**. As skills accumulate, description collisions grow polynomially; evals are the only discipline that catches them.

**Third, add a `space-index` router skill** — a meta-skill whose `description` pulls triggers on vague requests ("what can I do here?", "which skill for…", "help me plan"). It's a known Claude Code pattern (`SkillForge`, `skill-router`, `obra/superpowers`). Its body is an auto-generated table of every sibling SKILL.md's frontmatter; regenerate it in CI from the `produces`/`consumes`/`phase`/`role` fields so it never drifts. This is a deterministic alternative to Anthropic's experimental Tool Search tool, which Arcade's evaluation found hits only ~56–60% retrieval accuracy at 4,000+ tools. At your scale (dozens of skills), a small deterministic index beats embedding search on reliability and cost.

**Fourth, expose role views as generated markdown tables**, not directories — the ESLint preset / VS Code extension pack pattern. A `views/pm.md`, `views/architect.md`, `views/engineer.md` filter the same underlying corpus by `role` + `phase`. Zero duplication, zero skew, full human browsability.

### Writing trigger descriptions — the rules that matter

The `description` field is the only routing signal the LLM sees, so it bears the entire load of \"should I load this?\". The do/don't list that comes out of Anthropic's own skill-authoring guide and the skill-creator eval loop:

- **Do** write in third person, lead with a verb-ing clause (`Drafts…`, `Generates…`, `Reviews…`), enumerate literal trigger phrases users actually type, disambiguate neighbours explicitly (`\"Do NOT use for X — use skill-Y for that\"`), mention artefact names verbatim (they're high-signal tokens), and be pushy when under-triggering is the risk.
- **Don't** say just \"creates a spec\" (won't disambiguate from ten other spec skills), mix first/second person (breaks routing), write marketing copy (the audience is an LLM, not a PM), or rely on `when_to_use`/`tags`/`role` to trigger routing — **they don't, in the base Anthropic spec**. Fold essential cues into `description`.

A single well-written description serves both LLM and human; don't add a separate `human_description` field. The cost of duplication is divergence over time. If you want a longer human blurb, put it in the SKILL.md body under `## Overview` — it's free, not loaded at startup, and the router skill surfaces it anyway.

### Summary of skills changes

| Skill | Action | Reason |
|---|---|---|
| `drafting-product-spec` (existing) | **Keep, refine** | Rewrite description to third-person + triggers; strip solution guidance from template.md (see §2) |
| `drafting-solution-spec` | **ADD** (currently missing) | Owns `solution.md`; arc42-lite/C4-informed structure — see §2D |
| `drafting-roadmap` | **Keep, refine** | Now-Next-Later framing; strip feature-level detail |
| `drafting-backlog` (sprint backlog) | **Keep, refine** | EARS + Gherkin acceptance criteria; story-map mode for broader backlogs |
| `drafting-contracts` | **Keep, refine** | Executable: TypeScript/Zod/OpenAPI fences, not prose |
| `drafting-metrics` | **Keep, but move** | Make it post-foundation-sprint by default; add stage: `deferred` |
| `drafting-requirements` | **Consolidate / retire** | Subsumed by product.md (WHY/WHAT) + backlog.md (ACs). Redundant per spec-kit's WHAT/HOW split |
| `drafting-design` | **Consolidate into solution.md** | Separate design.md is an arc42-lite anti-pattern at domain scope |
| `drafting-pitch` | **ADD** (Shape Up) | Primary pre-foundation-sprint artefact: problem, appetite, sketch, rabbit holes, no-gos |
| `drafting-walking-skeleton` | **ADD** | Names the one end-to-end slice the foundation sprint must land |
| `drafting-constitution` | **ADD** (spec-kit/Kiro) | ≤1 page non-negotiables the agent must not violate |
| `drafting-adr` | **ADD** | MADR/Nygard format; called just-in-time during Phase 1, not upfront |
| `space-index` (router) | **ADD** | Meta-skill: the catalogue for humans and the router for Claude |
| `refining-description` (eval) | **ADD (tooling)** | Wraps skill-creator's `run_loop.py`; runs in CI on every SKILL.md change |

---

## 2. Document set and separation of concerns

### The cardinal seam: WHAT/WHY vs HOW

This is the single strongest signal across Cagan, Amazon's PR/FAQ, spec-kit, Kiro, Shape Up, and Google's design-doc template. **`product.md` must be readable by a non-technical stakeholder without loss; `solution.md` must be actionable by an engineer without loss.** If a reader learns the tech stack, service names, database, or deployment topology from `product.md`, it has leaked. If a reader learns the commercial rationale, target segments, or strategic thesis from `solution.md`, that's also leaked. Spec-kit's template encodes the rule literally: \"✅ Focus on WHAT users need and WHY — ❌ Avoid HOW to implement (no tech stack, APIs, code structure)\". Bake that as an explicit negative constraint in the SKILL.md for `drafting-product-spec`, because it stops leakage at generation time rather than at review time.

The four adjacent boundaries follow from the seam:

- **`roadmap.md` owns *time*** (Now / Next / Later, per Bastow) but never owns dates beyond the current Now, and never contains acceptance criteria or component names.
- **`backlog.md` owns *stories***, ideally as a Patton-style story map rather than a flat list (\"a bag of context-free mulch\"), with acceptance criteria in EARS + Gherkin and references — not redefinitions — of the solution.md sections and contracts they touch.
- **`contracts.md` owns *interfaces*** as executable TypeScript/Zod/OpenAPI/AsyncAPI, referenced by solution.md, not inlined.
- **`metrics.md` owns *instrumentation and SLOs***; the outcome metrics themselves live as targets in product.md, the operational ones as quality goals in solution.md.

### Content-ownership matrix

Legend: **OWN** = authoritative source; REF = may reference/link but not redefine; — = excluded (a smell if it appears here).

| Content type | product.md | solution.md | roadmap.md | backlog.md | contracts.md | metrics.md |
|---|---|---|---|---|---|---|
| Vision & strategic thesis | **OWN** | REF | REF | — | — | — |
| Target user segments & personas | **OWN** | REF (as actors in C4 L1) | — | REF (in stories) | — | REF (cuts) |
| Problem statement / opportunity | **OWN** | REF | REF | REF | — | — |
| Commercial / business rationale | **OWN** | — | REF | — | — | — |
| Outcome metrics (North Star, KPIs) — targets | **OWN** | — | REF | REF (per story) | — | REF |
| Outcome metrics — instrumentation, dashboards | — | — | — | — | — | **OWN** |
| Operational / SLO metrics (latency, availability) | — | REF (as quality goal) | — | — | REF | **OWN** |
| Scope (in/out) — product | **OWN** | REF | REF | — | — | — |
| Non-goals / technical no-gos | REF | **OWN** | — | — | — | — |
| Feature flags — names, strategy | REF (intent) | **OWN** (mechanism) | REF (phase gate) | REF (per story) | REF | REF |
| API contracts & schemas | — | REF | — | REF | **OWN** | — |
| Component decomposition (C4 L2–L3) | — | **OWN** | — | — | — | — |
| Data model / domain model | — | **OWN** | — | — | REF | — |
| Integration / BFF / anti-corruption layer | — | **OWN** | — | — | REF | — |
| Error-handling strategy (taxonomy, retry) | — | **OWN** | — | REF | REF (error shapes) | REF (error SLOs) |
| Observability strategy | — | **OWN** | — | — | REF (trace headers) | REF |
| Phasing & sequencing | REF (order-of-attack) | REF (migration) | **OWN** | — | — | — |
| Dependencies | REF (business) | REF (technical) | **OWN** | REF | — | — |
| Product / market risks | **OWN** | — | REF | — | — | — |
| Technical risks & debt | — | **OWN** | REF | — | — | — |
| User stories & acceptance criteria (EARS) | — | — | — | **OWN** | REF | — |
| NFRs / quality goals | REF (top 3 only) | **OWN** (full tree) | — | REF (per story) | REF (perf contracts) | REF (SLO targets) |
| Architectural decisions (ADRs) | — | **OWN** (log) | — | — | — | — |
| Technology selections | — | **OWN** | — | — | — | — |
| Rollout / migration plan | REF (customer impact) | **OWN** (runbook) | REF (phase) | REF (stories) | — | REF |
| Experiments / A-B tests | **OWN** (hypothesis) | REF (flag plumbing) | REF | REF (per story) | — | REF (telemetry) |
| Product principles & heuristics | **OWN** | — | — | — | — | — |
| Engineering principles (constitution) | — | **OWN** | — | — | — | — |
| Insights from discovery | **OWN** | REF (tech insights) | — | — | — | — |
| Opportunity-Solution Tree | **OWN** | REF (solutions under test) | REF | REF | — | — |
| Glossary / ubiquitous language | REF | **OWN** (arc42 §12) | — | — | REF | — |
| Stakeholders & RACI | **OWN** (business) | REF (technical) | — | — | — | — |
| Constraints (regulatory, org, technical) | REF (business) | **OWN** (full) | — | — | — | — |

### Content to move OUT of the current product.md

Your feedback observation — that cart and PDP product.md files contain too much technical content — is addressed by relocating these item types specifically:

**Into solution.md**: component/service names, tech stack, data models, error-handling strategy, observability plumbing, feature-flag mechanism, caching and performance *implementation*, deployment topology, cross-cutting concerns (authN/Z, i18n, a11y), ADRs, technical risks and debt, C4 container/component diagrams, sequence/runtime diagrams, rollback procedures, integration approach (REST vs events vs BFF).

**Into contracts.md**: API endpoint specs, event schemas, GraphQL SDL/Protobuf, error response shapes, auth header details, rate-limit/pagination/idempotency conventions.

**Into metrics.md**: dashboard definitions, query/metric instrumentation, SLO values and alert thresholds, experiment telemetry.

**Into roadmap.md**: sequencing beyond product-level order-of-attack, cross-team dependency timing.

**Into backlog.md**: actual user stories and Given/When/Then. Product.md may carry narrative use cases (Amazon PR/FAQ style), but not ACs.

**Keep in product.md** (don't overcorrect): outcomes, user quotes, problem framing, opportunity tree, segments, positioning, success metrics as targets, product principles, in/out of product scope, **top 3–5 quality goals** (arc42 §1.2 — these are product statements like \"P95 checkout < 3s\"), key product risks, and the PR/FAQ or Shape-Up-style pitch.

### solution.md section structure (arc42-lite, domain-scoped)

The user's missing skill. Ten sections, dual-consumption design (human-legible narrative + agent-legible frontmatter, anchors, and code fences). Directly derived from arc42, C4 L1–L3, Google's design-doc template, MADR for ADRs, spec-kit `/plan`, and Kiro `design.md`:

1. **Context & Scope** — what this domain owns and what it doesn't; upstream/downstream systems; C4 Level 1 diagram. Mirrors arc42 §3 + Google design-doc \"Goals and non-goals\".
2. **Quality Goals & Constraints** — top 3–5 quality attributes plus technical/org/regulatory constraints. Arc42 §1.2 + §2.
3. **Solution Strategy** — architectural style (ports-and-adapters, BFF-per-experience, event-driven), key tech choices with one-line rationale, how the strategy satisfies the quality goals. Arc42 §4.
4. **Building Block View** — C4 L2 (containers) and selectively L3 (components). Simon Brown: L1+L2 give most of the value; skip L4.
5. **Runtime View** — 2–5 key scenarios as sequence diagrams or narrative; favour the scenarios you'll debug at 3am. Arc42 §6.
6. **Data Model & Ubiquitous Language** — entities, relationships, invariants, and a glossary (arc42 §12 lifted up because language drift is a top cause of leakage).
7. **Cross-cutting Concepts** — observability, error taxonomy, security, feature-flag mechanism, caching, i18n, a11y, testing strategy. Arc42 §8. The \"how we do X here\" every story inherits.
8. **Deployment & Environments** — topology, CI/CD shape, feature-flag rollout, migration/cutover. Arc42 §7, trimmed.
9. **Architectural Decisions (ADR log)** — inline or linked MADR/Nygard entries. Arc42 §9. Keeps trade-offs surgically extractable so they don't pollute product.md.
10. **Risks, Technical Debt & Open Questions** — known items plus `[NEEDS CLARIFICATION]` markers (spec-kit convention). Arc42 §11.

Optional §11–12 when scope warrants: External Interfaces index pointing into contracts.md; Alternatives Considered at whole-solution level.

---

## 3. Minimum viable artefacts for a foundation sprint

### Six artefacts, not fifteen

Your instinct that the cart module was over-documented is right, and every primary voice agrees: **the purpose of pre-code artefacts is to unblock the first thin end-to-end slice, not to describe the eventual system**. Cockburn's walking skeleton is \"the thinnest slice of real functionality that can be automatically built, deployed, and tested end-to-end\". Ambler's JBGE demands documents be \"just barely good enough\". Ries's MVP logic applied to internal docs means \"the smallest doc that generates learning\". Singer's Shape Up pitch explicitly contains only problem, appetite, solution *sketch*, rabbit holes, and no-gos — and that's considered complete. Anthropic's own context-engineering guidance (Sep 2025) warns that LLMs have \"a finite attention budget\" with \"context rot\" as a real cost; the ETH Zurich study Augment Code cites in 2026 found auto-generated context files *reduced* agent task success by ~3% and raised cost >20%. More documents before code is often actively harmful to agentic delivery, not just wasteful.

Six artefacts suffice for a foundation sprint in an existing product, calibrated to your CART01 backlog:

| # | Artefact | Purpose | Audience | Timing | Minimum content | Deferred |
|---|---|---|---|---|---|---|
| 1 | `pitch.md` (Shape Up) | Why this module + what \"done for this sprint\" means | Both (human primary) | Before kickoff | Problem, appetite, sketch of walking-skeleton slice, rabbit holes, no-gos | Full PRD, market analysis, roadmap beyond slice |
| 2 | `AGENTS.md` + `CLAUDE.md` | Persistent agent context the agent can't infer | Agent primary | Before kickoff | Stack versions, pnpm commands, file-layout, \"never touch\" list, domain glossary. **<300 lines** | Architecture prose, business rationale, style guide |
| 3 | `contracts.md` (+ `/contracts/*.ts`) | Executable contract for the skeleton slice | Both | Before kickoff | TS types, JSON Schema for BFF, error-code registry (enum), one worked example per contract | Contracts for post-skeleton features |
| 4 | `walking-skeleton.md` | Names the single end-to-end path the sprint must land | Both | Before kickoff | The slice in one paragraph + acceptance criteria + CI gates | Feature backlog, UI polish, analytics |
| 5 | `backlog.md` (CART01) | Ordered delivery plan | Both | Before kickoff | Story title + 3–5 ACs + file paths touched | Estimates, points, dependencies beyond prev/next |
| 6 | `constitution.md` (spec-kit/Kiro) | Non-negotiables the agent must never violate | Both | Before kickoff | Type-safety stance, mapper-must-return-safe-fallback, error-registry rule, cache rules | Everything else |

**~6 files, ~10–15 pages of markdown plus the contracts source.** If what you have generated for cart/ exceeds that pre-kickoff, it's theatre.

### Sequenced process: Phase 0 / Phase 1 / Phase 2

**Phase 0 (before kickoff, 1–2 days of work)**: produce the six artefacts above. Rationale: a module inside an existing product doesn't need chartering — the product already exists. These six answer the only questions Cockburn, Caroli, and Singer say must be answered before code: *what is the thinnest slice?*, *what won't we do?*, *what are the non-negotiables?*, *what are the executable contracts?*, *what does the agent need to not hallucinate?*, *what is the ordered plan?*

**Phase 1 (during foundation sprint, artefacts emerge with code)**: Ambler's just-in-time modelling. Write `ADR-001` (BFF client shape) when Story 2 lands and you know the right shape; `ADR-002` (request-scoped cache strategy) when Story 4 reveals the empirical rules; `errors.md` rationale as Story 5 uncovers codes; narrow project-specific skills only once a pattern has been used twice (the sshh.io 30%-repetition rule); the CI pipeline with status badges, because this *is* the skeleton; local-dev-env README deltas; a progressive `/examples/` directory.

**Phase 2 (after foundation sprint closes)**: only now write `roadmap.md` (the next two or three slices, informed by what you learned), `metrics.md` (what you'll actually measure — you couldn't know before shipping), the full `solution.md` (reverse-engineered from the skeleton, per Ambler: \"reverse-engineer existing code and present a multitude of views\"), extended `contracts.md` for features 2..N, observability/runbook docs, the story map for the rest of the cart domain, and persona docs if the product context demands them.

### Opinionated calls on each artefact

- **`roadmap.md` before foundation sprint: NO.** Patton's \"smallest successful release\" comes first; Cagan's continuous discovery beats static roadmaps. A roadmap written before the skeleton walks encodes assumptions you're about to invalidate.
- **`solution.md` before foundation sprint: NO (detailed).** Singer: a pitch contains a sketch, not a solution. Ambler: detailed solution docs upfront are big modelling up front, an anti-pattern. Let the skeleton be the first solution doc; reverse-engineer the formal `solution.md` in Phase 2.
- **`design.md` before foundation sprint: NO.** Skip it; the one-page architectural sketch inside `walking-skeleton.md` is enough. BDUF is explicitly an anti-pattern across agile modelling literature.
- **`contracts.md` before foundation sprint: YES — this is the one you MUST have.** Spec-kit: \"specifications become executable\". For agentic delivery, contracts are load-bearing because the agent will infer missing types from training-data averages if you don't pin them.
- **`metrics.md` before foundation sprint: NO.** Ries's MVP logic: you measure to learn. You can't pre-specify useful metrics for a skeleton. Capture ~3 observability hooks in `walking-skeleton.md` ACs and write the real metrics doc in Phase 2.
- **`requirements.md`: NO — retire it.** Replaced by `pitch.md` (problem + appetite) + EARS-format ACs in the backlog + executable contracts. A separate requirements doc describes rather than generates learning — Cagan's mini-waterfall critique applies.
- **`constitution.md`: YES.** Encodes non-negotiables for human and agent. Must be ≤1 page or the agent ignores it (\"lost in the middle\").
- **`AGENTS.md` + `CLAUDE.md`: YES.** Native conventions; without them the agent re-derives every session.
- **`walking-skeleton.md`: YES.** Cockburn's canonical artefact; the whole sprint is named by it.
- **`pitch.md`: YES.** Shape Up's one-page format.
- **Speculative ADRs: NO.** Write them as decisions arise — Ambler JBGE.
- **Story map, persona doc, Inception Deck, Lean Inception canvases: NO** for a foundation sprint inside an existing product. Wrong altitude; they're product-level tools.

### Agentic-first context guidance — what agents need that humans don't, and vice versa

**Agents need and humans don't**: exact commands with flags (`pnpm turbo run test --filter cart`, not \"run the tests\"); exact file paths and naming conventions; executable contract examples (one real JSON sample beats three paragraphs describing it); the error-code registry as a TypeScript enum, not a prose table; explicit \"never touch\" lists; version pins (without them, agents default to training-data averages); `allowed-tools` scoping per subagent; counterintuitive rules made explicit (\"mapper MUST return a safe-fallback Cart, never throw\"); programmatic `done` checks (`pnpm lint && pnpm typecheck && pnpm test`).

**Humans need and agents don't**: narrative rationale and history (\"we're rebuilding because v1 coupled pricing and inventory\"); stakeholder maps and org politics; commercial sensitivity (actively harmful in agent context — leak risk); team dynamics; rejected-alternatives memos (pollute context with dead ends — keep in `/docs/history/`).

**Both need**: acceptance criteria in EARS (testable for agents, unambiguous for humans); success metrics for the slice; scope boundaries (Shape Up's no-gos are ruthlessly useful for both — stops humans over-building and agents hallucinating additional features); the executable contract; the constitution.

**Practical placement**: human-only narrative in `/docs/`, *not* imported into AGENTS.md; agent-only ops context in `AGENTS.md` at repo root plus a scoped `src/modules/cart/AGENTS.md` override (OpenAI reports 88 AGENTS.md files in its main repo); shared context in `pitch.md`, `walking-skeleton.md`, `contracts.md`, `constitution.md`.

---

## 4. Integrated recommendation

### Refined skills set (what to add, keep, consolidate)

The full change set is in §1's summary table. The headline moves: **add** `drafting-solution-spec`, `drafting-pitch`, `drafting-walking-skeleton`, `drafting-constitution`, `drafting-adr`, and `space-index` (router); **retire or consolidate** `drafting-requirements` (subsumed) and `drafting-design` (folded into solution); **keep and refine** the rest by rewriting descriptions to Anthropic's skill-creator rules and stripping leaked content from templates.

### Refined template set with enforced separation of concerns

Every `template.md` now carries three structural enforcements borrowed from spec-kit and Kiro: **frontmatter** (type, domain, status, version, trace-up/trace-down links), **explicit negative constraints** in a `<!-- DO NOT INCLUDE -->` block at the top (\"No tech stack. No API contracts. No component names.\" for product.md; \"No commercial rationale. No target segments.\" for solution.md), and **stable anchor headings** (`## REQ-CART-003 …`) so other docs can deep-link. Code fences use language tags Claude parses natively — `mermaid`, `typescript`, `openapi`, `asyncapi`, `gherkin`, `jsonschema`. Acceptance criteria are dual-format: EARS (`WHEN … THE SYSTEM SHALL …`) paired with Gherkin (`Given … When … Then …`) — the Kiro pattern — so they are simultaneously reviewable by a PM and convertible to tests by an agent.

### SKILL.md pattern changes

Every SKILL.md gets the enriched frontmatter from §1 and a description rewritten to third-person, verb-ing, trigger-enumerated, neighbour-disambiguated form. Each SKILL.md body gains a `## Negative constraints` section listing what the artefact must *not* contain (this is the \"stop leakage at generation time\" mechanism). Templates move from inline in SKILL.md to a paired `template.md` referenced by pointer (`@template.md`) — Anthropic's progressive-disclosure pattern, keeping SKILL.md lean for pre-loaded context. Every SKILL.md change runs the skill-creator eval loop in CI: 20 representative queries × 3 samples, trigger-rate regressions block merge.

### Project-level CLAUDE.md at the space root

Create a deliberately small CLAUDE.md at the space root (≤200 lines, HumanLayer's guidance). Contents: project identity (2–4 lines), repo/space map (\"domains live in `spaces/<name>/`, skills in `.claude/skills/`\"), canonical artefact set (\"every domain has `product.md`, `solution.md`, `backlog.md`; roadmap is at root\"), naming conventions + frontmatter schema, workflow rules (\"when asked to add a feature: load product.md first, propose REQ updates, wait for approval, then generate solution.md via the `drafting-solution-spec` skill\"), verification commands, `@imports` — not content — pointing at deeper docs, and explicit non-goals for the agent (\"Do not edit product.md without human approval. Do not invent REQ IDs.\"). Per-domain `spaces/<domain>/CLAUDE.md` can add scoped context via Anthropic's nested CLAUDE.md merging.

Also add a root `AGENTS.md` that mirrors the CLAUDE.md with the vendor-neutral sections (setup, build, test, conventions, security, gotchas) so the space works across Cursor, Codex, Aider, Windsurf, and other agents that read AGENTS.md.

### Sequenced process for the document lifecycle

Pre-foundation-sprint (Phase 0): `pitch.md`, `AGENTS.md`/`CLAUDE.md`, `contracts.md`, `walking-skeleton.md`, `constitution.md`, `backlog.md`. During foundation sprint (Phase 1): ADRs as decisions arise, error registry rationale, narrow skills after repeated patterns, CI pipeline, `/examples/`. After foundation sprint (Phase 2): `roadmap.md`, `metrics.md`, full `solution.md`, extended contracts, observability and runbook docs, story map, personas if warranted. The calibration rule for the team: **if removing a document wouldn't block Story 1 from starting on Monday, that document belongs to Phase 1 or Phase 2, not Phase 0.**

### Skills-package structure — final call

**One package. Flat directory. Rich frontmatter. Router skill. Role views as generated tables.** The full move set:

1. One skills package, flat layout, no role subfolders.
2. Frontmatter enriched with `artefact`, `phase`, `role[]`, `domain`, `stage`, `consumes`, `produces`, `prerequisites`, `related`, `tags`, `owner`, `version` — and the salient terms **mirrored in natural language inside `description`** because that's what the LLM routes on.
3. Every description rewritten to Anthropic's rules; eval loop in CI.
4. `space-index` router skill as the catalogue for Claude and humans alike, regenerated in CI from sibling frontmatter.
5. `views/pm.md`, `views/architect.md`, `views/engineer.md` as thin generated filter tables — ESLint preset pattern, zero fork, zero skew.

### Specific, actionable SKILL.md and template.md changes to ship this week

1. **Add the `drafting-solution-spec` skill and its template.md** using the 10-section arc42-lite structure in §2D. Template includes a top-level `<!-- DO NOT INCLUDE: commercial rationale, target segments, strategic thesis → put in product.md -->` block.
2. **Refactor the existing `drafting-product-spec` template** to remove technical sections (component names, tech stack, data model, error handling, observability, feature-flag mechanism, rollout mechanics). Add a negative-constraints block at the top.
3. **Add `drafting-pitch`, `drafting-walking-skeleton`, `drafting-constitution`** templates. Each is short (<1 page). Constitution carries the codified non-negotiables for the agent.
4. **Add `space-index` skill** with an `index.md` auto-regenerated in CI from sibling SKILL.md frontmatter. Its description reads: *\"Routes the user to the right skill in the space. Use when the user's intent matches multiple skills or no skill clearly, or when they ask 'what skills exist here?' or 'which skill should I use?'.\"*
5. **Rewrite every existing description** to third-person + triggers + disambiguation. Run Anthropic's skill-creator `run_loop.py` against a seed of 20 real queries from your session history; gate on trigger-rate in CI.
6. **Add the enriched frontmatter taxonomy** to every SKILL.md. Mirror `artefact`, `phase`, and the most salient tags back into the description text.
7. **Create root `CLAUDE.md` + `AGENTS.md`** at the space root, ≤200 lines, pointers not content.
8. **Mark `drafting-metrics` and `drafting-roadmap` with `stage: deferred`** so the router deprioritises them pre-foundation-sprint; they light up after Phase 2 kicks off.
9. **Retire `drafting-requirements`** and migrate any content worth keeping into `drafting-product-spec` (scope section) and `drafting-contracts` (schemas).
10. **Add a CI check** `pnpm lint:docs` that validates frontmatter schema, traceability links (every solution.md section anchors a REQ from product.md), and description-length budgets.

---

## Conclusion: what changes with these recommendations

The space stops accumulating artefacts it doesn't use and starts routing reliably to the ones it does. Discoverability improves on both fronts simultaneously — Claude routes better because descriptions carry structured triggers, and humans browse better because generated views and a router skill make the catalogue legible without forking the package. The WHAT/WHY–HOW seam stops product.md from drifting into solution-design theatre, and the new `solution.md` skill gives technical content a legitimate home instead of nowhere. The foundation-sprint artefact set shrinks to what Cockburn, Ambler, Singer, Cagan, and Anthropic's own context-engineering guidance all converge on: six documents that unblock the walking skeleton, with roadmap, detailed solution, and metrics deferred to when the skeleton has walked and you actually know something.

The non-obvious insight: **the agentic-first shift makes minimum viable documentation more urgent, not less**. Context bloat costs you real accuracy and real money; documents the human wrote but the agent re-derives are worse than no documents at all; and the error-code registry and executable contract aren't optional polish — they're the load-bearing artefacts that keep Claude from inferring type shapes from training-data averages. Spec-driven development (spec-kit, Kiro) is converging the industry on a small, structured, machine-legible document set precisely because that set is what *both* audiences need when one of the audiences is an agent.

Ship the ten changes above. Calibrate against the rule: if removing a document wouldn't block Story 1 on Monday, it's Phase 1 or Phase 2 work, not Phase 0.