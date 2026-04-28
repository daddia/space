# Embedded Workspace Layout

How to adopt Space inside an existing code repository without maintaining a
second repo.

## When to choose embedded over sibling

**Sibling** (the default) creates a dedicated `{project}-space` repository
that lives next to the application code. It is the right choice when:

- Multiple code repositories belong to the same initiative and a single
  delivery workspace coordinates them all.
- The workspace has different access control requirements than the source code.
- Delivery artifacts are maintained by a distinct team or process.

**Embedded** places the Space workspace inside an existing code repository as
a top-level subtree. Choose it when:

- The initiative is genuinely single-repo and maintaining two repos adds
  overhead without benefit.
- You want delivery artifacts (product strategy, design docs, backlog) to live
  alongside the code in the same git history.
- The team is small enough that separating delivery context from code context
  creates friction rather than reducing it.

**Sibling is the recommended default** for program-level workspaces that span
multiple code repos or need distinct access control.

## Initialise a new embedded workspace

### From scratch (empty or new directory)

```bash
pnpm create @daddia/space my-app --mode embedded
```

This creates `my-app/` with the embedded template: `.space/`, `AGENTS.md`,
and placeholder directories (`product/`, `architecture/`, `work/`, `docs/`,
`reports/`). It does not write `README.md`, `.code-workspace`, or `.gitignore`
as standalone files — those are either host-owned or handled by the managed
block described below.

### Adopt into an existing repo

Run from the root of your existing repository:

```bash
pnpm create @daddia/space . --mode embedded --yes
```

Or, if `@daddia/space` is already installed:

```bash
space init --mode embedded
```

The command inspects the directory and:

1. Creates `.space/config` with `workspace.layout: embedded`.
2. Merges `@daddia/space` and `@daddia/skills` into `devDependencies` in
   your existing `package.json`. All other fields are untouched.
3. Appends a managed block to your existing `.gitignore` (see below).
4. Creates `.agents/skills/`, `.cursor/skills`, and `.claude/skills`
   agent-discovery symlinks.

Source files, `README.md`, and all other host files are never touched.

## Files managed by Space vs preserved

| File / directory                                          | Embedded behaviour                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `.space/config`                                           | Created; merged on reinit (missing keys appended; existing values preserved) |
| `.space/raci`, `.space/team`                              | Created on first init; never touched on reinit                               |
| `AGENTS.md`                                               | Created on first init; never overwritten                                     |
| `product/`, `architecture/`, `work/`, `docs/`, `reports/` | `.gitkeep` placeholders created; never overwritten                           |
| `package.json`                                            | `devDependencies` merged; all other fields untouched                         |
| `.gitignore`                                              | Managed block appended (see below); host content untouched                   |
| `.agents/skills/`, `.cursor/skills`, `.claude/skills`     | Always created/recreated (idempotent symlinks)                               |
| `README.md`                                               | **Never created or modified**                                                |
| `.code-workspace`                                         | **Never created or modified**                                                |
| `.env.example`                                            | **Never created or modified**                                                |
| Source files, tests, configs                              | **Never created or modified**                                                |

## The managed `.gitignore` block

Space appends a clearly-marked block to the host `.gitignore`:

```gitignore
# >>> @daddia/space — managed block, do not edit between markers
.space/sources/
.space/cache/
runs/
node_modules/
.cursor/skills
.claude/skills
# <<< @daddia/space
```

**Rules:**

- Everything above the `# >>>` marker is host content — Space never modifies it.
- The content between the markers is refreshed on every `space init` reinit.
  Do not add custom entries between the markers; they will be overwritten.
- Add any additional entries above the marker or in a separate section after
  the managed block.

## Update the managed block on reinit

Running `space init` again inside an embedded workspace is safe and idempotent:

```bash
space init
```

It reads `workspace.layout: embedded` from `.space/config` and re-runs the
embedded merge helpers. The managed `.gitignore` block is updated in-place;
everything outside the markers is preserved verbatim.

## Layout is sticky

Once a workspace is initialised as embedded, the layout persists in
`.space/config`. Passing `--mode sibling` to a subsequent `space init` or
`create-space` run is silently ignored with a warning:

```
Warning: Workspace is already embedded; --mode flag ignored
```

Converting an existing embedded workspace to sibling (or vice versa) requires
manual steps and is not supported by the CLI.

## Auto-detection

When `--mode` is omitted, the CLI inspects the target directory for code-repo
markers (`.git/`, `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`,
`pom.xml`, `build.gradle`, `Gemfile`, `requirements.txt`):

- **Interactive mode**: if markers are found, a prompt asks "Embed a Space
  workspace here? (Y/n)".
- **Non-interactive mode** (`--yes` or CI): detection is skipped and `sibling`
  is used as the safe default.
