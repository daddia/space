---
type: Design
scope: work-package
mode: tdd
work_package: 02-add-to-cart
epic: CART02
domain: cart
version: "1.0"
owner: Cart & Checkout Squad
status: Draft
last_updated: 2026-04-23
related:
  - domain/cart/product.md
  - domain/cart/solution.md
  - domain/cart/contracts.md
  - domain/cart/backlog.md
  - work/cart/01-foundations/design.md
  - work/cart/02-add-to-cart/backlog.md
---

# Design -- PDP Add to Cart (CART02)

TDD-mode design for the **PDP Add to Cart** work package at `work/cart/02-add-to-cart/`, implementing CART02 from [`domain/cart/backlog.md`](../../../domain/cart/backlog.md).

This work package builds on the substrate CART01 shipped; domain patterns are authoritative in [`domain/cart/solution.md`](../../../domain/cart/solution.md) and are **not** repeated here. References to solution sections appear inline.

## 1. Scope

### 1.1 In scope

- `POST /api/cart/items` route handler, calling `runCartMutation` (CART01-07) with `AddCartLineSchema` and the `addLineItem` helper.
- `AddCartLineSchema` Zod schema (in `data/schemas/cart-action-schema.ts` -- scaffolded by CART01; this sprint finalises the `addLineItem` schema and ships the first concrete API route that consumes it).
- `useAddCartLine()` client hook (in `ui/hooks/`), wrapping `useTransition`, fetch, and optimistic mini-cart revalidation.
- PDP `PurchaseActions.client.tsx` conversion from stub to working client component. Coordinated with Shopping Experience squad (contract below in Section 6).
- Inline quantity control and `react-hook-form`-based quantity validation against `product.purchaseConfig`.
- Idempotency-key generation per submit (UUID v4).
- `add_to_cart` analytics event (per [`contracts.md`](../../../domain/cart/contracts.md) Section 6) fired on success.
- `add_to_cart_failed` event fired on failure with `code`.
- Success confirmation: mini-cart popover opens (per Figma). Toast fallback if mini-cart is disabled.
- Inline error surface on the PDP with retry affordance.
- Double-submission prevention (button disabled while pending).

### 1.2 Out of scope

- Cart page rendering of the newly added line -- CART03.
- Quantity editing / remove / undo -- CART03.
- Order summary and pricing card -- CART04.
- Reconciliation banner / version-conflict retry UX -- CART06.
- "Buy now" fast path (bypass cart) -- explicitly out of scope for this product cycle.
- PDP product content / gallery / description -- Shopping Experience squad.

### 1.3 Capabilities this work package delivers

Mapped to the story-level AC in [`./backlog.md`](backlog.md):

- **Add-to-cart from PDP** (in full): stories CART02-01 .. CART02-05.
- **Mini-cart refresh after mutation** (completes the foundation from CART01-08): CART02-02, CART02-05.
- **Cart mutation error handling** (for ATC error paths): CART02-03, CART02-06.
- **Cart analytics -- `add_to_cart`**: CART02-07.
- **Legacy business-rule parity for ATC** (`MAX_CART_ITEMS`, `PrMinOrderQty`, `PrForceQtyMultiplier`): CART02-02, CART02-03.
- **Idempotency**: CART02-04.

The domain-level epic context is in [`domain/cart/backlog.md`](../../../domain/cart/backlog.md).

## 2. Architecture fit

This WP plugs into the patterns established in CART01; no new patterns are introduced.

```text
PDP (RSC)
  ProductDisplay
   +-- PurchaseActions.client.tsx      <-- CART02 WIRES THIS
       |
       +-- react-hook-form (qty + purchaseConfig validation)
       +-- useAddCartLine()            <-- CART02 NEW
             |
             +-- POST /api/cart/items  <-- CART02 NEW
                   |
                   +-- runCartMutation (CART01-07)
                         |
                         +-- bffClient addLineItem (CART01-02)
                         +-- revalidateTag(CART_TAG)
             |
             +-- useRevalidateMiniCart() (CART01-08)
             +-- track('add_to_cart', ...)
       |
       +-- useCartModalStore().openModal('mini-cart-popover')   on success
       +-- inline error + retry                                  on failure
```

