---
title: Definition of Ready
status: Active
owner: Team
last_updated: {projectKey}-INIT
---

# Definition of Ready

A work item is **ready** when the team has enough clarity to begin implementation without blocking on unanswered questions. This checklist applies to stories entering the Delivery track.

## Checklist

### Requirements

- [ ] Requirements documented with clear acceptance criteria
- [ ] Scope is bounded -- the story describes what is included and excluded
- [ ] Edge cases and error scenarios are identified

### Architecture

- [ ] Consequential architecture decisions are documented and approved (ADRs, if applicable)
- [ ] Technical design exists and is approved (for epics and complex stories)
- [ ] No unresolved technical unknowns that would block implementation

### Dependencies

- [ ] Dependencies on other stories, packages, or external systems are identified
- [ ] Blocking dependencies are resolved or have a clear resolution plan
- [ ] Required access, credentials, or infrastructure is available

### Sizing

- [ ] Story has an estimate
- [ ] Story is small enough to complete in one iteration
- [ ] If too large, it has been broken into smaller stories that are independently deliverable

## When to use

Apply this checklist before starting implementation. For stories run via `crew implement`, the planner sub-agent checks these conditions during the planning phase and flags gaps.

## Customising

This is a starting point. Add project-specific items as your team discovers recurring readiness gaps. Remove items that don't apply to your context.
