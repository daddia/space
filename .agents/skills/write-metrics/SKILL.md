---
name: write-metrics
description: >
  Drafts metrics.md defining north-star, input, and guardrail metrics for a
  domain. Use when the user mentions "write the metrics for {domain}", "define
  success metrics", "create metrics.md", or "what should we measure". Deferred
  by default — invoke after the walking skeleton has shipped and baselines are
  measurable, not before. Do NOT use before the foundation sprint — baselines
  cannot be defined without shipped code. Do NOT use for product outcomes —
  those live in product.md §7.
when_to_use: >
  Use when a domain needs its success metrics defined before or during
  discovery. Examples: "write the metrics for cart", "define success metrics
  for checkout", "create metrics.md for the PDP domain".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<scope: portfolio|product|domain> <name>'
artefact: metrics.md
track: discovery
role: pm
also-relevant-to-roles:
  - engineer
domain: product
stage: deferred
consumes:
  - product.md
produces:
  - metrics.md
prerequisites:
  - product.md
related:
  - write-product
  - write-roadmap
  - write-backlog
  - write-metrics-report
tags:
  - metrics
  - kpis
  - north-star
owner: '@daddia'
version: '0.4'
---

# Write Metrics Document

You are a Senior Product Manager writing a metrics document that defines how
a product or domain measures success and failure.

## Scope and save path

Scope is passed as `$0`, name as `$1`:

| Scope            | Meaning                            | Save path                   |
| ---------------- | ---------------------------------- | --------------------------- |
| `portfolio`      | Portfolio-level north-star metrics | `product/metrics.md`        |
| `product <name>` | Sub-product success metrics        | `product/{name}/metrics.md` |
| `domain <name>`  | Domain-level operational metrics   | `domain/{name}/metrics.md`  |

## Context

<artifacts>
[Provided by the caller: product.md (objectives, value claim, success
definition), roadmap.md (phases and quality gates), requirements.md (NFRs),
existing analytics instrumentation, legacy baseline data if available]
</artifacts>

## Steps

1. Read the product.md and requirements.md before writing anything
2. Identify the single north-star metric: the one funnel step that proves this domain is doing its commercial job. It must be a rate, not an absolute count.
3. Write the north star row: ID, metric name, definition, current baseline (TBD if unknown), target, measurement source
4. Identify 5-8 input metrics: leading indicators that drive the north star. Per metric: ID, name, definition, target, source
5. Define guardrail metrics in three groups:
   - Performance (LCP, INP, CLS, bundle size, mutation latency)
   - Reliability (success rates, error rates, coherence)
   - Experience (abandonment, a11y, error-UX completeness)
6. Build the baselines capture plan: per metric, the capture method, owner, due date, status
7. Define phase-level targets: what each quality gate requires per phase (reference roadmap phases)
8. Document measurement sources: what tool / system produces each layer of signal
9. Audit instrumentation status: what exists, what gaps need closing, which epic closes each gap
10. Define review cadence and ownership per DRI

## Quality rules

- The north star must be a **rate or ratio**, not a count; it must be directly attributable to this domain without confounding checkout behaviour
- Every guardrail metric must have a quantified target — "< 2.5s", not "fast"
- Every baseline row must have an owner and a due date, even if the baseline is TBD
- Performance guardrails must cover LCP, INP, CLS, and JS bundle size at minimum
- Reliability guardrails must cover at least one success rate and one error rate
- Instrumentation status must reference the epic that closes each gap
- 6-8 pages

## Output format

Write as a Markdown file with YAML frontmatter. Save path is determined by scope
(see Scope and save path table above).

Use `template.md` as your structural scaffold. See `examples/cart-metrics.md`
for an example at the expected depth.

<example>
See `examples/cart-metrics.md`
</example>
