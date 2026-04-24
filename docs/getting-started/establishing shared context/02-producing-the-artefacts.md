---
title: Producing the artefacts for a product or domain
description: The end-to-end workflow for taking a product or domain from a blank slate to a complete, internally consistent artefact set.
---

The four canonical artefacts do not write themselves in a single pass. Producing a high-quality set — product strategy, solution architecture, roadmap, and backlog — is a structured but deliberately iterative process that mixes AI-assisted drafting with human judgement and multi-model review. This page walks through that workflow end to end.

## Guiding principles

Before stepping through the workflow, three principles shape every decision in it.

**Iteration over linearity.** The steps below are ordered for a reason, but you will circle back. A decision made in `solution.md` sometimes forces a revision to `product.md`. A legacy analysis can reshape the roadmap. Expect this; build time for it.

**Multi-model, multi-human review.** No single model has enough context or enough objectivity. The workflow calls for independent reviews by different AI models (Claude and ChatGPT) and by humans at every significant gate. Conflicts between reviewers are signal — they surface ambiguity in the artefacts that needs resolving before the next step.

**Cohesion is the exit criterion.** The workflow is complete when the full artefact set is internally consistent: no conflicts, no contradictions, and each artefact correctly references rather than restates the others.

## The flow at a glance

The steps below follow an iterative shape:

> **Research** → **Product** → **Solution** → **Legacy analysis** (if applicable) → **Alignment review** → **Roadmap** → **Backlog** → **Final review**

Each stage is a draft-review-revise loop, not a single pass. AI drafts, AI reviews (often by a second independent model), and human reviews alternate until the artefact is solid enough to unblock the next stage. A discovery at any stage can send you back up the chain.

---

## The workflow

### Step 1 — Deep research (recommended)

**Tool:** External Claude or ChatGPT (deep research / extended thinking mode)

Before writing a word of the artefacts, gather external signal. Deep research surfaces leading industry practices, competitor approaches, and relevant technical patterns that would otherwise be absent from a model trained on general data.

Useful research prompts include:

- What do industry leaders do in this domain?
- What are the leading patterns and pitfalls for this type of system?
- What has the research community identified as the key quality concerns?

Save the research output as a reference document — you will supply it as context in later steps. This step is optional, but the quality of the downstream artefacts is noticeably higher when it is done.

---

### Step 2 — Draft the product strategy

**Skill:** `write-product`
**Model:** High-reasoning (e.g. Opus)
**Output:** `product.md`

Run `write-product` to produce the first draft of the product strategy. The product document owns the *why*, *who*, and *what* — business context, customer segments, strategic thesis, and success definition. It must not contain technical decisions.

Provide as much context as you have:

- Links to existing web pages or marketing material
- Any existing artefacts from a prior cycle (product briefs, OKRs, strategy decks)
- The deep research output from Step 1
- Known constraints or non-starters

The model needs signal to be opinionated. A thin brief produces a thin `product.md`.

---

### Step 3 — Review the product strategy

**Human + Model:** High-reasoning (e.g. Opus)
**Model 2 (opt.):** Independent model (e.g. ChatGPT)

Review the draft `product.md` against the brief and any source material. The questions to hold in mind:

- Is the problem statement grounded in current reality, not aspirations?
- Is the strategic thesis opinionated — does it state what the product will *not* do?
- Are the success conditions verifiable rather than aspirational?
- Is anything in the document a restatement of content that belongs elsewhere?

Resolve gaps before moving to Step 4. A weak product document will produce an unfocused solution.

---

### Step 4 — Draft the high-level solution

**Skill:** `write-solution`
**Model:** High-reasoning (e.g. Opus)
**Output:** `solution.md`

Run `write-solution` to develop the solution architecture. The solution document owns the *how* — system boundary, architectural style, key technical choices, data model, cross-cutting concerns, and deployment topology. It must not restate business rationale from `product.md`.

Use `--stage stub` for a Phase 0 pass (pre-foundation sprint) or `--stage full` once a walking skeleton has shipped. For a greenfield domain at discovery time, the stub is the right starting point.

Provide:

- The approved `product.md`
- Deep research output (if available)
- Any existing architecture documents, ADRs, or contracts
- Known system constraints, platform dependencies, or NFR targets

---

### Step 5 — Review the solution architecture

**Human + Model:** High-reasoning (e.g. Opus)
**Model 2 (opt.):** Independent model (e.g. ChatGPT)

Review `solution.md` with the same rigour applied to the product document. Key checks:

- Is the system boundary clearly drawn — what the domain owns vs does not own?
- Are the key architectural trade-offs named, not just the choices made?
- Do the NFRs in `solution.md` align with the success definition in `product.md`?
- Are there any conflicts or contradictions between the two documents?

---

### Step 6 — Run legacy analysis (if applicable)

**Skill:** `legacy-analysis`
**Model:** Standard (e.g. Sonnet)
**Output:** `analysis.md` (in the relevant work directory)

If this domain is replacing or extending an existing system, run `legacy-analysis` against it before proceeding. The analysis reverse-engineers the current system's requirements, functionality, performance characteristics, and technical debt.

