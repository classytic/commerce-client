import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureAuth, configureClient } from '@classytic/arc-next/client';
import { createStorefrontClient } from '../src/index.js';
import { createMerchantClient } from '../src/management.js';
import type { DeliverySettingsUpdate } from '../src/delivery-types.js';

afterEach(() => { configureAuth({ getToken: () => null, getOrgId: () => null }); configureClient({ baseUrl: '', basePath: '/api/v1' }); });
describe('delivery client contracts', () => {
  it('quotes product selections and destination without dashboard credentials', async () => {
    configureAuth({ getToken: () => 'private', getOrgId: () => 'other' });
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ subtotalMinor: 25000, deliveryChargeMinor: 6000, currency: 'BDT' }));
    const client = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'alpha-store', fetch });
    const input = { lines: [{ productId: '507f1f77bcf86cd799439011', variantSku: 'LARGE', quantity: 1 }], areaId: 1, country: 'BD' };
    const quoted = await client.quoteDelivery(input);
    expect(quoted.deliveryChargeMinor).toBe(6000);
    await client.deliveryDistricts(); await client.deliveryAreas('Dhaka');
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/storefront/alpha-store/orders/quote');
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toEqual(input);
    expect(fetch.mock.calls[2]?.[0]).toContain('/delivery/areas?district=Dhaka');
    for (const [, init] of fetch.mock.calls) {
      expect(new Headers(init.headers).has('authorization')).toBe(false);
      expect(new Headers(init.headers).has('x-organization-id')).toBe(false);
      expect(init.credentials).toBe('omit');
      expect(init.cache).toBe('no-store');
    }
  });
  it('captures merchant scope and sends one versioned delivery update', async () => {
    const districts = [{ id: 'dhaka', name: 'Dhaka', divisionId: 'dhaka', divisionName: 'Dhaka' }];
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ data: districts }));
    const options = { apiUrl: 'https://api.test/api/v1', token: 'seller-token', organizationId: 'store-a', fetch };
    const client = createMerchantClient(options);
    options.token = 'another'; options.organizationId = 'store-b';
    expect(await client.delivery.districts()).toEqual(districts);
    const update: DeliverySettingsUpdate = { expectedVersion: 2, deliveryChargeMinor: 12000, deliveryRules: { mode: 'zones', zones: [{ name: 'Local', chargeMinor: 6000, districts: ['Dhaka'] }], freeOverMinor: 40000 } };
    await client.delivery.update(update);
    expect(fetch.mock.calls[1]?.[0]).toBe('https://api.test/api/v1/stores/delivery/current');
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1].body))).toEqual(update);
    for (const [, init] of fetch.mock.calls) {
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer seller-token');
      expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
      expect(init.credentials).toBe('omit');
    }
  });
});
