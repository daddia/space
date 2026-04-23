
The four canonical artefacts  (`product`, `solution`, `roadmap`, `backlog`) plus work package artefacts


well-tested industry pattern: **Working Backwards (product) → Solution Intent (solution) → Now/Next/Later (roadmap) → Story Map (backlog)**. 

## Two-tier design

Each answers a distinct question.

## Tier 1: Product / Domain

| Doc | Question | Owner | Audience | What must NOT be in it |
|---|---|---|---|---|
| `product.md` | Why, who, what outcome | Product | Exec, PMs, squads | File paths, APIs, schemas, component names, tech choices, ADRs |
| `solution.md` | How, at a system level | Architect / staff eng | Engineers, adjacent squads | Story-level detail, sprint sequencing, UI copy |
| `roadmap.md` | When, in what order | Product + engineering lead | Cross-squad, stakeholders | Implementation design, story AC |
| `backlog.md` | What next, sized | Delivery lead | Squad | Business case narrative, architecture rationale |

Example
```
docs/
  product.md
  solution.md
  roadmap.md
  backlog.md
```

Domains (optional)

```
domain/{d}/
  product.md
  solution.md
  roadmap.md
  backlog.md
```

### Tier 2: Work Package

[TABLE]

Work Package 

```
work/{d}/{wp}/
  design.md
  backlog.md
```


## Example: Cart on new Storefront 

[Cart on Confluence](https://templeandwebster.atlassian.net/wiki/spaces/storefront/folder/4456808650)
[Cart on GitLab](https://gitlab.com/templeandwebster/storefront/storefront-space/-/tree/main/domain/cart?ref_type=heads)

Storefront product with complex domains

```
product/
  product.md        business context for the T&W storefront
  solution.md       high-level solution architecture
  roadmap.md        phases to delivery the storefront

domain/cart/
  product.md        business context for the cart
  solution.md       solution architecture for cart
  roadmap.md        now/next/later
  backlog.md        epics

work/cart/01-foundations/ [DONE]
  design.md         walking skeleton
  backlog.md        completed stories

work/cart/02-add-to-cart/ 
  design.md         sprint TDD (references domain/solution + 01 design where relevant)
  backlog.md        sprint stories
```
