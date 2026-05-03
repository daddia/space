# Skills — Architect

Generated from `packages/skills/*/SKILL.md` frontmatter. Run
`pnpm generate:views` to refresh.

| Skill | What it does | Artefact | Track | Consumes | Produces |
| --- | --- | --- | --- | --- | --- |
| plan-adr | Identifies the architecture decisions that need ADRs and produces a prioritised adr-plan.md before technical design... | adr-plan.md | architecture | solution.md | adr-plan.md |
| refine-docs | Documents the sprint-end refinement session: promotes WP-local ADR candidates into solution.md, archives superseded... | refine-session.md | refine | solution.md, design.md | refine-session.md |
| refine-solution | Refines solution.md after a sprint or phase to reflect what was built — updating the building-block view, runtime... | solution.md (refined) | refine | solution.md | solution.md (refined) |
| review-adr | Reviews and finalises a draft Architecture Decision Record (ADR). Use when the user mentions "review this ADR",... | ADR review | architecture | ADR-NNNN.md | review |
| review-codebase | Performs a comprehensive, first-principles audit of a codebase as a Senior Software Architect. Use when the user... | codebase review | engineering | solution.md, AGENTS.md | review |
| review-design | Reviews a work-package design.md for implementation readiness — checking that the design is implementable, APIs are... | design.md review | discovery | design.md, solution.md, backlog.md | design.md (amended), review summary |
| review-docs | Reviews product.md and solution.md for completeness and alignment before development begins. Use when the user mentions... | doc review | discovery | product.md, solution.md | review |
| review-solution | Reviews solution.md as a Senior Solution Architect, checking structural soundness, section completeness, NFR... | solution.md review | architecture | solution.md, product.md | solution.md (amended), review summary |
| write-adr | Documents a consequential architecture decision as an ADR-NNNN.md file. Use when the user mentions "write an ADR",... | ADR-NNNN.md | architecture | solution.md | ADR-NNNN.md |
| write-contracts | Produces contracts.md for a domain as an executable index of types, Zod schemas, API route contracts, and analytics... | contracts.md | architecture | solution.md | contracts.md |
| write-solution | Drafts solution.md in stub mode (Phase 0, two sections) or full arc42-lite mode (Phase 2+, ten sections). Use when the... | solution.md | architecture | product.md, contracts.md | solution.md |
| write-tech-stack | Drafts tech-stack.md defining the technology choices for a product or domain, with rationale and trade-offs for each... | tech-stack.md | architecture | product.md | tech-stack.md |
| write-wp-design | Drafts a work-package design.md in walking-skeleton mode (foundation sprint, 2–4 pages) or TDD mode (sprint 2+, 5–10... | design.md | discovery | solution.md, backlog.md | design.md |
