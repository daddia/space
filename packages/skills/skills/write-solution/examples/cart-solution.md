---
type: Solution
domain: cart
stage: full
version: '1.0'
owner: Cart & Checkout Squad
status: Draft
last_updated: 2026-04-23
parent_product: domain/cart/product.md
related:
  - domain/cart/product.md
  - domain/cart/roadmap.md
  - domain/cart/backlog.md
  - domain/cart/contracts.md
  - domain/cart/metrics.md
  - domain/cart/dependencies/bff-contract-uplift.md
  - domain/cart/dependencies/central-api-audit.md
  - domain/cart/research/legacy-analysis.md
  - architecture/solution.md
  - architecture/principles.md
  - architecture/decisions/ADR-0015-client-mutations.md
  - architecture/decisions/ADR-0016-state-machine-pattern.md
  - architecture/decisions/ADR-0017-state-machine-library.md
---

# Solution -- Cart

Cart-domain solution design. Captures the architecture, cross-cutting concepts, data contracts, and key decisions that apply to **every** cart work package. Work-package designs (`work/cart/<wp>/design.md`) reference this document rather than redefining its patterns.

For the product context, problem, users, and commercial scope see [`domain/cart/product.md`](product.md).

## 1. Context and scope

### 1.1 System context

The cart is a sub-product of the storefront. It owns the customer-facing cart surfaces (cart page, add-to-cart flow on the PDP, mini-cart coherence) and the `CartViewModel` contract consumed by the Checkout domain.

```text
Customer Browser
 |
 +-- PDP (RSC)  -- PurchaseActions.client.tsx  (CART02)
 |                  |
 |                  +-- POST /api/cart/items    (Next.js route handler)
 |                        -> bffClient action addLineItem
 |                        -> revalidateTag(CART_TAG)
 |                        -> revalidateMiniCart()
 |
 +-- MiniCart popover (client) -- useMiniCart() SWR key  (/api/cart/mini)
 |
 +-- Cart Page (RSC) at /cart  (CART01 shell; CART03+ content)
       |
       +-- getCart()
       |     -> bffClient.json('/carts', { apiVersion: 'v0.1' })
       |     -> Cart_v0_1  (from @daddia/bff-client-types)
       |     -> cartToViewModel()  ->  CartViewModel
       |
       +-- CartContent.client.tsx
             +-- useOptimisticCart(initialViewModel)
             +-- CartLineItem.client.tsx   (CART03)
             +-- OrderSummary.client.tsx   (CART04)
             +-- PromoCodeSection.client.tsx (CART08)
             +-- ReconciliationBanner.client.tsx (CART06)
             +-- EmptyCartState.tsx        (CART05)
             +-- TradeProgramRow.tsx       (CART05)

BFF layer  (api-contracts/contracts/storefront-bff/openapi.v1.yaml)

  GET  /carts                  -> Cart_v0_1 | CartMini_v0_1
  PUT  /carts/{cartId}         -> CartUpdateRequest_v0_1 -> Cart_v0_1
       actions: addLineItem, removeLineItem, changeLineItemQuantity,
                addPromoCode, removePromoCode, setShippingMethod, ...
  PUT  /carts/{cartId}/order   -> CartOrderResponse_v0_1
```

### 1.2 System boundary

Cart **owns**:

- The `/cart` page, its skeleton, and the `(cart)` route group.
- The add-to-cart flow on the PDP (the PDP renders the button; the cart owns the contract and the route handler).
- The mini-cart popover data contract and revalidation hook.
- The `CartViewModel` contract and its mapper from `Cart_v0_1`.
- Cart API route handlers under `/api/cart/*`.
- Cart analytics event schema and cart observability spans.
- Cart-specific error taxonomy (`CartMutationErrorCode`).

Cart **does not own** (technical boundary only; for the full list of deferred customer-facing capabilities see [`domain/cart/product.md`](product.md) §5):

- `storefront-bff` API schema -- BFF squad.
- Central business-rule enforcement -- Central team.
- Checkout flow (delivery, billing, payment, place-order) -- Checkout domain.
- Mini-cart popover UI (already shipped; this cycle only extends the revalidation contract).

### 1.3 Upstream and downstream systems

