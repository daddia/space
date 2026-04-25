# Changesets

This directory is used by [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## Workflow

1. After making changes, run `pnpm changeset` to create a new changeset.
2. Select the packages that have changed and the bump type (major/minor/patch).
3. Write a summary of the changes.
4. Commit the generated changeset file alongside your code changes.

When it's time to release:

1. Run `pnpm version-packages` to consume changesets, bump versions, and update `CHANGELOG.md` files.
2. Run `pnpm release` to build and publish to npm.
