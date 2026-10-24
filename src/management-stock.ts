import type { ArcClient } from '@classytic/arc-next/client';
import { BaseApi } from '@classytic/arc-next/api';
import type { ProductStock, StockCountInput } from './management-types.js';

export function createMerchantStock(client: ArcClient) {
  const api = new BaseApi('inventory/products', { client, basePath: '', cache: 'no-store' });
  const id = (value: string) => {
    if (!/^[a-f\d]{24}$/i.test(value)) throw new Error('A product ID is required.');
    return value;
  };
  return {
    stock: {
      read: (productId: string, signal?: AbortSignal) => api.request<ProductStock>('GET', `${api.baseUrl}/${id(productId)}`, { options: { signal } }),
      async query(productIds: string[], signal?: AbortSignal) {
        if (!productIds.length) return [];
        if (productIds.length > 50) throw new Error('Read stock for at most 50 products at once.');
        const result = await api.request<{ data: ProductStock[] }>('POST', `${api.baseUrl}/query`, { data: { productIds: productIds.map(id) }, options: { signal } });
        return result.data;
      },
      setQuantity(productId: string, data: StockCountInput, idempotencyKey: string) {
        if (!idempotencyKey.trim()) throw new Error('Preserve an explicit idempotency key for stock retries.');
        return api.request<{ productId: string; quantity: number }>('POST', `${api.baseUrl}/${id(productId)}/action`, {
          data: { ...data, action: 'set_quantity' }, options: { headerOptions: { 'Idempotency-Key': idempotencyKey } },
        });
      },
    },
  };
}