- **Upstream -- storefront-bff** (BFF squad). Provides `GET /carts`, `PUT /carts/{cartId}`, and `GET /carts?view=mini`. Schema evolution tracked in [`dependencies/bff-contract-uplift.md`](dependencies/bff-contract-uplift.md).
- **Downstream -- Checkout domain**. Consumes `CartViewModel` and BFF-derived types. The cart publishes; Checkout refines.
- **Downstream -- Shopping Experience squad (PDP)**. Consumes the `POST /api/cart/items` route contract. The cart publishes; PDP consumes.
- **Downstream -- Analytics squad**. Consumes the cart event schema.
- **Adjacent -- Cloudflare Worker**. Forwards `/api/*` POST requests to the new storefront. Status-quo; no change required.

## 2. Quality goals and constraints

### 2.1 Quality goals (top 5)

Ordered; the top goal dominates when goals conflict.

1. **Cart-to-checkout step rate matches or improves legacy.** The cart is a commercial surface. No structural quality ships that regresses this metric.
2. **Core Web Vitals on the cart page.** LCP p75 mobile < 2.5 s; INP p75 < 200 ms; CLS p75 < 0.1. Non-negotiable.
3. **Mutation responsiveness.** Perceived latency p75 < 500 ms; server round-trip p75 < 800 ms; p95 < 1.5 s.
4. **Coherence across surfaces.** The mini-cart reflects canonical cart state within one render (<= 1 s) after any mutation from any origin.
5. **Accessibility (WCAG 2.1 AA).** axe-core clean in CI; manual keyboard and screen-reader review at CART14.

Full metric tree with IDs (`CM-01`, `CM-I01..08`, `CM-G01..15`), baselines, phase targets, and instrumentation status lives in [`domain/cart/metrics.md`](metrics.md).

### 2.2 Constraints

- **Technical:** Next.js App Router + React Server Components; BFF-only integration (no direct backend calls); `@daddia/bff-client-types` is the generated type source; Webster UI primitives for visual components.
- **Legacy parity:** inherited business rules from the legacy basket -- quantity limits, minimum-order quantity, forced quantity multiplier, GST-inclusive pricing, AU locale. Canonical list and rationale in §6.3.
- **Regulatory:** WCAG 2.1 AA. No PII in logs or analytics payloads.
- **Organisational:** Single squad (Cart & Checkout). Cross-squad dependencies on BFF, Shopping Experience, Analytics, Trade, and Platform SRE -- tracked per phase in [`domain/cart/roadmap.md`](roadmap.md).

## 3. Solution strategy

Six strategy choices that shape every detailed decision below.

### 3.1 Server-owned cart state

The cart a customer sees is what the server says it is. Every mutation returns the full updated cart. The storefront does not model cart state client-side.

Consequences:

- No client-side finite state machine for cart data flow (no XState for cart mutations). Cart mutations follow the BFF-first pipeline: `react-hook-form` + SWR + `useOptimistic` + `useTransition`. Every mutation is request-response, not multi-step orchestration. See ADR-0016.
- Every mutation returns the full `CartViewModel`; callers reconcile via `apply({ type: 'replace', next })`. No partial patches.
- Concurrent edits across tabs or devices resolve via `VERSION_CONFLICT` + reconciliation banner. No multi-tab sync channel.
- There is no offline mode or queued mutation for the cart.

### 3.2 BFF-first integration

All cart reads and mutations flow through `bffClient` from `@/lib/bff`. `bffClient.json(...)` for reads; `bffClient.request(...)` with `method: 'PUT'` for mutations. Module code never makes direct HTTP calls to Central or any other backend.

`@/lib/bff` (wrapping `@tw/bff-client`) is the application boundary. The `storefront-bff` OpenAPI contract is the upstream contract. Types derive from `@daddia/bff-client-types`. Any upstream schema additions are absorbed inside the mapper rather than leaking into module callers.

### 3.3 Server-first rendering with client islands

- `/cart` is a React Server Component. Components needing interactivity use the `.client.tsx` suffix.
- `getCart()` is `import 'server-only'`; route is `no-store`.
- Client islands: `CartContent`, `CartLineItem`, `OrderSummary`, `PromoCodeSection`, `ReconciliationBanner`, `UndoToast`, `StickyCheckoutBar`, `PurchaseActions` (on PDP).
- Presentational surfaces stay server-rendered: `EmptyCartState`, `TrustSignals`, `CartPageBottomSection`, `TradeProgramRow`, `CartSkeleton`.

