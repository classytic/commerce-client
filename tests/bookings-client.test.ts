import { afterEach, expect, it, vi } from 'vitest';
import { configureAuth, configureClient } from '@classytic/arc-next/client';
import { createStorefrontClient } from '../src/index.js';
afterEach(() => { configureAuth({ getToken: () => null, getOrgId: () => null }); configureClient({ baseUrl: '', basePath: '/api/v1' }); });
it('isolates booking reads and commands from global merchant credentials', async () => {
  configureAuth({ getToken: () => 'merchant-secret', getOrgId: () => 'other-tenant' });
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ data: [] }));
  const c = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'salon-a', fetch });
  expect(await c.bookings.services()).toEqual([]);
  await c.bookings.slots({ serviceId: '507f1f77bcf86cd799439011', from: '2026-11-01T00:00:00Z', to: '2026-11-02T00:00:00Z' });
  await c.bookings.create({ serviceId: '507f1f77bcf86cd799439011', resourceRef: 'stylist-one', startsAt: '2026-11-01T06:00:00Z', expectedPriceMinor: 65000, customer: { name: 'Demo buyer', phone: '01712345678' } }, { idempotencyKey: 'stable-booking-attempt-001' });
  const access = { id: '507f1f77bcf86cd799439012', accessToken: 'guest-booking-token' };
  await c.bookings.read(access);
  await c.bookings.cancel(access, { idempotencyKey: 'stable-booking-cancel-001' });
  expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/storefront/salon-a/bookings/services');
  expect(new URL(fetch.mock.calls[1]![0]).searchParams.get('serviceId')).toBe('507f1f77bcf86cd799439011');
  expect(new Headers(fetch.mock.calls[2]?.[1].headers).get('idempotency-key')).toBe('stable-booking-attempt-001');
  expect(new Headers(fetch.mock.calls[3]?.[1].headers).get('x-order-access')).toBe(access.accessToken);
  expect(JSON.parse(String(fetch.mock.calls[4]?.[1].body))).toEqual({});
  for (const [, init] of fetch.mock.calls) {
    expect(init.credentials).toBe('omit'); expect(init.cache).toBe('no-store');
    expect(new Headers(init.headers).has('authorization')).toBe(false);
    expect(new Headers(init.headers).has('x-organization-id')).toBe(false);
  }
});
it('requires stable booking keys and validates guest booking access before fetching', () => {
  const fetch = vi.fn(); const c = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'salon-a', fetch });
  const access = { id: '507f1f77bcf86cd799439012', accessToken: 'token' };
  expect(() => c.bookings.cancel(access, { idempotencyKey: '' })).toThrow('idempotencyKey');
  expect(() => c.bookings.read({ ...access, id: '..' })).toThrow('Booking access');
  expect(() => c.bookings.read({ ...access, accessToken: ' ' })).toThrow('Booking access');
  expect(fetch).not.toHaveBeenCalled();
});

it('preserves service pagination metadata and sends only explicit page parameters', async () => {
  const page = { data: [], page: 2, limit: 10, total: 12, pages: 2, hasNext: false };
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json(page));
  const c = createStorefrontClient({ apiUrl: 'https://api.test/api/v1', store: 'salon-a', fetch });
  expect(await c.bookings.servicesPage({ page: 2, limit: 10 })).toEqual(page);
  const url = new URL(fetch.mock.calls[0]![0]);
  expect(url.searchParams.get('page')).toBe('2');
  expect(url.searchParams.get('limit')).toBe('10');
  expect(url.searchParams.has('signal')).toBe(false);
});
