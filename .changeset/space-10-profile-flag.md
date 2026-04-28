---
"@daddia/create-space": minor
---

Add `--profile` flag and interactive profile prompt (SPACE-10).

Workspace scaffolding now supports selective skill materialisation via a named
profile. The flag is wired end-to-end through the CLI, `SpaceConfig`, and the
`space skills sync` invocation, and the chosen profile is persisted to
`.space/profile.yaml` so subsequent `space skills sync` calls inherit it
without needing the flag.

- `--profile <name>` option on `pnpm create @daddia/space` (valid names:
  `minimal`, `domain-team`, `platform`, `full`).
- Interactive `select` prompt in full interactive mode; skipped under `--yes`,
  in CI, or when `--profile` is provided explicitly. Default: `full`.
- `.space/profile.yaml` written after a successful `space skills sync`; absent
  when no profile is given or when sync fails, preventing an invalid name from
  being persisted.
- `trySkillsSync` return type changed from `void` to `boolean` to signal
  success to the caller.
