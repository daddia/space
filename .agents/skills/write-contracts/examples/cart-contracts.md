---
type: Contracts
domain: cart
version: '1.0'
owner: Cart & Checkout Squad
status: Draft
last_updated: 2026-04-23
related:
  - domain/cart/solution.md
  - domain/cart/backlog.md
  - work/cart/01-foundations/design.md
---

# Contracts -- Cart

The stable, authoritative interfaces, types, schemas, and codes exposed by the
cart domain. This document is the single source of truth for every contract the
cart publishes to other domains, squads, and agents.

Contracts here are **declarative** (what the shape is), not **implementation**
(how it is produced — see `solution.md` and work-package design docs). Changes
are additive by default; breaking changes require explicit deprecation and
coordination with documented consumers.

## 1. BFF types

Type aliases over `@daddia/bff-client-types` generated from
`api-contracts/contracts/storefront-bff/openapi.v1.yaml`.

```typescript
// File: modules/cart/logic/types.ts
// Source: @daddia/bff-client-types (generated from storefront-bff OpenAPI spec)

import type { components } from '@daddia/bff-client-types';

// Aliases used throughout the cart module
export type BffCart = components['schemas']['Cart_v0_1'];
export type BffCartLine = components['schemas']['CartLineItem'];
export type BffCartMini = components['schemas']['CartMini_v0_1'];
export type BffCartUpdateRequest = components['schemas']['CartUpdateRequest_v0_1'];

// Example: minimal valid BffCart
const example: Partial<BffCart> = {
  id: 'cart-abc123',
  version: 1,
  lineItems: [],
  totals: { subtotal: 0, total: 0 },
};
```

## 2. View-model types

`CartViewModel` is the single data-to-UI contract produced by `cartToViewModel`.
No UI component touches `BffCart` directly.

```typescript
// File: modules/cart/logic/types.ts

export interface CartViewModel {
  id: string;
  version: number;
  isEmpty: boolean;
  totalQuantity: number;
  hasOnlyOutOfStock: boolean;
  checkoutCtaEnabled: boolean;
  lines: CartLineViewModel[];
  subtotal: string; // formatted, e.g. "$249.95"
  total: string;
  savings: string | null; // null when Wave-1-gap field absent
  freeDelivery: FreeDeliveryViewModel | null;
  coupon: CouponViewModel | null;
  notices: NoticeViewModel[];
}

export interface CartLineViewModel {
  id: string;
  name: string;
  brand: string | null; // null until BFF-CART-01 ships
  thumbnailUrl: string | null;
  pdpUrl: string | null;
  variantLabel: string | null;
  unitPrice: string;
  lineTotal: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number; // defaults to 99 when absent from BFF
  quantityStep: number; // defaults to 1 when absent
  stockState: 'in_stock' | 'low_stock' | 'out_of_stock';
  savings: string | null;
}

export interface CouponViewModel {
  code: string;
  discount: string;
  isAutoApplied: boolean;
  scope: 'single' | 'sitewide' | null;
}

export interface FreeDeliveryViewModel {
  threshold: string;
  remaining: string | null; // null until BFF-CART-04 ships
  achieved: boolean;
}

export interface NoticeViewModel {
  id: string;
  type: 'price_change' | 'out_of_stock' | 'merge_failed' | string;
  message: string;
}

// Example: non-empty cart view model
const example: CartViewModel = {
  id: 'cart-abc123',
  version: 2,
  isEmpty: false,
  totalQuantity: 2,
  hasOnlyOutOfStock: false,
  checkoutCtaEnabled: true,
  lines: [],
  subtotal: '$499.90',
  total: '$499.90',
  savings: null,
  freeDelivery: null,
  coupon: null,
  notices: [],
};
```

## 3. Error taxonomy

`CartMutationErrorCode` is the closed type every mutation returns on failure.