### 3.4 Optimistic where safe, honest where not

- **Line-level edits** (quantity, remove) use `useOptimistic` + `reduceCart` for zero-perceived-latency with structural rollback on failure. See ADR-0015.
- **Cart-level mutations** that change pricing or availability (promo apply, postcode change, Purchase Protection) surface pending state and wait for the server. A customer never sees a false price.
- Rollback is structural: on failure the UI reverts to the pre-mutation view model; no manual reconciliation of partial updates.

### 3.5 `CartViewModel` as the single UI contract

`CartViewModel` is the single data-to-UI contract. `cartToViewModel` maps `Cart_v0_1` (BFF) to `CartViewModel`. Every UI component receives typed view-model slices as props; no component touches the BFF shape directly.

This boundary absorbs Wave-1 vs Wave-2 BFF uplifts: fields added upstream show up as new `CartViewModel` slices or populated fields without changing the component contract.

### 3.6 Narrow client state in Zustand

Where the UI needs short-lived coordination that no BFF call owns -- modal coordinator (mini-cart open/close), undo queue, Save-for-Later session store -- Zustand is adopted per ADR-0017. Cart's Zustand footprint is intentionally small; cart-data mutations remain request-response with SWR and `useOptimistic`.

### 3.7 How the strategy satisfies the quality goals

| Quality goal              | Strategy choices that satisfy it   |
| ------------------------- | ---------------------------------- |
| Step rate improvement     | 3.4, 3.5                           |
| Core Web Vitals           | 3.3, 3.6                           |
| Mutation responsiveness   | 3.2, 3.4                           |
| Coherence across surfaces | 3.1, 3.5                           |
| Accessibility             | 3.3, 3.6 (islands keep DOM narrow) |

## 4. Building block view

### 4.1 Level 1 -- domain placement

```text
apps/store/src/
  app/
    (cart)/                   route group for cart surfaces
      cart/page.tsx           RSC cart page
      cart/layout.tsx         (cart) layout
    api/cart/                 cart API routes
      items/route.ts          POST, PATCH, DELETE per line
      promo-codes/route.ts    POST, DELETE per code
  modules/
    cart/                     cart module (below)
  lib/
    bff/                      bffClient (shared)
    analytics/                track() (shared)
```

### 4.2 Level 2 -- the cart module

```text
modules/cart/
  data/
    clients/
      bff-cart.client.ts      getCart() + mutation helpers via bffClient
      bff-minicart.client.ts  (existing; mini-cart read)
    queries/
      get-cart.ts             getCart() wrapped in React cache()
    mappers/
      cart.mapper.ts          cartToViewModel(BffCart) -> CartViewModel
    schemas/
      cart-action-schema.ts   Zod schemas for mutation bodies
    cache/
      cache-tags.ts           CART_TAG export
  logic/
    types.ts                  CartViewModel + all view-model slice types
    error-messages.ts         Customer-facing copy per CartMutationErrorCode
    errors.ts                 extractCartError mapping helper
    cart-reducer.ts           reduceCart for optimistic updates
  ui/
    cart-page/                Cart page components (server + client)
    mini-cart/                (existing; mini-cart popover)
    add-to-cart/              PurchaseActions helpers consumed by PDP
    hooks/
      use-revalidate-mini-cart.ts   mini-cart revalidation bridge
      use-update-cart-line.ts       line-level mutation hook
      use-remove-cart-line.ts
      use-apply-promo-code.ts
      use-remove-promo-code.ts
      use-add-cart-line.ts
      use-cart-refetch.ts
    stores/
      use-cart-modal-store.ts       Zustand -- mini-cart open/close
      use-cart-undo-store.ts        Zustand -- undo queue (CART03)
      use-saved-items-store.ts      Zustand -- Save-for-Later session (CART11)
  index.ts                    server barrel (server-safe exports)
  client.ts                   client barrel (client hooks and view-model types)
```

Every UI component imports view-model types and helpers from the client barrel; route handlers and RSCs import from the server barrel. This prevents accidental `'use server'` / `'use client'` leakage.

