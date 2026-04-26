---
name: design
description: >
  Alias for write-wp-design. Use write-wp-design instead. This alias will be
  removed in @tpw/skills v0.4.0. write-wp-design drafts a work-package design
  document in walking-skeleton mode (foundation sprint, 2–4 pages) or TDD mode
  (sprint 2+, 5–10 pages). Use when the user mentions "design", "TDD", "write
  the design for {epic}", or "how should we implement {story}".
when_to_use: >
  Deprecated alias for write-wp-design. Use write-wp-design for all new work.
  This alias is kept for one release to avoid breaking workspace customisations
  that reference the old 'design' skill name.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
version: '0.2'
stage: deprecated
related:
  - write-wp-design
---

# Design (Alias — use write-wp-design)

> **This skill has been renamed. Use `write-wp-design` instead.**
>
> This alias will be removed in `@tpw/skills v0.4.0`.

`write-wp-design` replaces `design` with:

- Two modes: `--mode walking-skeleton` (foundation sprint, 2–4 pages) and
  `--mode tdd` (sprint 2+, 5–10 pages).
- Structured templates for each mode.
- Explicit references to `solution.md` sections rather than re-narrating domain patterns.

To use the new skill, invoke `write-wp-design` in place of `design` with the
same context. The output path (`work/{d}/{wp}/design.md`) is unchanged.

See `../write-wp-design/SKILL.md` for the full skill definition.
