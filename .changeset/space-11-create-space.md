---
"@daddia/create-space": minor
---

Add `--mode embedded` flag and embedded workspace layout to `create-space`.

Embedded mode scaffolds a Space workspace inside an existing code repository
as a top-level subtree. It merges Space's `devDependencies` and a managed
`.gitignore` block into the host repo without touching any host files.
Auto-detection infers the layout from code-repo markers; layout is sticky
once written to `.space/config`.
