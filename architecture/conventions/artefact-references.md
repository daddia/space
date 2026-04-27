# Artefact References

How to reference artefacts — within a workspace and across source repos — in frontmatter fields and body prose.

## Two reference types

### Workspace-relative paths

Use for artefacts that live in the current workspace:

```yaml
related:
  - product/product.md
  - product/space/roadmap.md
  - work/space/SPACE-01/design.md
```

Paths are relative to the workspace root. No prefix required.

### Source references — cross-repo

Use for artefacts that live in a code repo registered in `.space/config`:

```
{source}:{path}
```

Where:
- `{source}` matches a key under `sources:` in `.space/config`
- `{path}` is relative to that source's local `path:` root

Example `.space/config`:

```yaml
sources:
  crew:
    repo: github:daddia/crew
    path: /path/to/crew

  space:
    repo: github:daddia/space
    path: /path/to/space
```

Example references:

```yaml
# In a workspace artefact's frontmatter
related:
  - crew:architecture/solution.md
  - space:architecture/solution.md
  - crew:architecture/decisions/register.md
```

```markdown
<!-- In a workspace artefact's prose -->
Engineering principles live in [crew:architecture/principles.md](crew:architecture/principles.md).
```

## Rules

**1. Never use `../` relative paths in artefact frontmatter or body prose.**

`../` paths are workspace-layout-dependent and break when the workspace moves or when the document is published to an external system. Use `{source}:{path}` instead.

**2. Workspace paths never use a source prefix.**

If the file lives in the current workspace, reference it by its workspace-relative path.

**3. Source names must match `.space/config` exactly.**

`crew:architecture/solution.md` only resolves if `sources.crew` is defined. A typo produces a broken link.

**4. Skills describe the convention with generic placeholders.**

Skills in `@daddia/skills` are workspace-agnostic. When a skill body refers to a cross-repo artefact, it uses a generic placeholder like `{source}:architecture/solution.md`, not a specific source name. The consuming workspace fills in the correct source name from its `.space/config`.

## Artefact tier paths (reference)

| Tier | Save path | Example |
| --- | --- | --- |
| Portfolio strategy | `product/product.md` | `product/product.md` |
| Sub-product strategy | `product/{name}/product.md` | `product/space/product.md` |
| Domain strategy | `domain/{name}/product.md` | `domain/cart/product.md` |
| Work package | `work/{wp}/{artefact}.md` | `work/space/SPACE-01/design.md` |

## `parent:` field

Every sub-portfolio artefact should carry a `parent:` field linking one tier up:

```yaml
# product/space/product.md — sub-product pointing to portfolio
parent: product/product.md

# product/space/roadmap.md — roadmap pointing to its product strategy
parent: product/space/product.md

# domain/cart/solution.md — domain pointing to product
parent: product/product.md   # in single-product workspace
```

The `parent:` field is a workspace-relative path (no source prefix needed).
