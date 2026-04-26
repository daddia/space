---
name: review-docs
description: >
  Deprecated alias for review-design. Use review-design for all new work. This
  alias will be removed in @daddia/skills v0.5.0. review-design reviews a
  work-package design.md for implementation readiness. Do NOT use this skill
  for new work — use review-design instead.
when_to_use: >
  Deprecated. Use review-design for all new work. review-design reviews
  work-package design.md for implementation readiness before a sprint starts.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
argument-hint: '<epic-id> [task-id]'
stage: deprecated
related:
  - review-design
  - review-solution
  - review-product
owner: '@daddia'
version: '0.3'
---

<!-- Alias: deprecated in favour of review-design -->

# review-docs — Deprecated

This skill is deprecated. Use **review-design** instead.

`review-design` reviews a work-package `design.md` for implementation
readiness, checking that the design is implementable, APIs are specified,
error handling is covered, and the test strategy is defined.

For product strategy reviews, use **review-product**.
For solution architecture reviews, use **review-solution**.
For ADR reviews, use **review-adr**.

