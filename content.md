# Structured storefront content (optional)

Import `/content` separately. The API must enable `@spinekit/cms`.

## One record per page

A `store-page` entry owns an ordered `content.sections` array. Sections are
embedded values, not referenced content records. One page saves, publishes and
loads together. Working and published copies share that record.

Supported section types are Hero, Banner, Text, Categories and Product Collection.
Owners can add, duplicate, reorder, hide and remove them. Each section has a stable
page-local `id`, `type`, optional `hidden`, and typed `data`. A page accepts 1–24
sections and at most 64 KiB of JSON content. Category and collection selections
store slugs; current products, prices and stock remain in the catalog. Image
fields reuse optimized media URLs. Hidden sections are omitted from public reads.

```ts
import { createContentClient } from '@classytic/commerce-client/content';

const content = createContentClient({
  apiUrl: 'https://store-api.brihot.com/api/v1', store: 'your-store-id',
});
const home = await content.page('home'); // one request for all published sections
for (const section of home.content.sections) {
  // Render with your component for section.type and section.data.
}
```

`page(slug)` reads `/storefront/:store/content/store-page/:slug` and returns a
`PublishedContent<StorefrontPageContent>`. It needs no bearer or organization
header. Existing `get(type, slug)` reads remain available for standalone entries.
404 means absent/unpublished; handle network and server failures separately.

## Caching

Server reads default to Next fetch `next.revalidate: 60` with a tag containing
store, template and slug (falling back to the store tag for long identifiers). `page('home', { next: { revalidate: 300 } })` overrides
the lifetime; custom `next.tags` are added to the automatic tag. An explicit
`{ cache: 'no-store' }` disables this default. Abort signals are forwarded.

Render from your storefront server to avoid individual browser section requests.
Non-Next fetch implementations may ignore `next`; configure their cache explicitly.
With Next Cache Components, wrap the server loader in `use cache` and give it an
explicit cache lifetime under that application's caching model. CMS API responses
require revalidation (`s-maxage=0`), so an upstream shared cache cannot refill a
freshly cleared storefront cache with old content. Publish does not send a webhook.
Brihot supports an optional manual refresh under Integrations. Its signed POST
uses `x-spine-timestamp` (epoch milliseconds) and `x-spine-signature` (hex
HMAC-SHA256 of `timestamp + '.' + rawBody`). Verify before parsing, reject
signatures older than five minutes, and pin the expected store on your server.
Accept `connection.test` for setup; `content.refresh` carries
`data: { store, type, slug, lang }`. Expire the matching automatic tag with
`revalidateTag(tag, { expire: 0 })`. Keep the secret server-only.

## Merchant editing

```ts
import { createMerchantContentClient } from '@classytic/commerce-client/content';
const cms = createMerchantContentClient({ apiUrl, token, organizationId });
const draft = await cms.entries.create({ data: {
  contentTypeKey: 'store-page', slug: 'home', title: 'Home',
  content: { sections: [
    { id: 'summer-hero', type: 'hero', data: { heading: 'Hello summer' } },
    { id: 'summer-picks', type: 'collection', data: {
      heading: 'Summer picks', collectionSlugs: ['summer'],
    } },
  ] },
} });
const live = await cms.action(draft, 'publish');
await cms.entries.update({ id: live._id, version: live.__v,
  data: { content: { sections: [
    { id: 'summer-hero', type: 'hero', data: { heading: 'Next week' } },
  ] } },
}); // public reads retain the previous snapshot until republication
```

Merchant operations require a store-scoped bearer and content permissions; Brihot
integration API keys have no CMS management scopes in this release. Never expose
merchant credentials in public bundles. List with `entries.getAll({ params:
{ page: 1, limit: 20 } })` and open the listed entry without a detail request.
Send its captured `__v` on edits and actions. Preserve unsaved drafts on 412 edit
or 409 publication conflicts. Archive with `archive`; restore with `unarchive`.
Template and entry keys are permanent. Existing standalone content remains valid.
