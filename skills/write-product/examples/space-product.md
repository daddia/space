---
type: Product
product: space
stage: product
version: '1.0'
owner: Horizon Platform
status: Draft
last_updated: 2026-04-23
related:
  - docs/solution.md
  - docs/roadmap.md
  - docs/backlog.md
---

# Product -- Space

## 1. Problem

Every engineering team working with AI agents pays the same invisible tax
before any agent can do useful work: somebody has to manually explain the
context every session. Where is the code? What does the team call done?
What are the open issues? That explanation lives in chat threads,
evaporates between sessions, and gets rebuilt from scratch each time.

The underlying structural problems are:

- **Delivery knowledge is personal, not organisational.** Prompts,
  templates, and workflow conventions live in individual machines,
  personal repos, and Slack threads. No versioned, shared library of
  delivery activities that a team can install and a new engineer can
  trust on day one.
- **Workspaces are improvised.** Each project invents its own directory
  layout, agent instructions, and IDE configuration. Agents cannot make
  reliable assumptions across projects because no two workspaces look
  the same.
- **Program data does not travel with the workspace.** Issues, pages,
  and decisions live in external systems. Agents have no reliable
  offline access, so every session begins with credentials, API calls,
  and copy-paste.
- **Skills are tool-locked.** Work done for one AI coding tool does not
  carry to another. When tooling changes, the investment is written off.
- **Quality is inconsistent.** Without shared gates and definitions of
  done, every agent invocation produces a different quality of
  artifact. No organisational standard exists to improve against.

## 2. Appetite

Space is treated as a _platform investment_, not a product trial. It is
built incrementally with a small team (1-2 engineers) in parallel with
a live validation workspace (`storefront-space`). We ship small,
opinionated increments every few weeks; each increment proves itself
against a real team doing real delivery before the next is started.

We will not run a generalised beta programme. Adoption is deliberate,
workspace-by-workspace, inside the Horizon programme first. External
open-source release is deferred until the model has been validated
against at least three initiative workspaces.

## 3. Sketch

Space gives a team three things:

1. **A versioned library of delivery activity skills.** Skills capture
   how the organisation writes a product strategy, produces a technical
   design, writes an ADR, reviews code, raises a merge request, and so
   on. Improvements are distributed once and adopted everywhere on the
   next install.
2. **A scaffolder that stands up a standards-compliant workspace from a
   single command.** Every workspace looks the same in the places that
   matter: identity, team, RACI, source mirrors, skills, directory
   layout, agent instructions. Agents can navigate any workspace
   because every workspace follows the same conventions.
3. **An operations tool that connects a workspace to its program
   data.** Jira issues and Confluence pages are mirrored into the
   workspace on demand; documents written in the workspace can be
   published back to Confluence when they explicitly opt in. Agents
   reason over program state offline; humans publish deliberately.

The shape is deliberately minimal: skills are content, the workspace is
a product artefact, and program data is a faithful mirror. Anything
that cannot be expressed inside these three shapes belongs in a
different platform.

## 4. Rabbit holes

Risks that Space will deliberately stay out of:

- **Building an agent runtime.** Executing skills is a separate
  concern, owned by `@daddia/crew`. Space ships the substrate; Crew runs
  on top of it.
- **Authoring a proprietary skill DSL.** Skills are Markdown so they
  work across every current and future AI coding tool that reads
  Markdown skill files. A DSL would lock adoption to whichever runtime
  implemented it.
- **Interpreting external data on the way in.** Program mirrors store
  what the upstream system returned, unchanged. Converting on ingest
  introduces lossy assumptions and makes two-way sync untrustworthy.
- **Centralising credentials or multi-tenant management.** Every
  workspace manages its own credentials through standard local
  mechanisms. No shared credential vault, no Space service to operate.
- **Generating derived documents automatically from source mirrors.**
  Sync is a one-way copy; humans and agents decide what to author
  against the mirror. Space does not auto-generate reports, summaries,
  or roll-ups.

## 5. No-gos

Explicit out-of-scope for the product:

- End-user-facing products built by teams using Space (those are each
  team's responsibility).
- Business functions outside engineering delivery (marketing, legal,
  finance). Space is delivery infrastructure.
- Analytics, billing, or multi-tenant SaaS offerings of the platform
  itself.
- A browser UI or dashboard for Space management.
- Skill content for domains outside engineering delivery.
- Acting as a credential vault or secret manager.

## 6. Target users

### Primary

- **Engineering squads doing AI-assisted delivery.** The daily consumers
  of skills. They invoke skills in their coding tool to write
  requirements, produce technical designs, review code, and raise merge
  requests. They need skills accurate, well-structured, and available
  without friction. They benefit from workspace sync because the agents
  they work with can reference real program state.
- **Engineering and architecture leads starting new initiatives.** They
  run the scaffolder once at project start and configure the workspace.
  They need the scaffold complete, opinionated, and consistent with the
  rest of the organisation.
- **Program and transformation leads.** They maintain the connection
  between program data and the workspace. They trigger syncs when
  upstream data needs refreshing and author the documents the workspace
  publishes back to the knowledge base. They need sync low-effort and
  publishing safe.

### Secondary

- **The `@daddia/crew` autonomous runtime.** Crew reads the workspace at
  execution time. Space owns the substrate; Crew owns the execution
  model.

### Out of scope segments

- End users of products built by Space-using teams.
- Non-engineering business functions.
- Teams outside the Horizon programme that have not adopted the
  workspace conventions (until Phase Later, per the roadmap).

## 7. Outcome metrics

Targets only; instrumentation and dashboards live in a future
`docs/metrics.md`.

| Outcome                                                          | Baseline                    | Target (12 mo)                     |
| ---------------------------------------------------------------- | --------------------------- | ---------------------------------- |
| Time from zero to a fully operational agent-ready workspace      | Days (manual configuration) | <= 30 minutes                      |
| Share of Horizon initiative workspaces scaffolded from Space     | 0                           | 100% of new initiatives            |
| Horizon initiatives running current skill library version        | N/A                         | >= 80% within 30 days of release   |
| Agent sessions that can reason over program context offline      | 0                           | 100% of sessions in a synced space |
| Skill improvements adopted across teams without manual migration | Ad hoc                      | Automatic on next install          |
| Cross-tool portability of skills (Cursor, Claude Code, etc.)     | 0                           | 100% of skills                     |

Success indicators, not metric targets:

- A new engineer can navigate any Horizon workspace on their first day
  because the conventions are identical.
- Agents produce higher-quality artefacts in a space than outside one
  (requirements that close open questions, designs that reference
  agreed architecture, reviews that cite the agreed definition of done).
- The skill library improves across the organisation faster than any
  one team could improve their own prompts alone.

## 8. Product principles

These are commercial / product-level principles. Engineering principles
are separate and live in `docs/solution.md`.

1. **The workspace is a product.** A space is designed, versioned, and
   maintained alongside the code it supports, not a side-effect of
   having a git repo.
2. **Skills are content.** Skills are Markdown the agent reads and
   follows. They require no build, no runtime, no framework. This
   keeps them portable across every current and future AI coding tool.
3. **The mirror is faithful.** External data enters the workspace in
   its native upstream format. We do not convert on the way in because
   conversion introduces lossy assumptions that break two-way sync.
4. **Write back deliberately.** Reading from external systems is
   always safe. Writing back requires an explicit declaration per
   document. No file reaches an external system without opting in.
5. **Improvements compound across the organisation.** Versioning skills
   and conventions as dependencies means one team's learning
   automatically benefits every team on the next install.

## 9. Stakeholders and RACI

| Stakeholder                      | Responsibility                                                                      | R/A/C/I |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------- |
| Horizon Platform team            | Builds and maintains Space; owns the skill library, scaffolder, and operations tool | R, A    |
| Engineering leads (initiative)   | Adopt Space for new initiatives; govern workspace quality per convention            | R       |
| Engineering squads (initiative)  | Consume skills; contribute improvements back through the skill library              | R       |
| Program and transformation leads | Operate sync; author documents published back to the knowledge base                 | R       |
| `@daddia/crew` team              | Consume the workspace substrate at runtime; contract on file-system conventions     | C       |
| AI tooling vendors (indirect)    | Support the Markdown skill format; no commitments from Space                        | I       |

## 10. Relationship to Horizon

Horizon is a transformation programme. Space is the platform that makes
every Horizon initiative's delivery workspace consistent and capable.
The relationship is vertical:

- **Horizon** -- the transformation programme; many initiatives.
- **Initiative workspaces** (e.g. storefront-space) -- the consumers of
  Space. Each is scaffolded from Space, installs the skill library, and
  uses the operations tool.
- **Space** (this product) -- the workspace ecosystem.
- **Crew** -- the autonomous delivery runtime; reads from the workspace
  at execution time.

The compounding logic runs top-to-bottom: improvements to Space benefit
every initiative simultaneously. Initiatives that adopt the conventions
early spend progressively less time on workspace setup and progressively
more on delivery. Space does not govern any initiative; it provides the
substrate, and each initiative governs its own work within the
conventions Space defines.

The first validation workspace is `storefront-space`. The next
initiatives to adopt are gated on the roadmap; see `docs/roadmap.md`.