The output is not itself a canonical artefact — it is a reference document that feeds into `solution.md` and the `roadmap.md`. Keep it in the work directory alongside the other discovery material.

This step is skipped for entirely greenfield domains.

---

### Step 7 — Review all docs for alignment

**Skill:** `review-docs`
**Model:** High-reasoning (e.g. Opus)
**Model 2:** Independent model (e.g. ChatGPT)

With `product.md`, `solution.md`, and (where relevant) the legacy analysis in place, run `review-docs` to perform a cross-document consistency check. This step looks for:

- Gaps: requirements implied by `product.md` that have no technical treatment in `solution.md`
- Contradictions: claims in one document that conflict with another
- Drift: places where the solution has outgrown or diverged from the product intent
- Misplaced content: business rationale in `solution.md`, technical detail in `product.md`

Provide the legacy analysis as additional context even though it is not itself a canonical artefact — it gives the reviewer ground truth about the current system to compare against the proposed solution.

This is also a good point to send the combined pack — `product.md` + `solution.md` + legacy analysis — to both Claude (high reasoning) and ChatGPT independently. Conflicting feedback from two models almost always indicates genuine ambiguity that needs a human decision.

---

### Step 8 — Final sign-off on strategy and architecture

**Reviewer:** Human (no AI pass)

With AI review complete and issues resolved, a human reads the full set and makes the final call. This step is not a rubber stamp — it is where stakeholder context, commercial constraints, and organisational dynamics that the models cannot know are applied.

Document any decisions made here as comments or revisions to the artefacts so the reasoning is preserved.

---

### Step 9 — Create the roadmap

**Skill:** `write-roadmap`
**Model:** Standard (e.g. Sonnet)
**Output:** `roadmap.md`

Run `write-roadmap` to sequence the delivery into phases. The roadmap owns the *when* — what customer-visible capabilities land in what order, what quality gates each phase must clear, and what cross-domain dependencies exist.

The roadmap is driven by `product.md` (success definition, outcome priorities) and constrained by `solution.md` (what must be in place before what). A roadmap that contradicts either of these is a signal that the upstream artefacts need revision, not that the roadmap should paper over the gap.

Review the roadmap draft and revise `product.md` or `solution.md` if needed.

---

### Step 10 — Create the backlog

**Skill:** `write-backlog`
**Model:** Standard (e.g. Sonnet)
**Output:** `backlog.md`

Run `write-backlog` to decompose the roadmap into epics (domain scope) or stories (work-package scope). The backlog owns the *what next* — concrete, sized, sequenced work items with acceptance criteria.

The backlog is the most detail-dense artefact and therefore the most likely to expose gaps in the artefacts above it. If writing a story's acceptance criteria requires inventing a requirement not traceable to `product.md`, or making an architectural decision not in `solution.md`, that is a gap to resolve upstream — not to silently absorb into the story.

Review the backlog and propagate any discoveries back up the chain.

---

### Step 11 — Final review of all artefacts

**Human + Model:** High-reasoning (e.g. Opus)
**Model 2:** Consider an independent model pass as well

With all four artefacts drafted, perform a final end-to-end consistency review. The exit criterion for this step — and for the workflow as a whole — is:

- No artefact contradicts another
- No piece of content appears in more than one artefact (references are acceptable; restatements are not)
- Every epic in `backlog.md` traces to a phase in `roadmap.md`
- Every phase in `roadmap.md` maps to outcomes in `product.md`
- Every significant technical decision in `backlog.md` or `roadmap.md` is grounded in `solution.md`

If this review surfaces conflicts, resolve them at the correct artefact and re-review. The loop closes when the set is clean.

---

## The draft-review-revise loop

Every stage in the workflow is the same shape:

```text
draft → review (AI) → review (human) → revise → re-review
```

That loop runs at each tier — product, solution, roadmap, backlog — and a discovery at one tier should prompt a check of every artefact that depends on it. The process is complete when a reader can pick up any of the four documents and follow the references to any question they have without finding a gap, a contradiction, or an unexplained assertion.

---

## Model guidance

| Task | Recommended model |
| --- | --- |
| Deep research | External Claude or ChatGPT (extended thinking / deep research mode) |
| Drafting `product.md` | High-reasoning (e.g. Opus) |
| Drafting `solution.md` | High-reasoning (e.g. Opus) |
| Legacy analysis | Standard (e.g. Sonnet) |
| Cross-document alignment review | High-reasoning (e.g. Opus) |
| Independent review | A different model from the one that drafted — Claude vs ChatGPT |
| Drafting `roadmap.md` / `backlog.md` | Standard (e.g. Sonnet) |

The principle behind this table: use high-reasoning models where the task requires synthesising conflicting signals or making opinionated trade-offs, and use independent models for review to avoid self-reinforcing blind spots.

---

## Where to learn more

- **The four canonical artefacts** — what each artefact owns and how they compose: [`01-four-canonical-artefacts.md`](./01-four-canonical-artefacts.md)
- **Cart as a worked example** — the full artefact set for a real domain: [Cart on GitLab](https://gitlab.com/templeandwebster/storefront/storefront-space/-/tree/main/domain/cart?ref_type=heads)
