import { expect, it, vi } from 'vitest';
import { createMerchantClient } from '../src/management.js';

it('captures its tenant and bearer credential and preserves collection keys on retries', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({ settled: true, outstanding: 0 }),
  );
  const options = {
    apiUrl: 'https://api.test/api/v1',
    token: 'merchant-secret',
    organizationId: 'store-a',
    fetch,
  };
  const client = createMerchantClient(options);
  options.token = 'another-token';
  options.organizationId = 'another-store';
  await client.products.getAll();
  await client.orders.collect('order-1', 5000, 'collection-attempt');
  await client.orders.collect('order-1', 5000, 'collection-attempt');
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer merchant-secret',
    );
    expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
    expect(init.credentials).toBe('omit');
  }
  for (const [url, init] of fetch.mock.calls.slice(1)) {
    expect(url).toBe('https://api.test/api/v1/orders/order-1/action');
    expect(new Headers(init.headers).get('idempotency-key')).toBe(
      'collection-attempt',
    );
    expect(JSON.parse(String(init.body))).toEqual({
      action: 'collect_payment',
      amount: 5000,
    });
  }
  expect(() => client.orders.collect('order-1', 5000, '')).toThrow(
    /idempotencyKey/,
  );
  expect(() =>
    createMerchantClient({
      apiUrl: 'https://api.test',
      token: '',
      organizationId: 'store-a',
    }),
  ).toThrow();
});

it('keeps merchant credentials off storage uploads and confirms only after storage succeeds', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({}),
  );
  fetch.mockResolvedValueOnce(
    Response.json({
      kind: 'presigned',
      upload: {
        key: 'stores/a/image.png',
        uploadUrl: 'https://storage.test/image',
      },
    }),
  );
  fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
  fetch.mockResolvedValueOnce(
    Response.json({
      _id: 'image-1',
      url: 'https://images.test/image.png',
      filename: 'image.png',
    }),
  );
  const client = createMerchantClient({
    apiUrl: 'https://api.test/api/v1',
    token: 'merchant-secret',
    organizationId: 'store-a',
    fetch,
  });
  const file = new File(['image-bytes'], 'image.png', { type: 'image/png' });
  expect((await client.media.upload(file)).url).toBe(
    'https://images.test/image.png',
  );
  const [url, init] = fetch.mock.calls[1]!;
  expect(url).toBe('https://storage.test/image');
  expect(init.body).toBe(file);
  expect(new Headers(init.headers).has('authorization')).toBe(false);
  expect(new Headers(init.headers).has('x-organization-id')).toBe(false);
  expect(new Headers(init.headers).get('content-type')).toBe('image/png');
  expect(fetch.mock.calls[2]?.[0]).toBe(
    'https://api.test/api/v1/media/complete-write',
  );
  fetch.mockResolvedValueOnce(
    Response.json({
      kind: 'presigned',
      upload: {
        key: 'stores/a/image.png',
        uploadUrl: 'https://storage.test/image',
      },
    }),
  );
  fetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
  await expect(client.media.upload(file)).rejects.toThrow(
    'Image upload failed',
  );
  expect(fetch).toHaveBeenCalledTimes(5);
});