```typescript
// File: modules/cart/logic/types.ts

export type CartMutationErrorCode =
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT'
  | 'CART_NOT_FOUND'
  | 'LINE_NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'MAX_QUANTITY_EXCEEDED'
  | 'MIN_QUANTITY_REQUIRED'
  | 'QUANTITY_STEP_INVALID'
  | 'CART_FULL'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'COUPON_MINIMUM_NOT_MET'
  | 'COUPON_REGION'
  | 'COUPON_ALREADY_APPLIED'
  | 'PROMO_STACKING_CONFLICT'
  | 'UNKNOWN';

export type CartMutationResult =
  | { success: true; cart: CartViewModel }
  | { success: false; code: CartMutationErrorCode; message: string };

// HTTP status mapping
// VALIDATION_ERROR       → 400
// SESSION_EXPIRED        → 401
// CART_NOT_FOUND         → 404
// LINE_NOT_FOUND         → 404
// VERSION_CONFLICT       → 409
// OUT_OF_STOCK           → 409
// MAX_QUANTITY_EXCEEDED  → 409
// CART_FULL              → 409
// COUPON_*               → 422
// NETWORK_ERROR          → 500
// UNKNOWN                → 500

// Example: failed mutation result
const example: CartMutationResult = {
  success: false,
  code: 'OUT_OF_STOCK',
  message: 'This item is out of stock. Please remove it from your cart.',
};
```

## 4. Mutation request schemas

Zod schemas for every cart API route body. Co-located in
`modules/cart/data/schemas/cart-action-schema.ts`.

```typescript
// File: modules/cart/data/schemas/cart-action-schema.ts
import { z } from 'zod';

export const AddCartLineSchema = z.object({
  sku: z.string().min(1).max(64),
  qty: z.number().int().positive().max(999),
  idempotencyKey: z.string().uuid(),
  cartVersion: z.number().int().nonnegative().optional(),
  source: z.enum(['pdp', 'plp-quickview', 'cart-reorder']).default('pdp'),
});

export const UpdateCartLineSchema = z.object({
  lineId: z.string().min(1),
  qty: z.number().int().positive().max(999),
  idempotencyKey: z.string().uuid(),
  cartVersion: z.number().int().nonnegative(),
});

export const RemoveCartLineSchema = z.object({
  lineId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
  cartVersion: z.number().int().nonnegative(),
});

export const ApplyCouponSchema = z.object({
  code: z.string().min(1).max(64),
  idempotencyKey: z.string().uuid(),
  cartVersion: z.number().int().nonnegative(),
});

export const RemoveCouponSchema = z.object({
  code: z.string().min(1).max(64),
  idempotencyKey: z.string().uuid(),
  cartVersion: z.number().int().nonnegative(),
});

export type AddCartLineRequest = z.infer<typeof AddCartLineSchema>;
export type UpdateCartLineRequest = z.infer<typeof UpdateCartLineSchema>;
export type RemoveCartLineRequest = z.infer<typeof RemoveCartLineSchema>;
export type ApplyCouponRequest = z.infer<typeof ApplyCouponSchema>;
export type RemoveCouponRequest = z.infer<typeof RemoveCouponSchema>;

// Example: add-to-cart request body
const example: AddCartLineRequest = {
  sku: 'SKU-001-BLK-M',
  qty: 1,
  idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
  source: 'pdp',
};
```

## 5. API route contracts

Next.js route handlers exposed by the cart domain under `app/api/cart/`.

