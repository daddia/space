---
name: refine-docs
description: >
  Documents the sprint-end refinement session: promotes WP-local ADR
  candidates into solution.md, archives superseded work-package design
  sections, and produces a refine-session.md recording every decision made.
  Use when the user mentions "refine docs", "promote ADRs", or "end of sprint
  cleanup". Do NOT use before implementation is complete — use implement first.
  Do NOT use to review docs before a sprint — use review-docs for that.
when_to_use: >
  Use at the end of a sprint or work package, after implementation is done
  and before the next sprint begins. Typical triggers: "refine the docs after
  this sprint", "promote the ADR candidates from this design", "archive the
  superseded design sections for SPACE-03", "end of sprint cleanup for the
  cart epic".
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
argument-hint: '<work-package-path> [--scope portfolio|product|domain] [--name <name>]'
artefact: refine-session.md
track: refine
also-relevant-to-tracks:
  - architecture
role: architect
also-relevant-to-roles:
  - engineer
domain: architecture
stage: stable
consumes:
  - solution.md
  - design.md
produces:
  - refine-session.md
prerequisites:
  - solution.md
  - design.md
related:
  - review-design
  - review-solution
  - write-adr
  - write-solution
  - write-wp-design
  - refine-solution
tags:
  - sprint-end
  - adr
  - refinement
  - docs
owner: '@daddia'
version: '0.3'
---

# Refine Docs

You are a Senior Solution Architect doing a sprint-end documentation pass.
At the end of a sprint or work package you promote decisions that deserve
permanent homes in `solution.md` and clean up WP-local design sections that
no longer carry new information.

## Scope

`$0` is the work-package path (e.g. `work/space/SPACE-03/`). Optionally,
`--scope <tier> --name <name>` targets a specific solution.md (default: resolve
from the work-package path).

Scope resolution:

| Flag | Target solution.md |
| --- | --- |
| `--scope domain --name cart` | `domain/cart/solution.md` |
| `--scope product --name space` | `product/space/architecture/solution.md` |
| `--scope portfolio` | `architecture/solution.md` |
| (no flag) | Walk up from the WP path to find the nearest solution.md |

The ADR register path follows the same scope logic: portfolio/product ADRs live
at `architecture/decisions/register.md`; domain ADRs may live at
`domain/{name}/architecture/decisions/register.md` or the workspace-level
register as configured.

## Steps

1. **Read the WP design.** Open `{wp}/design.md` and identify every section
   marked as an ADR candidate (look for phrases like "_(Not yet written)_",
   "Candidate ADR", or open questions that were resolved during the sprint).

2. **Triage ADR candidates.** For each candidate, decide:
   - **Promote** — the decision is consequential, affects other squads, or
     needs formal traceability. Write the ADR body using `write-adr`.
   - **Inline** — the decision is local to this WP; note it in `solution.md`
     §9 (ADR log) as an inline bullet without a separate file.
   - **Defer** — not yet resolved; leave as an open question.

3. **Update `solution.md`.** For each promoted or inlined decision:
   - Add an entry in §9 (Architectural decisions / ADR log).
   - Cross-reference the ADR file if written, or add the inline decision text.
   - Update §10 (Risks, technical debt, open questions) to close any items
     resolved by this sprint.

4. **Archive superseded design sections.** In `{wp}/design.md`, add a
   collapsed HTML comment block at the top of any section whose content is
   now fully captured in `solution.md`:

   ```html
   <!-- ARCHIVED: content promoted to solution.md §{section} on {date}. -->
   ```

   Do not delete sections — preserve them for audit. Add the archive comment
   only; do not rewrite or shorten the original prose.

5. **Record the session.** Write `{wp}/refine-session.md` using `template.md`
   as the scaffold.

## Quality rules

- Do not change the meaning of any existing `solution.md` section — only add
  entries and close open questions.
- Archived design sections must remain readable; only the comment prefix is
  added, never a deletion.
   - Each ADR promoted in this session must be cross-referenced in both the
     `solution.md` ADR log and the workspace ADR register (see Scope section).
- Do not create ADR files speculatively — only formalise decisions that were
  actually made and implemented during the sprint.

## Negative constraints

The refine-session.md MUST NOT contain:

- Story-level acceptance criteria → those remain in `work/{wp}/backlog.md`
- Future work or scope not yet implemented → open a new story instead
- Re-narration of design content already captured in `solution.md` → reference
  it by section instead
