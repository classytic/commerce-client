# Merchant client

Import `createMerchantClient` from `@classytic/commerce-client/management`.
Its contracts live in `/management/types`. The guest-only root entry imports
none of this authenticated surface.

```ts
import { createMerchantClient } from '@classytic/commerce-client/management';

const merchant = createMerchantClient({
  apiUrl: 'https://api.example.com/api/v1',
  token: merchantSessionToken,
  organizationId: selectedStoreId,
});
const products = await merchant.products.getAll({ params: { page: 1, limit: 20 } });
const categories = await merchant.categories.tree();
const orders = await merchant.orders.list();
```

Each instance captures one bearer credential and store. Create another instance
on session or store changes. Cookies and automatic command keys are disabled.
The server authorizes every operation; choosing a store ID grants no access.

Product/category APIs use Arc Next's typed CRUD methods. Order writes expose
only supported commands (`confirm`, `start_processing`, `ship`, `deliver`,
`cancel`) and cash collection. Generate a key once per command attempt and keep
it, its amount and its body unchanged across retries.

```ts
const key = crypto.randomUUID();
await merchant.orders.command(orderNumber, { action: 'confirm' }, key);

// After complete delivery and actual receipt of cash, with the collect permission:
const collectionKey = crypto.randomUUID();
await merchant.orders.collect(orderNumber, amountMinor, collectionKey);
```

`media.upload(file)` uses the shared start-write → storage PUT → complete-write
protocol. Merchant authorization goes to the API; the storage PUT receives only
its presigned headers and file bytes. A failed PUT does not confirm an upload.
Settings updates carry `expectedVersion`; refetch after a conflict before saving.

`integrations.catalog()` describes enabled providers and credential fields.
`integrations.connect()` stores/tests a connection for the authenticated store;
`command(id, 'test' | 'enable' | 'disable')` controls it and `remove(id)` disconnects
it. `notifications.list()` reads paginated delivery evidence. These routes may be
absent when the deployment has no notification credential encryption key.

`apiKeys.options()` returns live scope grants, ownership permissions and lifetime
bounds. Use them to construct `apiKeys.create(input)`. `apiKeys.list('me' | 'branch')`
returns safe records; `rotate(id)` returns a replacement secret and `revoke(id)`
disables one. Creation/rotation require a fresh bearer session. Store the returned
secret on your server: it is shown once, cannot be read later and should never be
placed in query caches or browser storage. These mutations have no automatic
retry; refresh the key list after an uncertain outcome before retrying.

`analytics.overview({ from, to }, { signal })` reads one store-scoped order
aggregation. Supply ISO timestamps for an inclusive start and exclusive end,
at most 92 days apart. Read the configured currency through `settings.get()`.
Amounts are integer minor units; the rounded average uses the same unit.

The summary reports order count/value, fulfilled count/value, canceled
count/value and average order value, alongside the individual status rows.
Total order value includes every status and delivery charges. Fulfilled combines
`fulfilled` and `completed`: shipment can fulfill an order before delivery.
Refunded remains a separate status. These metrics do not measure received cash
or prove delivery. Order-read permission is required, including `read:orders`
for API keys; organization IDs in query parameters cannot widen the store scope.

## Category hierarchy

`categories.tree({ signal })` returns nested categories with `children` and
`totalProductCount`. `parent` is the parent category's slug; `null` moves a category
to the top level. Slugs are permanent after creation. Omit a blank create slug to
generate it from the name; update names without resending a slug.

Import `categoryChoices` from `@classytic/commerce-client/category-tree` for
breadcrumb labels. Pass the edited slug as its second argument to exclude that
category and all its descendants from parent choices.

`media.uploadImage(file, 'categories')` optimizes a category image using the
category-folder policy. Send `image: null` to clear its reference; detached-media
cleanup follows the server's normal governance policy.

Product writes also accept `tags`, `collections` and
`defaultMonetization.pricing.compareAtPrice`. The catalog derives `onSale`; clients
never set it. Tags and collections use the existing catalog arrays, with no
additional collection-management service.


### Media library

`client.media.list({ params: { page: 1, limit: 20, folder: 'products' } })`
returns tenant-scoped media and pagination. `client.media.remove({ id })` uses
the media resource's guarded delete; an in-use image is refused by the server.

`client.media.uploadImage(file, folder)` resolves the server's transform policy
through media-transform before requesting storage writes. The server must accept
every output format in its policy, including the browser encoder's fallback.
Passthrough thresholds and dimensions belong to that policy, rather than the UI.

## Managed collections

```ts
const collection = await merchant.collections.create({ data: {
  name: 'Eid picks', // slug is generated when omitted
  description: 'Pieces for the celebrations.',
  isActive: true,
  featured: true,
  displayOrder: 10,
} });
await merchant.products.update({ id: productId, data: {
  collections: [collection.slug], // replaces this product's memberships
} });
await merchant.collections.update({ id: collection._id, data: {
  name: 'Our Eid edit', // preserves its permanent slug
} });
```

Collections use the same store-bound bearer client and Arc Next CRUD/pagination
contract as products. Create a new client when switching stores. Slug uniqueness
is per store. An unknown or foreign collection cannot be assigned. A collection
cannot be deleted until products release its slug; hide it instead when keeping
memberships. Upload cover images with `merchant.media.uploadImage(file,
'collections')` and pass `{ url, alt }` as `image`.

Existing string labels require the Brihot server's `collections:migrate` script
before switching an existing storefront to managed collection navigation. It is a
per-store dry run by default; it creates metadata without rewriting memberships.
