# Booking storefronts and merchant management

Booking is optional. Brihot deployments enable it with `BOOKINGS_ENABLED=true`;
store owners then select Bookings or Products and bookings in Store settings.
A retail-only deployment does not load the reservation module.

## Storefront

```ts
import { createStorefrontClient } from '@classytic/commerce-client';
const store = createStorefrontClient({ apiUrl, store: 'your-store' });
const services = await store.bookings.services();
const slots = await store.bookings.slots({ serviceId, from, to });
const booking = await store.bookings.create(input, { idempotencyKey: attemptKey });
await store.bookings.read(booking);
await store.bookings.cancel(booking, { idempotencyKey: cancellationKey });
```

`services()` returns one page's items (default 20). Pass `page` and `limit` (1–100),
or use `servicesPage({ page: 1, limit: 20 })` for `total`, `pages` and `hasNext`.
Fetch subsequent pages on demand. Service responses include their slug and explicit
payment mode; Brihot's pay-at-venue checkout accepts `none` and `pay_later`.

Keep the same key and payload when retrying an uncertain result. Availability is
server-authoritative and may change between reading slots and confirming. Guest
access tokens are credentials: do not put them in URLs, analytics or logs. They
are separate from merchant credentials. Slots and bookings use `cache: no-store`.

## Merchant management (server or authenticated merchant portal only)

```ts
import { createMerchantBookingsClient } from '@classytic/commerce-client/merchant-bookings';
const manager = createMerchantBookingsClient({ apiUrl, token, organizationId });
const services = await manager.services.getAll({
  params: { productType: 'service', page: 1, limit: 20 },
});
const resources = await manager.resources.getAll({ params: { page: 1, limit: 20 } });
await manager.resources.setSchedule(resourceId, {
  weekly: [{ dayOfWeek: 1, startMinute: 600, endMinute: 1200 }],
  exceptions: [{ date: '2026-12-16', windows: [] }], currentResource.__v);
const bookings = await manager.bookings.getAll({ params: { page: 1, limit: 20 } });
// Offer only operations included in a row's permittedActions.
await manager.bookings.action(bookingId, 'check_in', operationKey);
```

Each manager captures one organization and token; recreate it when switching
stores. Services are catalog products with `productType: 'service'`,
`inventory.stockTracked: false`, `shipping.requiresShipping: false`, and
`typeData: { durationMinutes, paymentMode: 'pay_later' }`. Money uses integer minor
units. Prices, duration and staff eligibility are validated again by the API.
The initial Brihot UI supports one customer per exclusive resource, one service
per appointment and payment at the venue. Completing a visit does not record a
payment. Deposits, online payment collection and rescheduling are outside this
interface. The reservation engine remains reusable for broader hosts.

See the salon example under `verticals/commerce-platform/examples/salon` in the
commerce repository for a Fluid slot-picker storefront.

Managed resource edits use Arc ETags: pass `version: resource.__v` to
`resources.update`, then use the returned `__v` for `setSchedule`. A stale editor
is rejected; reopen it before replacing working hours.
