import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureAuth, configureClient, isArcApiError } from '@classytic/arc-next/client';
import { createStorefrontClient } from '../src/index.js';
import type { GuestCheckoutInput } from '../src/types.js';

const body: GuestCheckoutInput = {
  lines: [{ productId: '507f1f77bcf86cd799439011', quantity: 2 }],
  customer: { name: 'Buyer', phone: '01712345678' },
  shippingAddress: { line1: 'Road 4', city: 'Dhaka', country: 'BD' },
};
const key = 'checkout-stable-attempt-123456';
const fetcher = () => vi.fn(async (_url: string, _init: RequestInit) => Response.json({ orderNumber: 'ORD-1', accessToken: 'guest-secret' }));

afterEach(() => {
  configureAuth({ getToken: () => null, getOrgId: () => null });
  configureClient({ baseUrl: '', basePath: '/api/v1' });
});

describe('isolated storefront client', () => {
  it('ignores dashboard routing, authorization and cookies', async () => {
    configureAuth({ getToken: () => 'dashboard-secret', getOrgId: () => 'another-store' });
    configureClient({ baseUrl: 'https://dashboard.invalid', basePath: '/private', internalApiKey: 'internal-secret' });
    const fetch = fetcher();
    const options = { apiUrl: 'https://shop-api.test/custom/v2/', store: 'store-alpha', fetch };
    const client = createStorefrontClient(options);
    options.store = 'store-beta';
    await client.profile();
    await client.products({ limit: 3, after: 'cursor', category: 'mugs', q: 'blue mug' });
    expect(fetch.mock.calls[0]?.[0]).toBe('https://shop-api.test/custom/v2/stores/store-alpha');
    const requestUrl = new URL(fetch.mock.calls[1]![0]);
    expect(requestUrl.pathname).toBe('/custom/v2/storefront/store-alpha/products');
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({ limit: '3', after: 'cursor', category: 'mugs', q: 'blue mug' });
    for (const [, init] of fetch.mock.calls) {
      const headers = new Headers(init.headers);
      expect(headers.has('authorization')).toBe(false);
      expect(headers.has('x-organization-id')).toBe(false);
      expect(headers.has('x-internal-api-key')).toBe(false);
      expect(init.credentials).toBe('omit');
    }
    expect('create' in client).toBe(false);
  });

  it('serializes public filters, including false and zero, through Arc Next', async () => {
    const fetch = fetcher();
    const client = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'store-alpha', fetch });
    await client.products({ tag: 'summer', collection: 'featured', onSale: false, minPrice: 0, maxPrice: 1000, sort: 'price-asc', after: 'opaque-cursor' });
    expect(Object.fromEntries(new URL(fetch.mock.calls[0]![0]).searchParams)).toEqual({ tag: 'summer', collection: 'featured', onSale: 'false', minPrice: '0', maxPrice: '1000', sort: 'price-asc', after: 'opaque-cursor' });
  });

  it('preserves the checkout key and body across retries', async () => {
    const fetch = fetcher();
    const client = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'store-alpha', fetch });
    await client.checkout(body, { idempotencyKey: key });
    await client.checkout(body, { idempotencyKey: key });
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetch.mock.calls) {
      expect(url).toBe('https://api.test/api/v1/storefront/store-alpha/orders');
      expect(new Headers(init.headers).get('idempotency-key')).toBe(key);
      expect(JSON.parse(String(init.body))).toEqual(body);
    }
    expect(() => client.checkout(body, { idempotencyKey: '' })).toThrow(/idempotencyKey/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps order access in its header with no-store caching', async () => {
    const fetch = fetcher();
    const client = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'store-alpha', fetch });
    await client.orderStatus({ orderNumber: 'ORD-1', accessToken: 'guest-secret' });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).not.toContain('guest-secret');
    expect(new Headers(init.headers).get('x-order-access')).toBe('guest-secret');
    expect(init.cache).toBe('no-store');
  });

  it('preserves canonical server errors through Arc Next', async () => {
    const controller = new AbortController();
    const fetch = fetcher();
    fetch.mockResolvedValueOnce(Response.json({ code: 'store.not_found', message: 'Store not found' }, { status: 404 }));
    const client = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'missing-store', fetch });
    const error = await client.profile({ signal: controller.signal }).catch((failure: unknown) => failure);
    expect(isArcApiError(error)).toBe(true);
    if (!isArcApiError(error)) throw new Error('Expected ArcApiError');
    expect(error.status).toBe(404);
    expect(error.code).toBe('store.not_found');
    expect(fetch.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
  });

  it('cancels an in-flight request through the caller signal', async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async (_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Canceled', 'AbortError')), { once: true });
    }));
    const client = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'store-alpha', fetch });
    const canceled = expect(client.profile({ signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();
    await canceled;
  });

  it('rejects unsafe configuration and path traversal before a request', () => {
    for (const apiUrl of ['file:///tmp/api', 'https://user:secret@api.test', 'https://api.test?token=secret', 'https://api.test/#fragment']) {
      expect(() => createStorefrontClient({ apiUrl, store: 'store-alpha' })).toThrow();
    }
    expect(() => createStorefrontClient({ apiUrl: 'https://api.test', store: '../other-store' })).toThrow();
    const fetch = fetcher();
    const client = createStorefrontClient({ apiUrl: 'https://api.test', store: 'store-alpha', fetch });
    expect(() => client.product('..')).toThrow();
    expect(() => client.orderStatus({ orderNumber: '..', accessToken: 'token' })).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
