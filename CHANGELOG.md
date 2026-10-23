# Changelog

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
