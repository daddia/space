# @daddia/space

Workspace ecosystem for daddia delivery spaces.

## Packages

| Package                                       | Description                                            |
| --------------------------------------------- | ------------------------------------------------------ |
| [`@daddia/skills`](packages/skills/)             | Delivery activity skills for AI coding agents          |
| [`@daddia/create-space`](packages/create-space/) | Scaffold a new daddia delivery workspace              |
| [`@daddia/space`](packages/space/)               | Operate a space -- sync external sources, publish docs |

## Quick start

```bash
pnpm install
pnpm build
```

## Releasing

Changesets manages versioning and publishing.

```bash
pnpm changeset        # record a change
pnpm version-packages # bump versions
pnpm release          # build + publish
```

## Licence

(c) 2026 Temple & Webster
