# Skill Discovery and Routing

How agents find the right skill — and how to write skill descriptions that route reliably.

## How routing works

When an AI coding agent loads a workspace with Space skills installed, it pre-loads the `name` and `description` of every skill into its system prompt at session start. The skill body is only read if the description triggered.

**Routing is LLM classification on `description`, not folder layout.** A skill whose description does not clearly signal when to use it will never be invoked, regardless of how good its body is.

Two consequences:

1. **The description is the highest-ROI part of any skill.** A perfect implementation behind a weak description is invisible.
2. **Folder structure, `tags:`, `role:`, and `when_to_use:` do not affect routing.** Those fields serve tooling (the index, role views, CI checks) — not the model's decision to invoke the skill.

## Description authoring rules

```yaml
description: >
  Drafts product.md at portfolio, product, or domain scope. Use when the
  user mentions "product doc", "PRD", "product strategy", or "what are we
  building". Do NOT include tech stack — use write-solution. Do NOT use for
  roadmaps — use write-roadmap.
```

### Must-have elements

**1. Opens with a third-person verb-ing form.**

The linter enforces one of: `Drafts`, `Creates`, `Implements`, `Reviews`, `Performs`, `Documents`, `Produces`, `Identifies`, `Refines`.

**2. States the produced artefact verbatim** (for `.md`-producing skills).

**3. Contains at least one `Do NOT use` disambiguation clause** pointing at the neighbouring skill that handles the adjacent use case.

**4. 200–500 characters.** The linter enforces this range.

### Calibration

The description should be:
- **Specific about triggers** — name the exact phrases users say: "the user mentions 'review the backlog'", not "applicable to backlog review scenarios"
- **Honest about scope** — if the skill only covers domain scope, say "domain scope"; don't imply it works everywhere
- **Mildly pushy** when under-triggering is the risk — use imperative phrases like "Use when..." not "Can be used when..."
- **Not a superset of `when_to_use`** — `description` is for routing; `when_to_use` is for the human or agent that is already reading the skill

### Anti-patterns

```yaml
# Too vague — no trigger phrases, no disambiguation
description: >
  Reviews artefacts for quality.

# Passive — hard to trigger
description: >
  This skill can be used when documents need reviewing before development.

# Missing Do NOT clause
description: >
  Drafts product.md for any scope. Use when product strategy is needed.

# Too long (>500 chars) — linter will reject
```

## `space-index` router skill

As the library grows past ~15 skills, description collision becomes a risk: multiple skills look plausible for a given query. `space-index` is the safety net.

`space-index` is a meta-skill with:
- A `description` that triggers on vague routing requests ("which skill should I use?", "what can I do here?", "help me plan")
- A body that is an **auto-generated table** of every sibling skill's frontmatter

The table is regenerated in CI via `packages/skills/bin/generate-index.js` between the sentinel markers:

```markdown
<!-- BEGIN GENERATED — do not edit; run `pnpm generate:index` to refresh -->
| Skill | Description (excerpt) | Artefact | Track | Role | Consumes | Produces |
...
<!-- END GENERATED -->
```

This is a deterministic alternative to embedding search. At Space's scale (15–40 skills), a generated index table is more reliable and cheaper than vector search.

## Description eval loop

`scripts/eval-descriptions.py` tests skill routing on a representative query set (`scripts/eval-queries.json`). For each skill, 20 queries × 3 samples measure trigger rate. CI blocks merge on regression.

Seed the query set from real workspace session transcripts once sessions are available.

Running manually:

```bash
python scripts/eval-descriptions.py
```

## `when_to_use` field

`when_to_use` is not read by the router. It is read by:
- Humans browsing the skill library
- Agents that have already triggered the skill and want extended context

Write it as full prose: when in the delivery lifecycle to invoke the skill, example phrases, and boundary with related skills.