### 4.3 Level 3 -- cross-cutting runtime helper

All mutation API routes share one helper, `runCartMutation` (`modules/cart/data/clients/run-cart-mutation.ts`):

```typescript
// Simplified signature
export async function runCartMutation<TBody, TAction>(
  request: Request,
  schema: ZodSchema<TBody>,
  action: (body: TBody, cartId: string) => TAction,
): Promise<Response> {
  // 1. parse + validate body via Zod schema
  // 2. resolve cartId from session
  // 3. dispatch bffClient.request('/carts/{cartId}', { method: 'PUT', body: action })
  // 4. map any HttpStatusError to CartMutationErrorCode via extractCartError
  // 5. on success: revalidateTag(CART_TAG)
  // 6. return Response with discriminated CartMutationResult
}
```

Every cart mutation route is three lines of setup plus a call to `runCartMutation`. Error mapping, tag revalidation, and observability are single-sourced.

## 5. Runtime view

### 5.1 Add to cart (CART02)

```text
PDP user clicks "Add to cart"
  -> PurchaseActions.client.tsx
     -- react-hook-form validates qty against purchaseConfig
     -- generate idempotencyKey (UUID v4)
     -> useAddCartLine({ sku, qty, idempotencyKey })
        -> POST /api/cart/items  (Next.js route)
           -> runCartMutation
              -> Zod parse AddCartLineSchema
              -> bffClient.request('/carts/{cartId}', {
                   method: 'PUT',
                   body: { action: 'addLineItem', sku, qty, idempotencyKey, cartVersion }
                 })
              -> revalidateTag(CART_TAG)
              -> discriminated CartMutationResult
  -> client reads result
     -- on success:
        -- mini-cart popover opens (or toast per Figma)
        -- useRevalidateMiniCart() triggers SWR mutate()
        -- track('add_to_cart', payload)
     -- on error:
        -- inline error with retry (copy from error-messages.ts)
        -- track('add_to_cart_failed', { code })
```

### 5.2 Quantity change (CART03)

```text
Customer nudges quantity stepper
  -> useOptimistic dispatches { type: 'setLineQty', lineId, next }
     -- UI renders new qty and recomputed line total immediately
  -> useUpdateCartLine({ lineId, qty, idempotencyKey })
     -> PUT /api/cart/items/[lineId]
        -> runCartMutation
           -> bffClient action changeLineItemQuantity
           -> revalidateTag(CART_TAG)
  -> on success: reconcile with server's CartViewModel (apply replace)
  -> on error: rollback optimistic update + inline error on affected line
  -> useRevalidateMiniCart() (success or terminal failure)
  -> track('update_cart_quantity', payload)
```

### 5.3 Remove with undo (CART03)

```text
Customer clicks "Remove" on line
  -> capture line snapshot to useCartUndoStore (Zustand)
  -> useOptimistic dispatches { type: 'removeLine', lineId }
     -- line collapses / fades; order summary updates
  -> useRemoveCartLine({ lineId, idempotencyKey })
     -> DELETE /api/cart/items/[lineId]
        -> runCartMutation -> bffClient action removeLineItem
  -> on success: render UndoToast.client.tsx (5 s countdown)
     -- if undo clicked: useAddCartLine with captured snapshot
  -> on error: rollback + inline error
  -> useRevalidateMiniCart()
  -> track('remove_from_cart', payload)
```

### 5.4 Promo code apply (CART08)

Cart-level mutation, so **no optimistic update**:

```text
Customer submits promo code
  -> PromoCodeSection.client.tsx shows pending state
  -> useApplyPromoCode({ code, idempotencyKey })
     -> POST /api/cart/promo-codes
        -> runCartMutation -> bffClient action addPromoCode
  -> on success: apply({ type: 'replace', next }) with server's cart
     -- order summary updates with discount
     -- track('coupon_applied', payload)
  -> on error: inline error copy keyed by CartMutationErrorCode
     -- COUPON_INVALID, COUPON_EXPIRED, COUPON_MINIMUM_NOT_MET,
        COUPON_REGION, COUPON_ALREADY_APPLIED
     -- track('coupon_failed', { code })
```

### 5.5 Cart page load and reconciliation

