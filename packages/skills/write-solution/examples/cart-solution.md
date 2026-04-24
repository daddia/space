# Cart Solution (Domain Scope) — Example Reference

This example demonstrates `write-solution --stage full` at **domain scope**.

The canonical worked example is `domain/cart/solution.md` in the
`storefront-space` repository. Read that file directly as the reference; this
stub exists so the skill loader can confirm the examples directory is populated.

Key patterns to observe in `domain/cart/solution.md`:

- §1.1 System context — ASCII diagram showing PDP, mini-cart, cart page, BFF
- §1.2 System boundary — "Cart owns" list vs "Cart does not own" list; the
  latter references `product.md §5` rather than restating scope
- §2.1 Quality goals — five ordered goals with concrete thresholds
- §3 Solution strategy — six named principles (server-owned state,
  BFF-first integration, server-first rendering, optimistic where safe,
  `CartViewModel` as single UI contract, narrow Zustand)
- §4.3 Level 3 — `runCartMutation` helper with a TypeScript signature
- §5 Runtime view — five key sequences as text flows (ATC, qty change,
  remove with undo, promo apply, cart page load)
- §7.1 Error taxonomy — closed enum table with per-code UX treatment
- §7.4 Rollout control — worker-routing; no application-level flag (note this
  supersedes an earlier draft that mentioned a flag — correct version uses
  worker routing per `work/cart/01-foundations/design.md §5`)
- §9 ADR log — four candidate ADRs each marked "_(Not yet written)_"
- §10.2 Technical debt — short list; explicitly does not re-list items from
  `backlog.md §10`
- §11 Graduation candidates — eight rows each with a specific trigger

See: `domain/cart/solution.md` in `storefront-space`