References in [`domain/cart/solution.md`](../../../domain/cart/solution.md):

- Section 3.1 -- server-owned cart state (why ATC is request-response, not stateful).
- Section 3.4 -- optimistic where safe: ATC is **not optimistic** at line level because the line does not exist client-side until the server confirms. The PDP surface shows a pending state while the server responds.
- Section 5.1 -- sequence diagram for add-to-cart.
- Section 7.1 -- error taxonomy.

## 3. Files and components

### 3.1 New files

```text
apps/store/src/
  app/api/cart/items/
    route.ts                               NEW  POST handler calling runCartMutation
  modules/cart/
    data/schemas/
      cart-action-schema.ts                EVOLVE  AddCartLineSchema finalised
    ui/hooks/
      use-add-cart-line.ts                 NEW  client hook for PurchaseActions
    ui/add-to-cart/
      PurchaseActions.client.tsx           REWIRE  currently a stub on PDP
      __tests__/
        PurchaseActions.spec.tsx           NEW
        use-add-cart-line.spec.ts          NEW
```

### 3.2 Files modified

- `modules/cart/client.ts` -- export `useAddCartLine`.
- `modules/cart/ui/add-to-cart/PurchaseActions.client.tsx` -- full rewire (exists today as a PDP stub; PDP renders it).

### 3.3 Files NOT modified

- `modules/cart/data/clients/bff-cart.client.ts` -- stable from CART01.
- `modules/cart/data/mappers/cart.mapper.ts` -- stable.
- `app/api/cart/_helpers/run-cart-mutation.ts` -- stable (reused verbatim per CART01-07 AC).
- `modules/cart/logic/error-messages.ts` -- stable (ATC-relevant codes already covered).

## 4. Data contracts

### 4.1 `AddCartLineSchema`

Zod schema for the POST body. Final shape in `data/schemas/cart-action-schema.ts`:

```typescript
export const AddCartLineSchema = z.object({
  sku: z.string().min(1).max(64),
  qty: z.number().int().positive().max(999),
  idempotencyKey: z.string().uuid(),
  cartVersion: z.number().int().nonnegative().optional(),
  source: z.enum(["pdp", "plp-quickview", "cart-reorder"]).default("pdp"),
});

export type AddCartLineRequest = z.infer<typeof AddCartLineSchema>;
```

Rationale:

- `sku` length bounded to the legacy Central maximum.
- `qty` upper bound 999 (defence-in-depth; legacy `MAX_CART_ITEMS = 250` enforced server-side per item via `addLineItem`).
- `idempotencyKey` UUID v4; client-generated per submit.
- `cartVersion` optional: the BFF handles the first add (no version yet) as a create-or-append.
- `source` for analytics funnel attribution.

### 4.2 `POST /api/cart/items` response

Uses the shared discriminated `CartMutationResult` from [`contracts.md`](../../../domain/cart/contracts.md) Section 4:

```typescript
// Success
{ success: true, cart: CartViewModel }

// Error
{ success: false, code: CartMutationErrorCode, message?: string, retryAfterMs?: number }
```

The route handler is a three-line call to `runCartMutation`:

```typescript
export async function POST(request: Request) {
  return runCartMutation({
    request,
    schema: AddCartLineSchema,
    runMutation: async (body, cartId) =>
      bffCart.addLineItem(cartId, {
        sku: body.sku,
        qty: body.qty,
        idempotencyKey: body.idempotencyKey,
        cartVersion: body.cartVersion,
      }),
  });
}
```

### 4.3 `useAddCartLine()` hook

Client hook returning a stable submit function plus pending / error state:

```typescript
export function useAddCartLine(): {
  addCartLine: (
    input: Omit<AddCartLineRequest, "idempotencyKey">,
  ) => Promise<CartMutationResult>;
  isPending: boolean;
  error: CartMutationErrorCode | null;
  reset: () => void;
};
```

Internals:

1. Generate `idempotencyKey = crypto.randomUUID()` per submit.
2. `startTransition(async () => ...)` wrapper for React concurrent rendering.
3. POST to `/api/cart/items` with the typed body.
4. Parse the discriminated result.
5. On success: call `useRevalidateMiniCart()`, fire `track('add_to_cart', payload)`, call `useCartModalStore.getState().openModal('mini-cart-popover')`.
6. On failure: set `error` state, fire `track('add_to_cart_failed', { code })`. Do not open the popover.

