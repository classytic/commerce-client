# @classytic/commerce-client

`@classytic/commerce-client` calls the shared Spine storefront resources.
It exposes profile, catalog, guest checkout and order tracking. The backend must
compose those resources, as Classytic Commerce does; the ERP's older checkout endpoints have
a different contract.

Install with `npm install @classytic/commerce-client`.

Use Arc Next 0.17 or later. This entry uses its server-safe client/API subpaths;
it imports no React hooks, Next.js APIs, merchant credentials or server kernels.

```ts
import { createStorefrontClient } from '@classytic/commerce-client';
import type { GuestCheckoutInput } from '@classytic/commerce-client/types';

const shop = createStorefrontClient({
  apiUrl: 'http://localhost:4140/api/v1', // Full API mount, including its prefix.
  store: 'store-alpha',
});
const profile = await shop.profile();
const page = await shop.products({ limit: 20, category: 'mugs' });
const next = page.next ? await shop.products({ after: page.next, limit: 20, category: 'mugs' }) : null;
const categories = await shop.categories();
// category=clothing includes products assigned to its descendants.
const product = await shop.product('blue-mug');
```

Each instance captures its API mount and store. Dashboard `configureClient` and
`configureAuth` settings cannot change its routing or add credentials. Cookies
are omitted. Construct separate instances for separate stores or SSR requests.

## Checkout from a frontend cart

```ts
const input: GuestCheckoutInput = {
  lines: [{ productId: product.id, quantity: 2 }],
  customer: { name: 'Buyer', phone: '01712345678' },
  shippingAddress: { line1: 'Road 4', city: 'Dhaka', country: 'BD' },
};
// Create once for this attempt, outside any retry handler.
const idempotencyKey = crypto.randomUUID();
const placed = await shop.checkout(input, { idempotencyKey });
const status = await shop.orderStatus(placed);
```

Keep the input and key unchanged when retrying a lost response. Use a new key
when the buyer intentionally starts another order. The SDK does not generate a
fallback key. The server resolves prices, publication, variants, delivery charges
and totals. Multiple active variants require `variantSku` on each relevant line.
Do not send prices or lifecycle/payment state.

Money stays in integer minor units. Display it using the primitives money helpers;
do not assume every currency has two decimal places. This client does no pricing
arithmetic and stores no cart.

The checkout result includes an access token bound to that store and order. Keep
it privately for the buyer; the SDK puts it in `x-order-access`, never the URL.
It does not persist tokens or place them in logs. Status reads use `no-store` and
omit buyer contact/address. Shipment and delivery are fulfillment facts; delivery
alone does not establish COD collection.

## Requests and errors

Read methods accept an optional `{ signal }`; checkout takes it alongside its
required `idempotencyKey`. The client timeout defaults to 15 seconds and can be
configured with `timeoutMs`. A custom `fetch` transport is available for embedding
and tests; ordinary browser/Node consumers use the runtime's fetch.

```ts
import { isArcApiError } from '@classytic/arc-next/client';

try {
  await shop.checkout(input, { idempotencyKey });
} catch (error) {
  if (isArcApiError(error)) {
    // Inspect status/code/fieldErrors; preserve the attempt key for a retry.
    console.error(error.code, error.fieldErrors);
  }
}
```

Arc Next owns HTTP parsing, timeouts and the canonical error contract. Category
reads return the data array; product pages retain their cursor metadata.
The server remains the authority for validation;
unknown filters and extra checkout fields fail there.

Products use bounded cursor pages. Categories currently return at most 100 active
entries. Merchant catalog/order CRUD, integrations, key management and React hooks
are outside this public client.

`products({ q, category, limit, after })` searches product names literally,
case-insensitively, inside the selected store’s published catalog. Search terms
are limited to 100 characters. Pagination preserves the same search/category
filters; `next: null` marks the final page.

## Merchant dashboard and backend clients

Use the separate [`/management` entry](management.md) for authenticated products,
categories, media, order commands, store settings, Telegram connections,
notification delivery history and API keys. The root entry remains isolated for
public storefronts.

Delivery quotes accept `country` alongside `lines` and `areaId`. Send the destination
country when known so the preview applies the same country restriction as checkout.

`/category-tree` exports framework-independent `categoryNavigation` and
`categoryChoices` helpers. Public categories include `parent`, `parentPath`,
`description`, `image` and `displayOrder`; navigation omits children whose parents
are absent from the public category list.

## Storefront product filters

```ts
const featured = await shop.products({ collection: 'featured', limit: 8 });
const summerSale = await shop.products({ tag: 'summer', onSale: true, limit: 8 });
const affordable = await shop.products({ category: 'clothing', minPrice: 0, maxPrice: 100000, sort: 'price-asc' });
```

Filters combine with AND. A tag or collection matches its exact stored name.
`category` includes descendants; `q` searches product names literally. Price bounds
are inclusive integer minor units on the product's base price; variant adjustments
are not part of that range. Sort values are `newest` (default), `price-asc` and
`price-desc`. Price sorting includes products with a numeric base price.

`next` is an opaque Mongokit cursor: pass it back as `after` with the same filters
and sort. Restart pagination when filters change. Public calls always enforce the
resolved store and published/priced visibility, and reject unknown query fields.
Merchant `products.getAll({ params })` continues to use Arc's normal allowed query
syntax, including tags, collections and base-price bracket filters.