```text
Request /cart
  -> Next.js middleware (auth, flag check)
  -> (cart)/cart/page.tsx (RSC)
     -> getCart()
        -> bffClient.json('/carts')
        -> Cart_v0_1 | null
        -> cartToViewModel(Cart_v0_1) | null
  -> render CartSkeleton via Suspense fallback
  -> on data: render CartContent.client.tsx with initialViewModel
     -- if viewModel.notices[] non-empty: render ReconciliationBanner
     -- if viewModel.isEmpty: render EmptyCartState
     -- else: render line items + order summary
```

### 5.6 Sign-in basket merge

```text
Anonymous customer signs in while on /cart
  -> useOnAuthChange() fires
  -> useCartRefetch() triggers SWR revalidation
     -> getCart() re-fetches; BFF returns merged cart (Central spMergeCustomerBaskets)
  -> if merge fails:
     -- session snapshot captured pre-sign-in is used to render "Restore items" affordance
     -- 5-minute TTL in sessionStorage; no PII
```

## 6. Data model and ubiquitous language

### 6.1 Glossary

- **Cart** -- the server-authoritative shopping basket. `Cart_v0_1` upstream; `CartViewModel` in the UI.
- **Cart line** -- one selected variant + quantity.
- **Mini-cart** -- the header popover. Its own SWR key; revalidated after any cart mutation via `useRevalidateMiniCart`.
- **CartViewModel** -- the single data-to-UI contract. Produced by `cartToViewModel`. Stable; additive-only changes.
- **Cart session** -- the session-scoped correlation id for analytics funnel; hashed cart id used in logs.
- **Mutation action** -- one of `addLineItem`, `removeLineItem`, `changeLineItemQuantity`, `addPromoCode`, `removePromoCode`, and (Wave 2) postcode, Purchase Protection, and Save-for-Later actions.
- **Cart version** -- monotonic version used for optimistic concurrency (`VERSION_CONFLICT` retry).
- **Idempotency key** -- UUID v4 generated client-side per submit; de-duped by the BFF.
- **Reconciliation banner** -- the page-level notice surfacing stock or price changes between sessions.
- **Wave 1 / Wave 2** -- Wave 1 ships against the current `Cart_v0_1` schema with safe fallbacks; Wave 2 activations land as each BFF schema uplift item ships.

### 6.2 Types and schemas

Canonical definitions live in [`domain/cart/contracts.md`](contracts.md) (Sections 1-8):

- Section 1: BFF type imports from `@daddia/bff-client-types`.
- Section 2: `BffCart` shape (alias of `Cart_v0_1`).
- Section 3: `CartViewModel` and all slice types.
- Section 4: `CartMutationErrorCode` enum and `CartMutationResult` shape.
- Section 5: Zod schemas for mutation API routes.
- Section 6: analytics event envelope and per-event payloads.
- Section 7: API route contracts (paths, methods, request / response shapes).
- Section 8: cache tag (`CART_TAG`) and cache directives.

### 6.3 Legacy business rules

Enforced in the cart. Rationale in `research/legacy-analysis.md`; values live as named constants in `modules/cart/logic/constants.ts`:

- `MAX_CART_ITEMS = 250`. Exceeding returns `CART_FULL`.
- Minimum order quantity per variant (`PrMinOrderQty`) enforced on add and update.
- Forced quantity multiplier (`PrForceQtyMultiplier`) enforced on add and update; misaligned quantities auto-adjust up with a visible message.
- All displayed pricing is GST-inclusive. `cartToViewModel` performs no tax arithmetic.
- Locale is `en-AU`; currency `AUD`. Non-AU behaviour is out of scope.

## 7. Cross-cutting concepts

### 7.1 Error taxonomy

`CartMutationErrorCode` is the closed enum every mutation returns on failure. Full list in `contracts.md` Section 4; UX and copy rules:

