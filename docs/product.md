---
type: Product
product: space
version: '0.2'
owner: Horizon Platform
status: Draft
last_updated: 2026-04-22
---

# Product -- Space

## 1. Executive summary

Space is the delivery workspace ecosystem for AI-assisted engineering. It gives
any team the tools to scaffold a structured workspace, equip AI agents with
versioned activity skills, and keep external program data -- issues, pages,
contracts -- available offline inside the environment where agents work.

A space is a first-class product artifact, not a folder you happen to check
out. It knows who the team is, what they are building, where the code lives,
and what program context the agents need. Space is the substrate: when an agent
knows how to navigate a space, it can navigate any team's workspace. When a
skill improves, every workspace improves simultaneously.

Space is not an agent runtime. It is what makes agent-assisted delivery
consistent, versioned, and portable -- across IDEs, across squads, and across
initiatives.

## 2. Problem

Every engineering team working with AI agents today faces the same invisible
tax: before any agent can be useful, someone has to manually explain the
context. Where is the code? What is the naming convention? What does the team
call done? What are the open issues? That explanation lives in a chat thread,
evaporates between sessions, and has to be rebuilt from scratch every time.

The structural problems underneath:

- **Delivery knowledge is personal, not organisational.** Prompts, templates,
  and workflow conventions live in individual machines, personal repos, and
  Slack threads. There is no versioned, shared library of delivery activities
  that a team can install and a new engineer can trust on day one.
- **Workspaces are improvised.** Each project invents its own directory layout,
  agent instructions, and IDE configuration. Agents cannot make reliable
  assumptions across projects because no two workspaces look the same.
- **Program data does not travel with the workspace.** Issues, pages, and
  decisions live in external systems. Agents have no reliable access to them
  without hitting APIs live, which requires credentials, network, and manual
  copy-paste. The workspace is disconnected from the program it represents.
- **Skills are IDE-specific.** Prompts written for Cursor do not work in
  Claude Code. When tooling changes, the investment in prompts is written off
  and rebuilt. There is no portability.
- **Quality is inconsistent.** Without shared gates and definitions of done,
  every agent invocation produces a different quality of artifact. There is no
  organisational standard to improve against.

## 3. Opportunity

The delivery workspace is the leverage point. Fix the workspace and you fix the
context problem for every agent, every session, every team.

1. **A skill library as organisational memory.** Structured delivery skills --
   versioned, tested, multi-IDE -- mean that when a team learns a better way to
   write requirements or review code, that learning is captured once and
   distributed to everyone. The organisation gets smarter as a whole, not just
   one engineer at a time.
2. **Consistent workspaces that agents can navigate.** Every team starts from
   the same opinionated scaffold. Agents know where to find the product
   strategy, the architecture, the open work, the conventions. The cost of
   orientation drops to zero.
3. **A workspace connected to its program.** Issues and pages from external
   systems are committed to the workspace as versioned data. Agents reason over
   real program state. Reviews cite live issues. Decisions reference current
   documentation. The workspace is not a static snapshot -- it reflects the
   program as it evolves.
4. **Delivery quality that scales.** Gates, definitions of done, and review
   skills mean that quality criteria are structural, not personal. A team at
   T&W in 2028 gets the same quality gates as a team in 2026, without anyone
   manually maintaining them.
5. **A platform that compounds.** Every new skill, every new source integration,
   every improvement to the workspace template improves every team using space
   simultaneously. The investment in the platform returns each time a new
   initiative adopts it.

## 4. Strategic thesis

1. **The workspace is a product.** A space is not a side-effect of having a
   git repo. It is designed, versioned, and maintained as a product artifact.
   Teams own their workspace the same way they own their code. Space provides
   the product standard; teams operate within it.

2. **Skills are content, not code.** A skill is a Markdown file that any
   agent can read and follow. It does not require a build, a runtime, or a
   framework. This keeps skills portable across every IDE that supports
   Markdown skill files and decouples skill quality from any particular
   toolchain. Space will not build a proprietary DSL or execution runtime for
   skills -- the content must remain the asset, not the wrapper around it.

3. **The mirror is faithful, not interpreted.** External data enters the
   workspace in its native format -- Jira issues as JSON, Confluence pages as
   storage-format XHTML. Nothing is converted on the way in. The mirror is a
   round-trippable copy of upstream state. This keeps sync safe, deterministic,
   and free of the lossy assumptions that come with format conversion.

