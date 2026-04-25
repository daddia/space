---
title: Definition of Done
status: Active
owner: Team
last_updated: {projectKey}-INIT
---

# Definition of Done

A work item is **done** when it meets all quality, review, and verification standards. This checklist applies to stories exiting the Delivery track. Every item must pass before a story is considered complete.

## 1. Code

- [ ] Acceptance criteria are implemented
- [ ] No hardcoded values, secrets, or debug artifacts in committed code
- [ ] No commented-out code or temporary workarounds without a tracked follow-up
- [ ] Code follows project conventions (see `AGENTS.md`)

## 2. Quality

- [ ] Linting passes with no new violations
- [ ] Type checking passes
- [ ] Test suite passes with no new failures or skips
- [ ] New behaviour has test coverage (unit, integration as applicable)
- [ ] No regressions introduced

## 3. Review

- [ ] Pull request created with clear description linking to requirements
- [ ] Peer code review approved
- [ ] All review feedback addressed or explicitly deferred with a tracked issue
- [ ] PR merged to main

## 4. Documentation

- [ ] `AGENTS.md` updated if repo structure or conventions changed
- [ ] Contributing docs updated if development workflow changed
- [ ] Changelog entry added (changeset for npm packages, or manual for docs)
- [ ] Architecture decisions documented (ADR) if a consequential choice was made

## 5. Verification

The story is not done until the delivered artifact works from the user's perspective. This is the "smoke test" step.

### For stories that change published packages

- [ ] Changeset added with correct bump type
- [ ] Version PR created and merged
- [ ] Packages published to registry successfully
- [ ] Fresh install from registry works (`npm install <package>` in a clean directory)
- [ ] User-facing commands produce correct output (version, help, core functionality)

### For stories that change workspace scaffolding

- [ ] Generated workspace installs dependencies from registry
- [ ] Generated workspace structure matches expectations
- [ ] Commands work from inside the generated workspace

### For stories that change documentation only

- [ ] Documentation renders correctly
- [ ] Links are not broken
- [ ] Referenced files and paths exist

## When to use

Apply this checklist before marking a story as complete. For stories run via `space implement`, the self-review and pr-author sub-agents check applicable items. The `space verify` command (when available) automates AC coverage checking.

## Customising

This is a starting point. Add project-specific verification steps as your team discovers recurring "done but broken" scenarios. The verification section (5) is the most important to customise -- it should reflect how your users actually consume the delivered artifact.
