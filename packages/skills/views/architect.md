# Skills — Architect

Generated from `packages/skills/*/SKILL.md` frontmatter. Run
`pnpm generate:views` to refresh.

| Skill | What it does | Artefact | Phase | Consumes | Produces |
| --- | --- | --- | --- | --- | --- |
| plan-adr | Identifies the architecture decisions that need ADRs and produces a prioritised adr-plan.md before technical design... | adr-plan.md | delivery | solution.md | adr-plan.md |
| plan-delivery | Produces a delivery-plan.md that sequences the five Phase-0 artefacts — product.md, solution.md, roadmap.md,... | delivery-plan.md | discovery | — | delivery-plan.md |
| refine-docs | Documents the sprint-end refinement session: promotes WP-local ADR candidates into solution.md, archives superseded... | refine-session.md | delivery | solution.md, design.md | refine-session.md |
| review-adr | Reviews and finalises a draft Architecture Decision Record (ADR). Use when the user mentions "review this ADR",... | ADR review | delivery | ADR-NNNN.md | review |
| review-docs | Reviews product.md and solution.md for completeness and alignment before development begins. Use when the user mentions... | doc review | definition | product.md, solution.md | review |
| space-index | Identifies the right skill for a vague or open-ended request. Use when the user asks "which skill should I use?", "what... | skill-routing | discovery | — | skill-routing |
| write-adr | Documents a consequential architecture decision as an ADR-NNNN.md file. Use when the user mentions "write an ADR",... | ADR-NNNN.md | delivery | solution.md | ADR-NNNN.md |
| write-contracts | Produces contracts.md for a domain as an executable index of types, Zod schemas, API route contracts, and analytics... | contracts.md | discovery | solution.md | contracts.md |
| write-solution | Drafts solution.md in stub mode (Phase 0, two sections) or full arc42-lite mode (Phase 2+, ten sections). Use when the... | solution.md | discovery | product.md, contracts.md | solution.md |
| write-wp-design | Drafts a work-package design.md in walking-skeleton mode (foundation sprint, 2–4 pages) or TDD mode (sprint 2+, 5–10... | design.md | delivery | solution.md, backlog.md | design.md |