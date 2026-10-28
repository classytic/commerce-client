import { expect, it, vi } from 'vitest';
import { createMerchantClient } from '../src/management.js';

it('uses captured merchant scope, versioned updates and unwrapped capability settings', async () => {
  const data = { mode: 'products', version: 1, available: { products: true, bookings: false } };
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json(data));
  const options = { apiUrl: 'https://api.test/api/v1', token: 'seller', organizationId: 'store-a', fetch };
  const client = createMerchantClient(options);
  options.token = 'other'; options.organizationId = 'store-b';
  expect(await client.capabilities.read()).toEqual(data);
  await client.capabilities.update({ mode: 'products', expectedVersion: 1 });
  expect(JSON.parse(String(fetch.mock.calls[1]?.[1].body))).toEqual({ mode: 'products', expectedVersion: 1 });
  for (const [url, init] of fetch.mock.calls) {
    expect(url).toBe('https://api.test/api/v1/stores/capabilities/current');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer seller');
    expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
    expect(init.credentials).toBe('omit');
    expect(init.cache).toBe('no-store');
  }
});
