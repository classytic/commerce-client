import type { ArcClient } from '@classytic/arc-next/client';
import { BaseApi } from '@classytic/arc-next/api';
import type { DeliveryDistrict, DeliverySettings, DeliverySettingsUpdate } from './delivery-types.js';

export function createMerchantDelivery(client: ArcClient) {
  const api = new BaseApi('stores/delivery', { client, basePath: '', cache: 'no-store' });
  return {
    delivery: {
      read: (signal?: AbortSignal) => api.request<DeliverySettings>('GET', `${api.baseUrl}/current`, { options: { signal } }),
      update: (data: DeliverySettingsUpdate) => api.request<DeliverySettings>('PATCH', `${api.baseUrl}/current`, { data }),
      async districts(signal?: AbortSignal) {
        const result = await api.request<{ data: DeliveryDistrict[] }>('GET', `${api.baseUrl}/districts`, { options: { signal } });
        return result.data;
      },
    },
  };
}