| Code                      | Customer-facing treatment                                                      |
| ------------------------- | ------------------------------------------------------------------------------ |
| `NETWORK_ERROR`           | Inline "Something went wrong, try again" + retry; optimistic update rolls back |
| `OUT_OF_STOCK`            | Line-level flag; exclude from total; offer remove                              |
| `MAX_QUANTITY_EXCEEDED`   | Stepper max visible; message "Max qty for this item reached"                   |
| `MIN_QUANTITY_REQUIRED`   | Message "Min order qty is X"; auto-adjust up                                   |
| `QUANTITY_STEP_INVALID`   | Auto-adjust up to next valid step; visible message                             |
| `CART_FULL`               | Block add; message "Your cart has reached its limit (250 items)"               |
| `LINE_NOT_FOUND`          | Recover by refetching cart                                                     |
| `COUPON_INVALID`          | Inline below promo input: "This code isn't valid"                              |
| `COUPON_EXPIRED`          | Inline: "This code has expired"                                                |
| `COUPON_MINIMUM_NOT_MET`  | Inline: "Spend $X more to use this code"                                       |
| `COUPON_REGION`           | Inline: "This code isn't valid for your region"                                |
| `COUPON_ALREADY_APPLIED`  | Inline: "This code is already applied"                                         |
| `SESSION_EXPIRED`         | Pause mutation; prompt re-auth; preserve cart; resume on success               |
| `VERSION_CONFLICT`        | One silent retry; on second conflict, show reconciliation banner               |
| `PROMO_STACKING_CONFLICT` | "Replace existing?" confirm (Wave 1 single-coupon semantics)                   |
| `UNKNOWN`                 | Generic retry message; log with full context                                   |

Copy lives in `modules/cart/logic/error-messages.ts`. Mapping from upstream errors is centralised in `extractCartError`.

### 7.2 Observability

- Every mutation emits a distributed trace span `cart.action.<name>` with attributes: `cart_id_hashed`, `correlation_id`, `idempotency_key`, `action`, `cart_version`, `error_code` (on failure), `duration_ms`, `origin` (pdp | cart-page | mini-cart).
- RED metrics (Rate / Errors / Duration) per mutation method.
- RUM custom timing `cart_mutation_perceived` emitted per line mutation; feeds `CM-G05`.
- Structured logs via `@tw/logging` with correlation context; hashed cart id; no PII; promo codes partially redacted.
- Funnel analytics: `view_item` -> `add_to_cart` -> `view_cart` -> `begin_checkout` -> `purchase`. Cart owns the middle three events.

### 7.3 Security

- No PII in client logs or analytics payloads.
- Cart id is hashed in logs; promo codes partially redacted.
- Idempotency keys are UUID v4 generated client-side per submit.
- Session expiry triggers re-auth while preserving cart contents via sessionStorage snapshot (5-minute TTL, no PII).
- All mutation API routes validate request bodies with Zod before dispatch; invalid bodies return 400 without touching the BFF.
- Rate limiting and bot protection continue to be enforced at Central; surface rejections are rendered as a generic error.

### 7.4 Rollout control

The cart does **not** use an application-level feature flag. CART01 decided during foundations (see `work/cart/01-foundations/design.md` §5) that `/cart` access is controlled at the Cloudflare worker layer above the storefront: the worker forwards `/cart` either to the legacy basket or to the new storefront based on its routing configuration. This keeps middleware clean and removes a moving part from the storefront deployment.

**Rollout strategy.**

- The worker routes `/cart` binary per environment in Now (staging forwards to new storefront; production still forwards to legacy).
- Next phase ramps production traffic at the worker: 1% -> 5% -> 10% -> 100% of AU traffic, with go / no-go review at each step against the guardrails in [`domain/cart/metrics.md`](metrics.md) Section 5.
- Legacy basket path (`/v/checkout/basket/show`) is classified as deprecated when the worker reaches 100% on the new storefront; retirement schedule per [`domain/cart/roadmap.md`](roadmap.md) Next phase.
- Sub-flows that replace non-functional scaffolds (the PDP add-to-cart stub, the mini-cart revalidation bridge) ship without any flag. There is no regression risk -- the surfaces they replace are inert today.
- Wave-2 capability activations (line polish, shipping estimate, Purchase Protection, Save-for-Later cross-device) activate in the mapper as each BFF uplift lands -- no flag; the mapper's fallback is the pre-uplift behaviour.

Worker routing configuration and per-environment rules are operational concerns, not design, and live in the Cloudflare worker repo.

### 7.5 Cache and routing

