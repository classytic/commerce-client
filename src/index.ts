import type { DeliveryArea, DeliveryDistrict, DeliveryQuote, DeliveryQuoteInput } from './delivery-types.js';
import { BaseApi } from '@classytic/arc-next/api';
import { createClient, type ArcClientConfig } from '@classytic/arc-next/client';
import type {
  StorefrontCollection, StorefrontCollectionQuery, StorefrontCollectionPage,
  GuestCheckoutInput, GuestCheckoutOptions, GuestCheckoutResult, GuestOrderAccess,
  StorefrontCategory, StorefrontOrder, StorefrontProduct, StorefrontProductPage,
  StorefrontProductQuery, StorefrontProfile, StorefrontRequestOptions,
} from './types.js';

export interface StorefrontClientOptions {
  /** Full API mount, for example https://api.example.com/api/v1. */
  apiUrl: string;
  store: string;
  timeoutMs?: number;
  fetch?: ArcClientConfig['fetch'];
}

function segment(value: string): string {
  if (!value || value === '.' || value === '..') throw new Error('A nonempty resource identifier is required.');
  return encodeURIComponent(value);
}

/** Build an isolated guest client; never inherit dashboard credentials or global routing. */
export function createStorefrontClient(options: StorefrontClientOptions) {
  const store = options.store;
  const url = new URL(options.apiUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('apiUrl must be an HTTP(S) API mount without credentials, query or fragment.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store)) throw new Error('A valid store slug is required.');
  const client = createClient({
    baseUrl: url.href.replace(/\/+$/, ''),
    getToken: () => null, getOrgId: () => null,
    credentials: 'omit', autoIdempotency: false,
    timeoutMs: options.timeoutMs ?? 15000,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  // The full mount belongs to apiUrl; an explicit empty basePath prevents global overrides.
  const config = { client, basePath: '', cache: 'no-store' as const };
  const catalog = new BaseApi(`storefront/${segment(store)}`, config);
  const profiles = new BaseApi('stores', config);
  return {
    profile: (request: StorefrontRequestOptions = {}) => profiles.request<StorefrontProfile>(
      'GET', `${profiles.baseUrl}/${segment(store)}`, { options: request },
    ),
    products: (query: StorefrontProductQuery = {}, request: StorefrontRequestOptions = {}) => catalog.request<StorefrontProductPage>(
      'GET', `${catalog.baseUrl}/products`, { params: { ...query }, options: request },
    ),
    product: (slug: string, request: StorefrontRequestOptions = {}) => catalog.request<StorefrontProduct>(
      'GET', `${catalog.baseUrl}/products/${segment(slug)}`, { options: request },
    ),
    collections: (query: StorefrontCollectionQuery = {}, request: StorefrontRequestOptions = {}) => catalog.request<StorefrontCollectionPage>(
      'GET', `${catalog.baseUrl}/collections`, { params: { ...query }, options: request },
    ),
    collection: (slug: string, request: StorefrontRequestOptions = {}) => catalog.request<StorefrontCollection>(
      'GET', `${catalog.baseUrl}/collections/${segment(slug)}`, { options: request },
    ),
    categories: async (request: StorefrontRequestOptions = {}) => {
      const result = await catalog.request<{ data: StorefrontCategory[] }>('GET', `${catalog.baseUrl}/categories`, { options: request });
      return result.data;
    },
    deliveryDistricts: (request: StorefrontRequestOptions = {}) => catalog.request<{ requiresArea: boolean; data: DeliveryDistrict[] }>(
      'GET', `${catalog.baseUrl}/delivery/districts`, { options: request },
    ),
    deliveryAreas: (district: string, request: StorefrontRequestOptions = {}) => catalog.request<{ data: DeliveryArea[] }>(
      'GET', `${catalog.baseUrl}/delivery/areas`, { params: { district }, options: request },
    ),
    quoteDelivery: (input: DeliveryQuoteInput, request: StorefrontRequestOptions = {}) => catalog.request<DeliveryQuote>(
      'POST', `${catalog.baseUrl}/orders/quote`, { data: input, options: request },
    ),
    checkout: (input: GuestCheckoutInput, request: GuestCheckoutOptions) => {
      if (!request?.idempotencyKey?.trim()) throw new Error('idempotencyKey is required; preserve it for retries.');
      return catalog.request<GuestCheckoutResult>('POST', `${catalog.baseUrl}/orders`, {
        data: input, options: { signal: request.signal, headerOptions: { 'Idempotency-Key': request.idempotencyKey } },
      });
    },
    orderStatus: (access: GuestOrderAccess, request: StorefrontRequestOptions = {}) => catalog.request<StorefrontOrder>(
      'GET', `${catalog.baseUrl}/orders/${segment(access.orderNumber)}/status`,
      { options: { signal: request.signal, cache: 'no-store', headerOptions: { 'x-order-access': access.accessToken } } },
    ),
  };
}

export type StorefrontClient = ReturnType<typeof createStorefrontClient>;
