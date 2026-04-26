# Skills — Engineer

Generated from `packages/skills/*/SKILL.md` frontmatter. Run
`pnpm generate:views` to refresh.

| Skill | What it does | Artefact | Phase | Consumes | Produces |
| --- | --- | --- | --- | --- | --- |
| create-mr | Creates a merge request or pull request for the current branch after implementation is complete. Use when the user... | MR description | delivery | — | MR description |
| implement | Implements code for a story or task against an approved design.md and backlog.md. Use when the user mentions... | code | delivery | design.md, backlog.md | code |
| plan-delivery | Produces a delivery-plan.md that sequences the five Phase-0 artefacts — product.md, solution.md, roadmap.md,... | delivery-plan.md | discovery | — | delivery-plan.md |
| refactor-code | Performs targeted code refactoring to address issues raised in a code review or to improve quality without changing... | code | delivery | review, code | code |
| refine-docs | Documents the sprint-end refinement session: promotes WP-local ADR candidates into solution.md, archives superseded... | refine-session.md | delivery | solution.md, design.md | refine-session.md |
| review-code | Performs a comprehensive code review of changes in a branch or PR. Use when the user mentions "review this code",... | code review | delivery | design.md, backlog.md | review |
| review-docs | Reviews product.md and solution.md for completeness and alignment before development begins. Use when the user mentions... | doc review | definition | product.md, solution.md | review |
| space-index | Identifies the right skill for a vague or open-ended request. Use when the user asks "which skill should I use?", "what... | skill-routing | discovery | — | skill-routing |
| write-adr | Documents a consequential architecture decision as an ADR-NNNN.md file. Use when the user mentions "write an ADR",... | ADR-NNNN.md | delivery | solution.md | ADR-NNNN.md |
| write-backlog | Drafts a domain-level or work-package backlog.md. Use when the user mentions "backlog", "epic list", "stories",... | backlog.md | definition | product.md, solution.md, roadmap.md | backlog.md |
| write-contracts | Produces contracts.md for a domain as an executable index of types, Zod schemas, API route contracts, and analytics... | contracts.md | discovery | solution.md | contracts.md |
| write-metrics | Drafts metrics.md defining north-star, input, and guardrail metrics for a domain. Use when the user mentions "write the... | metrics.md | definition | product.md | metrics.md |
| write-solution | Drafts solution.md in stub mode (Phase 0, two sections) or full arc42-lite mode (Phase 2+, ten sections). Use when the... | solution.md | discovery | product.md, contracts.md | solution.md |
| write-wp-design | Drafts a work-package design.md in walking-skeleton mode (foundation sprint, 2–4 pages) or TDD mode (sprint 2+, 5–10... | design.md | delivery | solution.md, backlog.md | design.md |