- `/cart` is `Cache-Control: no-store` end-to-end (the storefront's convention for commerce-mutable routes).
- `(cart)` route group owns a cart-specific layout (NavigationHeader + MainFooter), separate from the `(checkout)` group's chrome.
- Cloudflare Worker forwards `/api/*` POST requests to the new storefront. No change required for the cart.
- `CART_TAG` is revalidated after every successful mutation via `revalidateTag(CART_TAG)` inside `runCartMutation`.

### 7.6 Accessibility

- Every cart surface meets WCAG 2.1 AA.
- Stepper buttons and inputs have visible focus indicators and accessible labels.
- `aria-live="polite"` on order summary updates and error messages.
- Reconciliation banner and undo toast reachable via keyboard.
- axe-core passes in CI for every cart PR from CART03 onwards.
- Manual keyboard and screen-reader review at CART14.

### 7.7 Testing strategy

| Layer                    | Scope                                                            | Target            |
| ------------------------ | ---------------------------------------------------------------- | ----------------- |
| Unit (Vitest)            | `cartToViewModel`, `reduceCart`, `extractCartError`, schemas     | 100% branches     |
| Unit (hooks)             | All mutation hooks with mocked route handlers                    | 100% branches     |
| Route handler (Vitest)   | Each `/api/cart/*` route with mocked `bffClient`                 | Happy + every err |
| Integration (Playwright) | ATC from PDP; quantity change; remove + undo; promo apply; empty | Phase 1 happy     |
| Integration (Playwright) | Reconciliation banner; session expiry; version conflict retry    | Phase 2           |
| Contract tests           | Analytics event schema matches `contracts.md` Section 6          | Blocks CI         |
| axe-core (CI)            | Cart page, mini-cart, empty state                                | Pass on every PR  |
| RUM synthetic (staging)  | CWV for `/cart` on mobile + desktop                              | Phase 2+          |

## 8. Deployment and environments

- **Build:** standard storefront build (pnpm + turbo).
- **Routing:** Cloudflare Worker forwards `/cart` (to legacy basket or new storefront, per worker config); Vercel edge middleware; Vercel Node.js runtime.
- **Rollout control:** worker-level per environment; no application-level flag (see §7.4).
- **Observability:** traces to the storefront's shared tracing backend; RED metrics per action to the service metrics dashboard; RUM via the existing RUM provider.
- **Traffic ramp:** guardrail-led per phase gate in [`domain/cart/roadmap.md`](roadmap.md); the Next-phase canary can abort to 0% instantly by reverting the worker rule.

## 9. Architectural decisions (ADR log)

Decisions are recorded as they crystallise (Ambler JBGE). Current architecture-level ADRs referenced by the cart:

- **ADR-0001 -- Next.js App Router.** Adopted by the storefront; governs `/cart` as an RSC route and the `(cart)` route group.
- **ADR-0015 -- Client mutations.** Covers `useOptimistic` + `useTransition` + SWR as the mutation primitive; applies to line-level edits and to the ATC flow.
- **ADR-0016 -- State machine pattern.** Decides against a client-side cart FSM; cart mutations are request-response.
- **ADR-0017 -- Zustand for UI-coordination state.** Bounds cart's Zustand footprint to modal coordination, undo queue, and Save-for-Later session store.

**Candidate cart-specific ADRs** -- not yet written. Each will land when the corresponding decision is next defended under review (Ambler JBGE). The identifiers are reserved so that references elsewhere in the doc set resolve ahead of time; until the ADR is authored the row below is the only home for its rationale.

- **ADR-CART-01 -- `CartViewModel` as the single UI contract.** _(Not yet written.)_ Rationale for not exposing `Cart_v0_1` directly to components.
- **ADR-CART-02 -- `runCartMutation` as the shared route pattern.** _(Not yet written.)_ Rationale for the shared helper vs per-route implementations.
- **ADR-CART-03 -- Optimistic at line level, not cart level.** _(Not yet written.)_ The boundary between safe and unsafe optimism.
- **ADR-CART-04 -- Single active coupon in Wave 1.** _(Not yet written.)_ Stacking deferred pending `BFF-CART-07` coupon type information.

## 10. Risks, technical debt, and open questions

### 10.1 Risks

| ID  | Risk                                                                           | Likelihood | Impact | Mitigation                                                                                  |
| --- | ------------------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------------- |
| R1  | BFF schema uplift (Wave 2) lags storefront readiness                           | Medium     | Medium | Wave-1 fallbacks in `cartToViewModel`; each uplift item is an independent Wave-2 activation |
| R2  | `Cart_v0_1` shape drifts from assumptions during Wave-2 changes                | Medium     | Medium | Schema validation at the mapper boundary; contract tests on every BFF response              |
| R3  | Mini-cart coherence (`CM-G11`) regresses when a new mutation origin is added   | Low        | Medium | `useRevalidateMiniCart` is the only surface that knows the mini-cart SWR key                |
| R4  | Optimistic rollback rate > target due to flaky network on mobile (`CM-G12`)    | Medium     | Low    | Structural rollback; clear error surfaces; measured on real traffic in Beta                 |
| R5  | PDP `PurchaseActions` refactor to client component delays CART02               | Low        | Medium | Coordinated with Shopping Experience squad; CART02 design owns the sequencing               |
| R6  | Legacy baselines not captured before Beta gate                                 | Medium     | High   | Baseline capture starts immediately on Alpha entry; Analytics squad DRI                     |
| R7  | Trade landing page `/trade` ships late, breaking Trade Program row link target | Medium     | Low    | Feature-flag the link target; fallback placeholder                                          |

### 10.2 Technical debt

- **Analytics event schema registration.** Event schema lives in `contracts.md` but is not yet registered with the Analytics platform -- CART13 closes this.
- **Legacy basket abandonment recovery.** Not integrated; marketing systems own the recovery email path. Explicitly out of scope.

### 10.3 Open questions

Inheriting from the legacy requirements doc; carried forward until each is resolved.

1. **Free-delivery threshold exposure.** Field on `Cart_v0_1` or static config? Tracked as `BFF-CART-04`. Affects trust-signals row.
2. **Sign-in merge failure UX.** Confirm with BFF squad; `restore items` snapshot UX agreed, needs copy review.
3. **Save-for-Later cross-device.** Gated on `BFF-CART-09`; Wave 1 uses sessionStorage only.
4. **Express checkout on cart.** Figma ambiguous; confirm with Product before CART04 ships.
5. **Empty cart recommendations.** Sprint-1 placeholder vs wait for Phase 4 recommendations provider? Product decision.
6. **Inventory reservation signals on line.** Does the BFF expose remaining reservation time per line? If yes, do we show a visible timer? Default: no visible timer.

## 11. Graduation candidates

Several patterns in this design are generic across storefront domains. When a second storefront domain adopts the same pattern, lift it to `architecture/patterns/` and replace the local section here with a pointer. Do not lift speculatively -- the cart is the first domain to establish these; the second adopter is what confirms they are generic.

| Pattern                                               | Current home (this doc) | Graduate to                                                   | Trigger                                                                      |
| ----------------------------------------------------- | ----------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Module directory layout + dual barrels                | §4.2                    | `architecture/patterns/modules.md`                            | Second domain (e.g. checkout, PDP) adopts the same layout                    |
| Shared API-route helper (`runCartMutation` shape)     | §4.3                    | `architecture/patterns/api-routes.md`                         | Second domain adopts the same helper pattern                                 |
| Optimistic UI + structural rollback                   | §3.4, §5.2, §5.3        | `architecture/patterns/client-mutations.md` (extend ADR-0015) | Second domain adopts `useOptimistic` + reducer pattern                       |
| BFF-first integration (`bffClient` + generated types) | §3.2, §1.1              | `architecture/patterns/bff-integration.md`                    | Second domain adds a BFF-backed module with the same shape                   |
| `CartViewModel`-style single UI contract              | §3.5                    | `architecture/patterns/view-model-contract.md`                | Second domain adopts a mapper-then-view-model boundary                       |
| Zustand UI-coordination store pattern                 | §3.6, §4.2              | `architecture/patterns/zustand-ui-state.md` (extend ADR-0017) | Second domain adopts a Zustand store with the same boundary                  |
| Mini-cart-style revalidation bridge hook              | §4.2                    | `architecture/patterns/cross-surface-revalidation.md`         | Second domain ships a shared SWR key accessed from multiple mutation origins |

Each row is a design statement about where the pattern's authoritative home will eventually be, not a commitment to lift on any schedule.