| Path                           | Method | Request schema         | Response shape       | Error codes                                                                                                                                                                                   |
| ------------------------------ | ------ | ---------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/cart/items`              | POST   | `AddCartLineSchema`    | `CartMutationResult` | `VALIDATION_ERROR`, `SESSION_EXPIRED`, `CART_FULL`, `OUT_OF_STOCK`, `MAX_QUANTITY_EXCEEDED`, `MIN_QUANTITY_REQUIRED`, `QUANTITY_STEP_INVALID`, `VERSION_CONFLICT`, `NETWORK_ERROR`            |
| `/api/cart/items/[lineId]`     | PATCH  | `UpdateCartLineSchema` | `CartMutationResult` | same as above minus `CART_FULL`                                                                                                                                                               |
| `/api/cart/items/[lineId]`     | DELETE | `RemoveCartLineSchema` | `CartMutationResult` | `VALIDATION_ERROR`, `SESSION_EXPIRED`, `LINE_NOT_FOUND`, `VERSION_CONFLICT`, `NETWORK_ERROR`                                                                                                  |
| `/api/cart/promo-codes`        | POST   | `ApplyCouponSchema`    | `CartMutationResult` | `VALIDATION_ERROR`, `SESSION_EXPIRED`, `COUPON_INVALID`, `COUPON_EXPIRED`, `COUPON_MINIMUM_NOT_MET`, `COUPON_REGION`, `COUPON_ALREADY_APPLIED`, `PROMO_STACKING_CONFLICT`, `VERSION_CONFLICT` |
| `/api/cart/promo-codes/[code]` | DELETE | `RemoveCouponSchema`   | `CartMutationResult` | `VALIDATION_ERROR`, `SESSION_EXPIRED`, `VERSION_CONFLICT`, `NETWORK_ERROR`                                                                                                                    |

All routes use the shared `runCartMutation` helper (see `solution.md` §4.3).
Every response is `CartMutationResult`. All bodies are validated with the Zod
schemas above before the BFF is called.

## 6. Analytics event schema

Typed payloads for every `track()` call the cart domain fires, via
`@/lib/analytics`.

```typescript
// File: modules/cart/logic/analytics.ts (types only)

interface CartEventEnvelope {
  cart_id_hashed: string; // SHA-256 of cart ID; no PII
  cart_session_id: string; // session-scoped correlation ID
  items_count: number;
  subtotal_aud: number; // raw AUD value, not formatted string
}

interface AddToCartPayload extends CartEventEnvelope {
  sku: string;
  qty: number;
  source: 'pdp' | 'plp-quickview' | 'cart-reorder';
}

interface UpdateCartQuantityPayload extends CartEventEnvelope {
  line_id: string;
  old_qty: number;
  new_qty: number;
}

interface RemoveFromCartPayload extends CartEventEnvelope {
  line_id: string;
  sku: string;
  qty: number;
}

interface CouponPayload extends CartEventEnvelope {
  coupon_code_hashed: string; // first 4 chars + SHA-256; no full code logged
}

interface CouponFailedPayload extends CartEventEnvelope {
  code: CartMutationErrorCode;
}

// Events fired by the cart domain
// 'add_to_cart'           — on successful add; payload: AddToCartPayload
// 'add_to_cart_failed'    — on failed add; payload: { code: CartMutationErrorCode }
// 'view_cart'             — on cart page load; payload: CartEventEnvelope
// 'update_cart_quantity'  — on quantity change; payload: UpdateCartQuantityPayload
// 'remove_from_cart'      — on line remove; payload: RemoveFromCartPayload
// 'coupon_applied'        — on promo apply success; payload: CouponPayload
// 'coupon_failed'         — on promo apply failure; payload: CouponFailedPayload
// 'coupon_removed'        — on promo remove; payload: CouponPayload
// 'begin_checkout'        — on "Proceed to Checkout" click; payload: CartEventEnvelope
// 'trade_program_click'   — on Trade Program row click; payload: CartEventEnvelope

// Example
track('add_to_cart', {
  cart_id_hashed: 'a3f8b2…',
  cart_session_id: 'sess-xyz',
  items_count: 1,
  subtotal_aud: 249.95,
  sku: 'SKU-001-BLK-M',
  qty: 1,
  source: 'pdp',
} satisfies AddToCartPayload);
```

## 7. Cache tags and directives

```typescript
// File: modules/cart/data/cache/cache-tags.ts

export const CART_TAG = 'cart-v1' as const;
export const CHECKOUT_TAG = 'checkout-v1' as const;

// Usage: revalidateTag(CART_TAG) inside runCartMutation after every
// successful mutation. This invalidates any RSC that called getCart().

// Route cache directives
// /cart page          → Cache-Control: no-store (via lib/security/config.ts checkoutRoutes)
// /api/cart/*         → Cache-Control: no-store (same classification)
// /api/cart/mini      → Cache-Control: no-store + SWR revalidation via useRevalidateMiniCart()
```
