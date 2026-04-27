---
type: Product Strategy
scope: portfolio
version: '0.1'
owner: <!-- owner name -->
status: Draft
last_updated: <!-- YYYY-MM-DD -->
related:
  - <!-- product/{name}/product.md -->
  - <!-- product/{name}/product.md -->
  - product/roadmap.md
---

<!--
DRAFTING AIDE — DELETE THIS BLOCK BEFORE SAVING THE OUTPUT FILE.
DO NOT INCLUDE in a portfolio product.md:
  - File paths, module names, class names             → solution.md
  - API endpoints, HTTP verbs, schemas, type aliases  → solution.md or contracts.md
  - Tech stack names (React, Next.js, etc.)           → solution.md
  - Per-product strategy detail                       → product/{name}/product.md
  - Per-product roadmap detail                        → product/{name}/roadmap.md
  - Per-product backlog                               → product/{name}/backlog.md
-->

# {Portfolio Name} -- Portfolio Overview

## 1. What we are building

<!--
Two to three sentences per product: what it is, who it is for.
No strategy framing here — just enough for a newcomer to distinguish the products.

**{Product A}** is ...

**{Product B}** is ...
-->

## 2. Core thesis

<!--
Why these products belong together.
What is the combined bet?
What would break if either product were missing?
One paragraph, max four sentences.
-->

## 3. Commercial model

<!--
How the portfolio makes money.
Name the give-away vs premium split.
State licensing stances per product.
State distribution preferences (open-core, SaaS, self-hostable).
-->

## 4. Product responsibilities

<!--
Boundary table. One row per cross-product concern.
Every concern that touches more than one product must have a row.

| Concern | {Product A} | {Product B} |
| ------- | ----------- | ----------- |
| {concern} | Owns | Reads |
| {concern} | Not involved | Owns |
-->

## 5. Strategic discipline

<!--
The no-crossing rules.
Which primitives must stay in which product, and why.
Name the failure mode if a boundary erodes.
At least one concrete example of a primitive that must not cross.
-->

## 6. Sequencing

<!--
Which product ships first and why.
What the second product depends on the first having proven.
What the sequencing constraint is — technical, commercial, or strategic.
-->

## 7. Open questions

<!--
Decisions that must be made but are not yet made.
State a preferred direction where one exists.

| ID | Question | Preferred direction | Owner | Status |
| -- | -------- | ------------------- | ----- | ------ |
| OQ1 | {question} | {direction or open} | {owner} | Needs decision |
-->
