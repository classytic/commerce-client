# Changelog

## 0.4.0 — 2026-10-29

### Booking management

- ⚠ `@classytic/primitives` is now a REQUIRED peer (`>=0.35.0`) instead of a bundled dependency, so Money types keep one identity across clients and apps. Install it in the host.
- Dev toolchain: TypeScript `~7.0.2` with tsdown `^0.23.3` (no beta compiler or overrides needed any more).

- Add optional `./merchant-bookings` entry for scoped service, resource schedule and server-permitted booking operations.
- Document the pay-at-venue storefront and merchant contracts in `booking.md`.


### Content

- Add merchant content.refresh(id) for explicitly refreshing a configured storefront cache.

Add typed `page(slug)` reads for embedded page sections and explicit Next cache
options, with a store-specific tag and bounded default revalidation.

Add optional `/content` clients for tenant-scoped draft editing and versioned
publication, and credential-free published content reads.

Add optional nullable `bannerImage` to merchant and storefront categories.

Preserve merchant variant `skuRef` on edits and expose exact `variantExclusions`
for deletion without regeneration. Disabling remains a separate reversible edit.

Add scoped `client.capabilities.read/update` with typed deployment availability,
store modes and versioned writes. Keep server configuration dependencies outside
browser entry points.

## 0.3.0 — 2026-10-24

Add merchant `stock.read`, batched `stock.query` and guarded `stock.setQuantity` over Arc Next, product stock-tracking input and public per-variant availability types. Count retries require an explicit stable key. Browser bundles remain independent of server kernels.

## 0.2.0 — 2026-10-23

Add typed merchant collection CRUD and public collection list/detail methods with
cursor pagination over Arc Next. Add the collections media folder. Browser
entry points remain independent of React, MongoDB and server domain packages.

Dependencies are already at the latest published (`arc-next` 0.18.0, `media-transform` 0.3.0, `primitives` 0.34.0). Dev toolchain: `typescript@7.1.0-beta`, which tsdown 0.23.2 needs to emit declarations with TypeScript 7.

## 0.1.1 — 2026-10-20

Add tenant-scoped media removal through the guarded media resource, and type media folder, size and display metadata for Fluid library bindings. Report unsupported source formats and browser decoding failures before starting storage writes.

Add `@classytic/commerce-client/platform`: `createPlatformClient({ apiUrl, token })` for platform administration with a bearer token and no merchant organization. `organizations.list` pages organizations and `organizations.decide(id, { action, expectedStatus, note })` applies an approve, reject, suspend or reactivate decision (matches `@spinekit/auth` 0.17.0 `./organizations`).

Dependencies are already at the latest published (`arc-next` 0.18.0, `media-transform` 0.3.0, `primitives` 0.34.0).

## 0.1.0 — 2026-10-20

First publish.

Expose storefront tag/collection/sale/price/sort queries and public taxonomy/compare-at prices; type merchant taxonomy and compare-at writes.

Add typed category trees, hierarchy choices, parent/description/image fields and category image uploads. Category updates exclude immutable slugs.

API-key lifetime options expose optional non-expiry support; creation accepts explicit `expiresInDays: null`.

Delivery quote inputs include destination country; the storefront sends it when requesting prices.

Add a bounded store sales overview and tenant-scoped delivery settings. Public storefront clients can load delivery districts/areas and request server-priced delivery quotes without merchant credentials.

Typed store profiles, catalog reads, guest checkout with explicit retry keys, and private order tracking.

The isolated `/management` entry supports merchant catalog/media, order commands
and cash collection, store settings, Telegram connections and delivery history,
plus API-key options, creation, rotation and revocation.

Platform administration: `./platform` exposes bearer-only organization lists and guarded status decisions without requiring a merchant organization.