4. **Write back deliberately.** Reading from external systems is always safe.
   Writing back -- publishing a document to Confluence, updating a Jira issue --
   requires an explicit declaration in the document's frontmatter. No document
   is published to an external system without opt-in. This makes the workspace
   a safe place to draft and iterate without risk of polluting upstream systems.

## 5. Value claim

1. Any team can stand up a standards-compliant, agent-capable delivery
   workspace from a single command. Setup is minutes, not days.
2. Delivery skills are versioned organisational knowledge -- installed like a
   dependency, updated like a dependency, auditable in source control.
3. Any agent operating in a space has access to the full program context --
   issues, pages, decisions -- without requiring live API access or manual
   copy-paste.
4. A new engineer joining any Horizon initiative lands in a workspace they can
   navigate immediately, because every space follows the same conventions.
5. Skill improvements compound: a better requirements skill benefits every team
   on the next install, not just the team that wrote it.

## 6. Target users

### Primary

- **Engineering squads doing AI-assisted delivery.** The everyday consumers of
  skills. They invoke skills in their IDE to write requirements, produce
  technical designs, review code, and raise merge requests. They need skills to
  be accurate, well-structured, and available without friction. They benefit
  from the workspace sync because agents they work with can reference real
  program state.
- **Engineering and architecture leads** starting new projects or initiatives.
  They run `create-space` once at project start and configure `.space/config`.
  They need the scaffold to be complete, opinionated, and consistent with the
  rest of the organisation.
- **Program and transformation leads.** They maintain the connection between
  program data and the workspace. They trigger syncs when upstream data needs
  refreshing and author the documents that the workspace publishes back to
  Confluence. They need sync to be low-effort and publishing to be safe.

### Secondary

- **The `@tpw/crew` autonomous runtime.** Crew resolves skills by name at
  execution time by reading files from the space. Space provides the content;
  Crew provides the execution model. This is a content dependency, not a code
  dependency -- Crew does not import from `@tpw/space`.

### Out of scope

- End users of products built by teams using space. Space is internal
  engineering infrastructure.
- Business functions that do not operate a delivery workspace.
- Teams outside the Horizon program who have not adopted the workspace
  conventions.

## 7. Scope

### In scope

**Delivery skills.** A versioned, multi-IDE library of structured delivery
activity skills covering the full engineering lifecycle: discovery and
product strategy, requirements, technical design, architecture decisions,
implementation, code review, merge request preparation, and quality gates.
Skills are plain Markdown and work with any IDE that supports Markdown skill
files. The library includes templates, worked examples, and definitions of done
as first-class content.

**Workspace scaffolding.** A CLI that produces a complete, standards-compliant
delivery workspace from a single command. The scaffolded workspace includes
the directory layout, agent instruction files, IDE configuration, skill
installation, and the `.space/` config convention. The template is the
authoritative workspace structure; all Horizon initiative workspaces are
scaffolded from it.

**Workspace operations.** A CLI that connects a workspace to its external
sources. In the first instance: Jira issue sync and Confluence page sync. Each
sync operation pulls from the upstream API and writes native-format data to
`.space/sources/{provider}/`. Later: publish authored documents back to
Confluence for explicitly opted-in files.

**The `.space/` convention.** The workspace identity and config layer: project
identity, source references, team configuration, RACI, and the machine-written
source mirrors. This convention is stable and shared across all tools in the
space ecosystem.

### Out of scope

- An agent execution runtime. Skills are content; running them is Crew's
  responsibility.
- A browser-based UI or dashboard for space management.
- Derived views or automatic document generation from sync data.
- Credentials management beyond a local `.env` file.
- Analytics, billing, or multi-tenancy features.
- Skills for non-engineering delivery activities (marketing, legal, finance).

### Adjacent surfaces

- **`@tpw/crew`** (autonomous delivery runtime). Crew reads skills and workspace
  data at execution time. Space and Crew have a clean content boundary: Space
  owns the workspace substrate; Crew owns the execution layer.
- **Initiative workspaces** (e.g. `horizon/storefront-space`). These are the
  consumers. Each is scaffolded from the `create-space` template, installs
  `@tpw/skills`, and operates with `@tpw/space`. The first initiative workspace
  is the primary validation environment for Space.
- **`horizon/horizon`** (the transformation program). The program-level
  workspace uses the same `.space/` conventions and sync tooling, operating at
  the cross-initiative level rather than the initiative level.

## 8. Ownership and interfaces