### 4.4 `PurchaseActions.client.tsx`

Contract with the PDP:

```typescript
type PurchaseActionsProps = {
  product: ProductDisplay; // consumed from Shopping Experience module
  initialQty?: number;
  className?: string;
};
```

Responsibilities:

- Renders the Add-to-cart button, quantity stepper, and any inline error surface.
- Uses `react-hook-form` with a Zod resolver bound to:
  - `qty >= product.purchaseConfig.minQuantity`
  - `qty <= product.purchaseConfig.maxQuantity`
  - `qty % product.purchaseConfig.quantityStep === 0`
- Disables the submit button while `useAddCartLine().isPending`.
- Renders `error` copy via `getCartErrorMessage(code)` from the cart module.
- Passes a Retry affordance on `NETWORK_ERROR` that re-submits with a **new** idempotency key.

## 5. Runtime view (add to cart)

Extends the generic sequence in [`domain/cart/solution.md`](../../../domain/cart/solution.md) Section 5.1 with this WP's concrete surface:

```text
Customer taps "Add to cart" on PDP (mobile)
  -> PurchaseActions.client.tsx
     form.handleSubmit
       -- zodResolver validates qty against purchaseConfig
       -- fail: inline validation message, no network call
     useAddCartLine().addCartLine({ sku, qty, source: 'pdp' })
       -- generate idempotencyKey
       -- setPending(true)
       -- fetch POST /api/cart/items
          -> runCartMutation (server)
             -- parse AddCartLineSchema (400 on invalid)
             -- bffCart.addLineItem(cartId, body)
             -- revalidateTag(CART_TAG)
             -- telemetry flush
             -> CartMutationResult
       -- parse response
  -> on success:
     -- useRevalidateMiniCart() triggers SWR mutate('/api/cart/mini')
     -- track('add_to_cart', { sku, qty, source, cart_id_hashed, cart_session_id })
     -- useCartModalStore.getState().openModal('mini-cart-popover')
     -- setPending(false)
     -- reset qty form to initial
  -> on failure:
     -- track('add_to_cart_failed', { code })
     -- setError(code)
     -- render inline error with Retry
     -- setPending(false)
```

## 6. Coordination with Shopping Experience squad

