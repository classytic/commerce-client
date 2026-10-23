import { expect, it, vi } from 'vitest';
import { isArcApiError, isPreconditionFailed } from '@classytic/arc-next/client';
import { createStorefrontClient } from '../src/index.js';
import { createMerchantClient } from '../src/management.js';

it('uses isolated public collection routes and preserves the cursor and featured=false', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ data: [], next: null }));
  const client = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'store-a', fetch });
  await client.collections({ limit: 2, after: 'opaque', featured: false });
  await client.collection('summer-picks');
  expect(Object.fromEntries(new URL(fetch.mock.calls[0]![0]).searchParams)).toEqual({ limit: '2', after: 'opaque', featured: 'false' });
  expect(fetch.mock.calls[1]![0]).toBe('https://api.test/api/v1/storefront/store-a/collections/summer-picks');
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init.headers).has('authorization')).toBe(false);
    expect(new Headers(init.headers).has('x-organization-id')).toBe(false);
    expect(init.credentials).toBe('omit');
  }
  expect(() => client.collection('..')).toThrow();
});

it('uses Arc Next CRUD and captured tenant headers for collection management', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ _id: 'c1', name: 'Summer', slug: 'summer' }));
  const client = createMerchantClient({ apiUrl: 'https://api.test/api/v1', token: 'secret', organizationId: 'store-a', fetch });
  await client.collections.create({ data: { name: 'Summer', isActive: true } });
  await client.collections.update({ id: 'c1', data: { name: 'Summer edit' } });
  await client.collections.delete({ id: 'c1' });
  expect(fetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
    ['https://api.test/api/v1/collections', 'POST'], ['https://api.test/api/v1/collections/c1', 'PATCH'], ['https://api.test/api/v1/collections/c1', 'DELETE'],
  ]);
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret');
    expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
  }
});

it('sends the edited collection version and preserves canonical stale-write errors within its tenant', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({
    code: 'arc.precondition_failed',
    message: 'The collection changed since it was read.',
    status: 412,
  }, { status: 412 }));
  const client = createMerchantClient({
    apiUrl: 'https://api.test/api/v1', token: 'merchant-token', organizationId: 'store-a', fetch,
  });

  const error = await client.collections.update({
    id: 'c1', data: { name: 'Summer edit' }, version: 3,
  }).catch((failure: unknown) => failure);

  expect(isArcApiError(error)).toBe(true);
  expect(isPreconditionFailed(error)).toBe(true);
  expect(error).toMatchObject({ status: 412, code: 'arc.precondition_failed', message: 'The collection changed since it was read.' });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe('https://api.test/api/v1/collections/c1');
  expect(init.method).toBe('PATCH');
  expect(JSON.parse(String(init.body))).toEqual({ name: 'Summer edit' });
  const headers = new Headers(init.headers);
  expect(headers.get('if-match')).toBe('"3"');
  expect(headers.get('x-organization-id')).toBe('store-a');
  expect(headers.get('authorization')).toBe('Bearer merchant-token');
});