| Interface | Counterparty | Obligation |
| --------- | ------------ | ---------- |
| `@tpw/skills` npm package | Any consuming workspace | Additive-only; no breaking changes to the `SKILL.md` format or file structure without a major version bump |
| `sync-skills` bin | Consuming workspace on install | Deterministic copy to `skills/`; never deletes project-local skills; manifest tracks which skills come from which source |
| `@tpw/create-space` template | Scaffolded workspace | Template is the authoritative workspace structure; changes to it propagate on next scaffold |
| `.space/config` schema | `@tpw/space` CLI | Schema is stable; new keys are additive; breaking changes require a major version |
| `.space/sources/{provider}/` layout | `@tpw/crew`, agents, humans | Native format, deterministic file structure, safe to re-run; layout documented in the space design |

## 9. Success definition

Space is succeeding when:

1. Any team can go from zero to a fully operational, agent-ready delivery
   workspace faster than they could manually configure one -- and the result is
   more complete than anything they would have built themselves.
2. Skills are treated as a shared organisational resource, not personal
   property. Teams install, update, and contribute to the skill library through
   the same workflows they use for code dependencies.
3. Agents operating in a space consistently produce higher-quality artifacts
   than agents operating without one -- requirements that close open questions,
   designs that reference real architecture decisions, reviews that cite the
   agreed definition of done.
4. Program leads can sync Jira and Confluence into a workspace and have agents
   reason over the full program context in the same session -- without manual
   copy-paste, without live API calls, without credential juggling.
5. When a team migrates from one IDE to another, the workspace and its skills
   continue to work without modification. The investment in workspace quality
   does not depend on tooling choices.
6. The skill library improves across the organisation faster than any one team
   could improve their own prompts -- because improvements are versioned,
   distributed, and adopted by all teams on the next install.

## 10. Relationship to Horizon

Horizon is a transformation program. Space is the platform that makes every
Horizon initiative's delivery workspace consistent and capable. The
relationship is vertical:

```
horizon/                  transformation program
  initiatives/            initiative workspaces (use @tpw/skills, @tpw/space)
    storefront-space/
    [future spaces]

space/                    workspace ecosystem (this product)
  @tpw/skills             shared delivery skill library
  @tpw/create-space       workspace scaffolding
  @tpw/space              workspace operations (sync, publish)

crew/                     autonomous delivery runtime
                          reads from space; does not own it
```

The compounding logic runs top-to-bottom: improvements to skills and workspace
conventions benefit all initiatives simultaneously. Improvements to the sync
tools give every initiative access to richer program context. As the platform
matures, initiatives spend less time on workspace setup and more time on
delivery.

Space does not govern any initiative. It provides the substrate. Each
initiative workspace governs its own work within the conventions Space defines.

## 11. Future enhancements

### Embedded workspace mode

The current model scaffolds a space as a sibling repository (`{project}-space/`)
alongside the code repository. A future enhancement is an embedded mode where
the space lives inside the code repo as a top-level subtree rather than a
separate clone.

```
storefront/              code + space, one clone
  .space/                config, team, raci, source mirrors
  skills/                synced from @tpw/skills
  product/               product strategy, roadmap
  architecture/          ADRs and diagrams
  work/                  gitignored; active in-progress work
  apps/
  packages/
```

Embedded mode has a distinct set of advantages over sibling mode:

- A code change and the ADR or design update that justifies it land in the same
  merge request. Reviewers see the design change alongside the diff.
- Agents operating in the workspace have direct access to the codebase without
  cross-repository path resolution.
- Onboarding collapses to a single clone and install command.
- CI can enforce coupling between code changes and documentation updates within
  the same diff.

Embedded mode is not appropriate in every situation. Sibling mode remains the
correct choice when a space spans multiple code repositories (program-level
workspaces such as `horizon/horizon`), when access controls require separating
space contributors from code committers, or when sync output volume in
`.space/sources/` would pollute the code repository history.

The implementation path is a new `--mode` flag on `create-space`. The scaffold
behaviour diverges only at the file-placement and `package.json` mutation
step -- the `.space/config` schema, `.space/sources/` layout, skill
conventions, and all tooling remain identical between the two modes. `@tpw/space`
and `@tpw/crew` already resolve the workspace root by walking up from `cwd` to
find `.space/config`; they require no changes.

```
pnpm create @tpw/space --mode embedded   # writes into an existing repo
pnpm create @tpw/space --mode sibling    # default; creates {project}-space/
```

Success condition: a team with a single-repository initiative can adopt Space
without maintaining a second repository, with no loss of functionality compared
to sibling mode.
