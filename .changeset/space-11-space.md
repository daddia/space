---
"@daddia/space": minor
---

Add `--mode embedded` flag and embedded workspace layout to `space init`.

`space init --mode embedded` initialises Space inside an existing code
repository, merging `devDependencies` and a managed `.gitignore` block without
clobbering host content. Layout is read from `.space/config` on subsequent
runs (sticky). The `workspace.layout` field is now typed and validated in
`WorkspaceConfig`.
