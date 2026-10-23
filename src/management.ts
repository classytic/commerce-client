import { BaseApi } from '@classytic/arc-next/api';
import { createClient, type ArcClientConfig } from '@classytic/arc-next/client';
import { createMerchantDelivery } from './management-delivery.js';
import { createMerchantAccess } from './management-access.js';
import { createMerchantMedia } from './management-media.js';
import type {
  CollectionInput,
  CollectionUpdate,
  MerchantCollection,
  AnalyticsWindow,
  MerchantOverview,
  CategoryInput,
  CategoryUpdate,
  MerchantCategoryTree,
  MerchantCategory,
  MerchantOrder,
  MerchantProduct,
  OrderCommand,
  ProductInput,
  StoreSettings,
} from './management-types.js';

export interface MerchantClientOptions {
  apiUrl: string;
  token: string;
  organizationId: string;
  fetch?: ArcClientConfig['fetch'];
}

function orderKey(value: string): string {
  if (!value || value === '.' || value === '..')
    throw new Error('An order number is required.');
  return encodeURIComponent(value);
}

/** Capture one authenticated store; callers create a new instance when switching stores. */
export function createMerchantClient(options: MerchantClientOptions) {
  const { token, organizationId, fetch: fetcher } = options;
  const url = new URL(options.apiUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('A valid HTTP(S) API mount is required.');
  if (!token.trim() || !organizationId.trim())
    throw new Error('A bearer token and organizationId are required.');
  const client = createClient({
    baseUrl: url.href.replace(/\/+$/, ''),
    getToken: () => token,
    getOrgId: () => organizationId,
    credentials: 'omit',
    autoIdempotency: false,
    timeoutMs: 15000,
    ...(fetcher ? { fetch: fetcher } : {}),
  });
  const config = { client, basePath: '', cache: 'no-store' as const };
  const products = new BaseApi<
    MerchantProduct,
    ProductInput,
    Partial<ProductInput>
  >('products', config);
  const categories = new BaseApi<
    MerchantCategory,
    CategoryInput,
    CategoryUpdate
  >('categories', config);
  const orders = new BaseApi<MerchantOrder>('orders', config);
  const stores = new BaseApi('stores', config);
  return {
    ...createMerchantAccess(client),
    ...createMerchantDelivery(client),
    products,
    collections: new BaseApi<MerchantCollection, CollectionInput, CollectionUpdate>('collections', config),
    categories: Object.assign(categories, {
      tree: (options: { signal?: AbortSignal } = {}) => categories.request<MerchantCategoryTree[]>(
        'GET', `${categories.baseUrl}/tree`, { options },
      ),
    }),
    analytics: {
      async overview(window: AnalyticsWindow, options: { signal?: AbortSignal } = {}): Promise<MerchantOverview> {
        const from = new Date(window.from);
        const to = new Date(window.to);
        if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from || to.getTime() - from.getTime() > 92 * 86_400_000)
          throw new Error('Choose a valid analytics window of at most 92 days.');
        const result = await orders.request<{ rows: Array<{ status: string; count: number; revenue: number }> }>(
          'GET', `${orders.baseUrl}/aggregations/revenueByStatus`, {
            params: { 'createdAt[gte]': from.toISOString(), 'createdAt[lt]': to.toISOString() },
            options,
          },
        );
        const statuses = result.rows.map(({ status, count, revenue }) => ({ status, count, orderValue: revenue }));
        const summary = { totalOrders: 0, totalOrderValue: 0, fulfilledOrders: 0, fulfilledOrderValue: 0, canceledOrders: 0, canceledOrderValue: 0, averageOrderValue: 0 };
        for (const row of statuses) {
          summary.totalOrders += row.count;
          summary.totalOrderValue += row.orderValue;
          if (row.status === 'fulfilled' || row.status === 'completed') {
            summary.fulfilledOrders += row.count;
            summary.fulfilledOrderValue += row.orderValue;
          }
          if (row.status === 'canceled') {
            summary.canceledOrders += row.count;
            summary.canceledOrderValue += row.orderValue;
          }
        }
        summary.averageOrderValue = summary.totalOrders ? Math.round(summary.totalOrderValue / summary.totalOrders) : 0;
        return { summary, statuses };
      },
    },
    orders: {
      collect(id: string, amount: number, idempotencyKey: string) {
        if (!idempotencyKey.trim())
          throw new Error(
            'Preserve an explicit idempotencyKey for collection retries.',
          );
        return orders.dispatchAction<{
          outstanding: number;
          settled: boolean;
          transactionId?: string;
        }>({
          id: orderKey(id),
          action: 'collect_payment',
          data: { amount },
          options: { headerOptions: { 'Idempotency-Key': idempotencyKey } },
        });
      },
      list: orders.getAll.bind(orders),
      detail: (orderNumber: string, options: { signal?: AbortSignal } = {}) =>
        orders.getById({ id: orderKey(orderNumber), options }),
      command(id: string, command: OrderCommand, idempotencyKey: string) {
        if (!idempotencyKey.trim())
          throw new Error(
            'Preserve an explicit idempotencyKey for command retries.',
          );
        const { action, ...data } = command;
        return orders.dispatchAction<MerchantOrder>({
          id: orderKey(id),
          action,
          data,
          options: { headerOptions: { 'Idempotency-Key': idempotencyKey } },
        });
      },
    },
    settings: {
      get: () =>
        stores.request<StoreSettings>(
          'GET',
          `${stores.baseUrl}/settings/current`,
        ),
      update: (data: {
        expectedVersion: number | null;
        deliveryChargeMinor: number;
      }) =>
        stores.request<StoreSettings>(
          'PATCH',
          `${stores.baseUrl}/settings/current`,
          { data },
        ),
    },
    media: createMerchantMedia(client, fetcher),
  };
}
export type MerchantClient = ReturnType<typeof createMerchantClient>;