it('uses store-bound notification and key routes without automatic retries or persistence', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({}),
  );
  const client = createMerchantClient({
    apiUrl: 'https://api.test/api/v1',
    token: 'merchant-secret',
    organizationId: 'store-a',
    fetch,
  });
  const controller = new AbortController();
  await client.integrations.catalog(controller.signal);
  await client.integrations.list(controller.signal);
  await client.integrations.connect({
    service: 'telegram',
    provider: 'telegram-bot',
    label: 'Alerts',
    credentials: { botToken: 'secret-token', chatId: '-100123' },
    enable: true,
  });
  await client.integrations.command('connection/1', 'disable');
  await client.integrations.remove('connection/1');
  await client.notifications.list({
    params: { page: 2, limit: 20, sort: '-timestamp' },
  });
  await client.apiKeys.options(controller.signal);
  await client.apiKeys.list('branch', controller.signal);
  await client.apiKeys.create({
    kind: 'service',
    name: 'Backend',
    ceilingRole: 'admin',
    scopes: ['read:products'],
    expiresInDays: 30,
  });
  await client.apiKeys.rotate('key/1');
  await client.apiKeys.revoke('key/1');
  expect(fetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    '/api/v1/integrations/catalog',
    '/api/v1/integrations',
    '/api/v1/integrations',
    '/api/v1/integrations/connection%2F1/action',
    '/api/v1/integrations/connection%2F1',
    '/api/v1/notifications/delivery-log',
    '/api/v1/auth/api-keys/options',
    '/api/v1/auth/api-keys',
    '/api/v1/auth/api-keys',
    '/api/v1/auth/api-keys/key%2F1/action',
    '/api/v1/auth/api-keys/key%2F1/action',
  ]);
  expect(new URL(fetch.mock.calls[7]![0]).searchParams.get('owner')).toBe(
    'branch',
  );
  expect(new URL(fetch.mock.calls[5]![0]).searchParams.get('page')).toBe('2');
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer merchant-secret',
    );
    expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
    expect(init.credentials).toBe('omit');
  }
  expect(JSON.parse(String(fetch.mock.calls[9]![1].body))).toEqual({
    action: 'rotate',
  });
  fetch.mockResolvedValueOnce(
    Response.json(
      { code: 'unavailable', message: 'Unavailable' },
      { status: 503 },
    ),
  );
  await expect(
    client.apiKeys.create({
      kind: 'user',
      name: 'Backend',
      scopes: ['read:products'],
      expiresInDays: 30,
    }),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(12);
});


it('summarizes status order values without claiming delivered or collected payments', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ rows: [
    { status: 'pending', count: 2, revenue: 2500 },
    { status: 'fulfilled', count: 1, revenue: 2000 },
    { status: 'completed', count: 1, revenue: 1500 },
    { status: 'canceled', count: 1, revenue: 500 },
    { status: 'refunded', count: 1, revenue: 700 },
  ] }));
  const client = createMerchantClient({ apiUrl: 'https://api.test/api/v1', token: 'merchant-secret', organizationId: 'store-a', fetch });
  const controller = new AbortController();
  const result = await client.analytics.overview({ from: '2026-10-01T00:00:00+06:00', to: '2026-10-19T00:00:00+06:00' }, { signal: controller.signal });
  expect(result.summary).toEqual({ totalOrders: 6, totalOrderValue: 7200, fulfilledOrders: 2, fulfilledOrderValue: 3500, canceledOrders: 1, canceledOrderValue: 500, averageOrderValue: 1200 });
  expect(result.statuses.find((row) => row.status === 'refunded')).toEqual({ status: 'refunded', count: 1, orderValue: 700 });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0]!;
  const parsed = new URL(url);
  expect(parsed.pathname).toBe('/api/v1/orders/aggregations/revenueByStatus');
  expect(parsed.searchParams.get('createdAt[gte]')).toBe('2026-09-30T18:00:00.000Z');
  expect(parsed.searchParams.get('createdAt[lt]')).toBe('2026-10-18T18:00:00.000Z');
  expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
  await expect(client.analytics.overview({ from: 'invalid', to: '2026-10-19T00:00:00Z' })).rejects.toThrow(/valid analytics window/);
  await expect(client.analytics.overview({ from: '2026-01-01T00:00:00Z', to: '2026-10-19T00:00:00Z' })).rejects.toThrow(/at most 92 days/);
  expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockResolvedValueOnce(Response.json({ rows: [] }));
  const empty = await client.analytics.overview({ from: '2026-10-01T00:00:00Z', to: '2026-10-19T00:00:00Z' });
  expect(empty.summary.totalOrders).toBe(0);
  expect(empty.summary.averageOrderValue).toBe(0);
  expect(empty.statuses).toEqual([]);
});
