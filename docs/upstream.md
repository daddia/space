# Merging changes from upstream

Upstream remote: `git@github.com:daddia/tpw-space.git`

## Push changes to remote mirror

```sh
git push --mirror git@github.com:daddia/tpw-space.git
```

## Review upstream changes

```sh
git fetch upstream
git log HEAD..upstream/main --oneline   # what's new upstream
git diff HEAD upstream/main             # full diff
```

## Merge

```sh
git merge upstream/main
# resolve any conflicts, then:
pnpm install
pnpm validate
git push origin main
```
