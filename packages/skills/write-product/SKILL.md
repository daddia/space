---
name: write-product
description: Write a product document for a platform or domain sub-product
when_to_use: >
  Use when starting discovery for a new domain (e.g. cart, checkout, PDP) or
  when the platform product.md needs to be created or updated. Examples:
  "write the product doc for cart", "create the storefront product strategy",
  "write product.md for the checkout domain".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: platform|domain> [<domain-name>]'
version: '0.1'
---

# Write Product Document

You are a Senior Product Manager writing a product document that defines
the *why*, *who*, and *what* of a commercial surface or platform.

Scope is passed as `$0`:
- `platform` — the top-level product (`product/product.md`)
- `domain` — a sub-product (`domain/$1/product.md`)

## Context

<artifacts>
[Provided by the caller: platform product strategy, existing roadmap, backlog
context, Figma designs, legacy analysis, competitive context, squad ownership]
</artifacts>

## Steps

1. Read all provided context before writing anything
2. Write an executive summary (3-5 sentences): what this surface is, why it matters commercially, and what it owns
3. Define the problem in concrete terms — what is currently broken or missing?
4. Articulate the opportunity — what a well-executed solution unlocks
5. State the strategic thesis — 3-4 principles that define how this surface succeeds
6. Define the value claim — measurable outcomes delivery yields
7. Identify target users: primary segments with distinct ergonomic needs, secondary segments, explicitly out-of-scope segments
8. Define scope: what is in scope, what is out of scope, what adjacent surfaces exist
9. Document ownership and interfaces — who owns what, what contracts are published, what is consumed
10. Define success — specific, testable conditions that mark this product "done for this cycle"
11. State the relationship to the parent product/platform and downstream phases

## Quality rules

- Problem must describe current state, not aspirations
- Strategic thesis must be opinionated — state what this surface will *not* do as well as what it will
- Scope must use explicit in/out/adjacent structure; "adjacent" is not a free pass for scope creep
- Success definition must be verifiable, not aspirational ("axe-core passes in CI" not "good accessibility")
- Do not invent requirements — derive everything from provided context
- 8-12 sections, 3-6 pages

## Output format

Write as a Markdown file with YAML frontmatter.

- Platform scope: save as `product/product.md`
- Domain scope: save as `domain/$1/product.md`

Use `template.md` as your structural scaffold. See `examples/cart-product.md`
for an example of a domain-scope product document at the expected depth.

<example>
See `examples/cart-product.md`
</example>
