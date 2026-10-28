import { expect, it, vi } from 'vitest';
import {
  createContentClient,
  createMerchantContentClient,
} from '../src/content.js';

it('reads public content without credentials or tenant headers', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({
      id: 'one',
      type: 'hero',
      slug: 'home',
      content: { heading: 'Hello' },
    }),
  );
  const client = createContentClient({
    apiUrl: 'https://api.test/api/v1',
    store: 'store-a',
    fetch,
  });
  const result = await client.get<{ heading: string }>('hero', 'home');
  expect(result.content.heading).toBe('Hello');
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe(
    'https://api.test/api/v1/storefront/store-a/content/hero/home',
  );
  expect(init.credentials).toBe('omit');
  expect(new Headers(init.headers).has('authorization')).toBe(false);
  expect(new Headers(init.headers).has('x-organization-id')).toBe(false);
  expect(() => client.get('hero', '../draft')).toThrow();
  expect(() =>
    createContentClient({ apiUrl: 'https://user:pass@api.test', store: 'a' }),
  ).toThrow();
});

it('uses tenant-scoped bearer CRUD and explicit publication versions', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({ _id: 'one', __v: 4 }),
  );
  const client = createMerchantContentClient({
    apiUrl: 'https://api.test/api/v1',
    organizationId: 'store-a',
    token: 'merchant',
    fetch,
  });
  await client.templates();
  await client.entries.update({
    id: 'one',
    version: 3,
    data: { title: 'Draft' },
  });
  await client.action({ _id: 'one', __v: 4 }, 'publish');
  await client.action({ _id: 'one', __v: 5 }, 'unarchive');
  expect(fetch.mock.calls[0]![0]).toBe(
    'https://api.test/api/v1/content-items/templates',
  );
  expect(new Headers(fetch.mock.calls[1]![1].headers).get('if-match')).toBe(
    '"3"',
  );
  expect(JSON.parse(String(fetch.mock.calls[2]![1].body))).toEqual({
    action: 'publish',
    expectedVersion: 4,
  });
  expect(JSON.parse(String(fetch.mock.calls[3]![1].body))).toEqual({
    action: 'unarchive',
    expectedVersion: 5,
  });
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer merchant',
    );
    expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
  }
});

it('loads an entire page once with bounded, store-specific Next caching', async () => {
  const fetch = vi.fn(
    async (
      _url: string,
      _init: RequestInit & {
        next?: { revalidate?: number | false; tags?: string[] };
      },
    ) =>
      Response.json({
        id: 'page-one',
        type: 'store-page',
        slug: 'home',
        title: 'Home',
        content: {
          sections: [
            { id: 'hero-one', type: 'hero', data: { heading: 'Summer' } },
            { id: 'banner-one', type: 'banner', data: { heading: 'Delivery' } },
          ],
        },
        publishedAt: '2026-10-26T00:00:00Z',
      }),
  );
  const one = createContentClient({
    apiUrl: 'https://api.test/api/v1',
    store: 'store-a',
    fetch,
  });
  const two = createContentClient({
    apiUrl: 'https://api.test/api/v1',
    store: 'store-b',
    fetch,
  });
  const page = await one.page('home');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(page.content.sections).toHaveLength(2);
  expect(fetch.mock.calls[0]![0]).toBe(
    'https://api.test/api/v1/storefront/store-a/content/store-page/home',
  );
  expect(fetch.mock.calls[0]![1].next).toEqual({
    revalidate: 60,
    tags: ['content:store-a:store-page:home'],
  });
  expect(fetch.mock.calls[0]![1].cache).not.toBe('no-store');
  await two.page('home', { next: { revalidate: 120, tags: ['homepage'] } });
  expect(fetch.mock.calls[1]![1].next).toEqual({
    revalidate: 120,
    tags: ['content:store-b:store-page:home', 'homepage'],
  });
  await one.page('home', { cache: 'no-store' });
  expect(fetch.mock.calls[2]![1].cache).toBe('no-store');
  expect(fetch.mock.calls[2]![1].next).toBeUndefined();
});

it('keeps automatic tags within the Next limit for long valid page identifiers', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit & { next?: { tags?: string[] } }) => Response.json({ content: { sections: [] } }));
  const store = 'a'.repeat(200), slug = 'b'.repeat(128);
  const client = createContentClient({ apiUrl: 'https://api.test/api/v1', store, fetch });
  await client.page(slug);
  expect(fetch.mock.calls[0]![1].next?.tags).toEqual([`content:${store}`]);
  expect(() => client.page('b'.repeat(129))).toThrow();
});

it('requests a tenant-authenticated manual refresh without changing the content body', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ refreshed: true }));
  const client = createMerchantContentClient({ apiUrl: 'https://api.test/api/v1', organizationId: 'store-a', token: 'test-token', fetch });
  expect(await client.refresh('entry')).toEqual({ refreshed: true });
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe('https://api.test/api/v1/content-items/entry/action');
  expect(JSON.parse(String(init.body))).toEqual({ action: 'refresh-storefront' });
  expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
});
