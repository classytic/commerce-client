# Changelog

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