The PDP is owned by the Shopping Experience squad; the cart owns `PurchaseActions.client.tsx` (cart's module) and the route it calls.

Coordination surface:

| Interface                                              | Owner               | Notes                                                          |
| ------------------------------------------------------ | ------------------- | -------------------------------------------------------------- |
| `PurchaseActions.client.tsx` location                  | Cart & Checkout     | Lives in `modules/cart/ui/add-to-cart/`; PDP imports it        |
| `ProductDisplay` shape (consumed input)                | Shopping Experience | Stable; no changes for CART02                                  |
| PDP slot where `PurchaseActions` renders               | Shopping Experience | Existing slot in `ProductDisplay.client.tsx`; no layout change |
| `purchaseConfig` fields (`min`, `max`, `quantityStep`) | Shopping Experience | Must be present on the BFF product response; stable            |

A contract test in the Shopping Experience test suite asserts that `ProductDisplay.purchaseConfig` is present and has the three required fields. Failure blocks PDP CI, alerting the PDP squad before the cart is affected.

## 7. Error paths

`CartMutationErrorCode` coverage for this WP (copy per CART01-05):

| Code                    | PDP treatment                                                          |
| ----------------------- | ---------------------------------------------------------------------- |
| `VALIDATION_ERROR`      | Inline under qty stepper (react-hook-form already catches most)        |
| `NETWORK_ERROR`         | Inline error + Retry button; Retry generates a new idempotencyKey      |
| `OUT_OF_STOCK`          | Inline: "This item is out of stock." Hide Add-to-cart; offer PLP link  |
| `MAX_QUANTITY_EXCEEDED` | Inline: "Max qty for this item is X". Auto-adjust qty stepper to max   |
| `MIN_QUANTITY_REQUIRED` | Inline: "Min order qty is X". Auto-adjust qty stepper to min           |
| `QUANTITY_STEP_INVALID` | Auto-adjust up to next valid step; show one-time notice                |
| `CART_FULL`             | Inline: "Your cart has reached its limit (250 items)". Button disabled |
| `SESSION_EXPIRED`       | Redirect to `/signin?from=pdp&sku=...`; resume on return               |
| `VERSION_CONFLICT`      | Silent retry once inside the route; on repeat, reload cart and retry   |
| `UNKNOWN`               | Inline generic + Retry; log with full context                          |

The `SESSION_EXPIRED` redirect preserves the intended add via sessionStorage (`cart:pending-add`), consumed on post-sign-in return. 5-minute TTL, no PII beyond SKU. This scaffold lands in this WP; CART06 covers other session-expiry paths.

## 8. Observability

Per [`domain/cart/solution.md`](../../../domain/cart/solution.md) Section 7.2.

This WP adds:

- Trace span `cart.action.addLineItem` with attributes `sku`, `qty`, `source`, `idempotency_key`, `cart_version`, `error_code` (on failure), `duration_ms`.
- RED metrics under action name `addLineItem`.
- RUM custom event `cart.atc_submitted` with `source` attribute.
- Log line on every 4xx / 5xx with correlation context; no PII.

## 9. Testing strategy

| Layer                    | Scope                                                                 | Target                |
| ------------------------ | --------------------------------------------------------------------- | --------------------- |
| Unit (Vitest)            | `AddCartLineSchema`: valid / invalid / edge cases                     | 100% branches         |
| Unit (Vitest)            | `useAddCartLine`: happy path, each error path, idempotency per submit | 100% branches         |
| Route handler (Vitest)   | `POST /api/cart/items`: 200, 400 (schema), 401, 404, 409, 5xx         | Happy + every error   |
| Component (Vitest + RTL) | `PurchaseActions.client.tsx`: qty validation, disabled state, retry   | Happy + error         |
| Integration (Playwright) | Real navigation: PDP -> click ATC -> mini-cart opens                  | Phase 1 happy         |
| Integration (Playwright) | Induced error: BFF returns 409 once, succeeds on retry                | VERSION_CONFLICT path |
| Contract test            | `track('add_to_cart', payload)` matches contracts.md Section 6        | Blocks CI             |
| Accessibility (axe-core) | `PurchaseActions` + inline error states                               | Pass on PR            |

Fixtures live in `__fixtures__/purchase-actions.fixtures.ts`; msw is not used (the repo uses Vitest + `vi.mock` per CART01 convention).

## 10. Acceptance gates (Alpha subset for this WP)

- A customer on mobile and desktop can add a real product to the cart from the PDP; the mini-cart popover reflects the addition within 1 s (`CM-G11`).
- Add-to-cart success rate > 99% in dev (`CM-G08`).
- `add_to_cart` event fires on every successful click with typed payload per contracts.
- Quantity validation against `purchaseConfig` works on mobile tap and desktop keyboard entry.
- Idempotency: simulating double-click fires one cart mutation (BFF de-dupes via the key).
- axe-core passes on `PurchaseActions` including inline error states.
- `pnpm typecheck && pnpm test && pnpm lint` clean.

## 11. Handoff to CART03+

When CART02 closes, the following surface is stable for CART03 to rely on:

- `POST /api/cart/items` route -- reusable pattern; CART03 adds `PATCH` and `DELETE` on `[lineId]` subresource by the same template.
- `useAddCartLine` is exported from the client barrel.
- `PurchaseActions.client.tsx` is live on the PDP; mini-cart popover opens on success.
- Idempotency pattern proven end-to-end; CART03 reuses verbatim for update / remove.

## 12. Open questions for this WP

1. **Mini-cart popover vs toast on success.** Figma shows popover; confirm at sprint kickoff whether toast is a fallback when `useCartModalStore` has another overlay dominant.
2. **ATC button state during pending.** "Adding..." label vs spinner inside the existing button. Figma ambiguous; default: spinner inside button, label unchanged.
3. **`source` values.** Three values enumerated (`pdp`, `plp-quickview`, `cart-reorder`). PLP quickview is deferred; keep the value reserved in the enum or remove until CART quickview epic? Default: keep reserved; aids forward-compatibility.
