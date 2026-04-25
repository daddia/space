# Architecture Decision Register

This register tracks all the Architecture Decision Records (ADRs) for {projectName}.

ADRs document important architectural decisions which govern the project's design and development.

## What is an ADR?

An Architecture Decision Record captures a single architectural decision and its rationale. Each ADR describes:

- The context and problem statement
- The decision made
- The consequences of that decision
- Alternatives that were considered

---

## Foundation Architecture Decisions

The following ADRs document the architectural decisions made to date:

| ID  | Title | Status | Date | Supersedes | Related ADRs |
| --- | ----- | ------ | ---- | ---------- | ------------ |

---

## Future Architecture Decisions

Additional ADRs may be required:

_No planned ADRs at this time._

---

### Status legend

- **Proposed** — Under review, not yet adopted.
- **Accepted** — Adopted as the standard going forward.
- **Implemented** — Accepted and fully implemented in production.
- **Rejected** — Considered but not adopted.
- **Superseded** — Replaced by a newer ADR (link it in _Supersedes_).

---

## Creating a New ADR

Use the template in `architecture/decisions/adr-template.md` when creating a new ADR.

1. Copy the template to a new file with the naming convention `ADR-{NUMBER}-{title-with-dashes}.md`.

   ```bash
   cp architecture/decisions/adr-template.md architecture/decisions/ADR-{####}-{short-title}.md
   ```

The filenames are following the pattern `ADR-####-title-with-dashes.md`.

- The prefix is `ADR` to identify an Architecture Decision Record (ADR).
- `####` is a consecutive number in sequence.
- The title is stored using dashes and lowercase.
- The file type is `.md`, because it is a Markdown file.

2. Complete all the sections of the ADR template.
   - **Status**: `Proposed`
   - **Context**: Why was this decision needed?
   - **Decision**: What was decided and why?
   - **Consequences**: What are the trade-offs?
   - **Alternatives**: What else was considered?

3. Submit for review via pull request (PR). Start with **Proposed**.

4. On acceptance:
   - Update the status to **Accepted**.
   - Add a row to this Architecture Decision Register (`architecture/decisions/register.md`) index.

---

## Resources

- [Markdown ADR](https://adr.github.io/madr/)
- [ADR Tools](https://github.com/npryce/adr-tools)
- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
