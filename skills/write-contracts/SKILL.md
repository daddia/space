---
name: write-contracts
description: >
  Produces contracts.md for a domain as an executable index of types, Zod
  schemas, API route contracts, and analytics event payloads. Use when the user
  asks for "contracts", "types", "schema", or "interface definitions" for a
  domain. Output is TypeScript / Zod / OpenAPI source with one worked example
  per contract, not prose. Do NOT use for solution architecture — use
  write-solution. Do NOT use for work-package design — use write-wp-design.
when_to_use: >
  Use after solution.md exists and before or during the foundation sprint.
  Contracts are a Phase 0 prerequisite: agents hallucinate type shapes from
  training averages when contracts are not pinned. Examples: "write the contracts
  for cart", "define the types for the PDP domain", "create contracts.md".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: portfolio|product|domain> <name>'
artefact: contracts.md
track: architecture
also-relevant-to-tracks:
  - discovery
role: architect
also-relevant-to-roles:
  - engineer
domain: architecture
stage: stable
consumes:
  - solution.md
produces:
  - contracts.md
prerequisites:
  - solution.md
related:
  - write-solution
  - write-wp-design
  - write-backlog
tags:
  - contracts
  - types
  - schema
  - zod
  - openapi
owner: '@daddia'
version: '0.4'
---

# Write Contracts Document

You are a Senior Software Architect writing the executable contract surface for
a domain. Contracts are load-bearing: without them, agents generating route
handlers and hooks will infer type shapes from training-data averages rather
than the actual API.

Scope is passed as `$0`:

- `portfolio` — portfolio-level contracts index (`architecture/contracts.md`)
- `product <name>` — product-level contracts (in portfolio: `product/{name}/contracts.md`; single-product: `contracts.md`)
- `domain <name>` — a domain contracts index (`domain/{name}/contracts.md`)

## Negative constraints

The contracts.md MUST NOT contain:

- Prose that describes what a shape means → belongs in `solution.md`
- Business rationale for a contract → belongs in `product.md`
- Implementation patterns or how shapes are produced → belongs in `solution.md` or `work/{wp}/design.md`
- Narrative paragraphs of any kind — only code fences and one-line section preambles

Every type, schema, and event payload lives in an executable code fence.
Each section has exactly one worked example.

**Delete the `DRAFTING AIDE` comment block before saving the output file.**

## Context

<artifacts>
[Provided by the caller:
  Required: solution.md (for system boundary and type names)
  Optional: existing source types from the codebase, BFF OpenAPI spec,
  prior work-package designs that named types]
</artifacts>

## Steps

1. Read solution.md §6.2 (types and schemas) and §1.3 (upstream systems) before writing
2. Write the YAML frontmatter
3. Write each section as: one-line preamble + TypeScript/Zod/OpenAPI code fence + one worked example
4. Build the API route contracts table from solution.md §5 runtime views
5. Build the analytics event schema from any existing event names in context
6. Add the cache tags section if the domain uses server-side caching
7. Ensure every section has at least one worked example — no empty sections
8. **Delete the `DRAFTING AIDE` comment block from the output before saving.**

## Quality rules

- Every type definition is in a code fence with a language tag (`typescript`, `zod`, `openapi`, `asyncapi`, `jsonschema`)
- No section may contain prose-only descriptions of what a type means
- Each section must have at least one concrete worked example showing a real usage
- Types must use exact names from solution.md — do not invent names
- API route table must be complete: path, method, request schema name, response schema name, error codes
- Do not invent contracts not evidenced by context — mark gaps as `// TODO: confirm with BFF squad`

## Output format

Write as a Markdown file with YAML frontmatter.

| Scope | Save path |
| --- | --- |
| `portfolio` | `architecture/contracts.md` |
| `product` (single-product workspace) | `contracts.md` |
| `product <name>` (portfolio sub-product) | `product/{name}/contracts.md` |
| `domain <name>` | `domain/{name}/contracts.md` |

Use `template.md` as your structural scaffold.

See `examples/cart-contracts.md` for a domain-scope example.

<example>
See `examples/cart-contracts.md` (domain scope)
</example>
