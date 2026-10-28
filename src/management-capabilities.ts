import type { ArcClient } from '@classytic/arc-next/client';
import { BaseApi } from '@classytic/arc-next/api';
import type { StoreCapabilities, StoreCapabilitiesUpdate } from './management-types.js';

export function createMerchantCapabilities(client: ArcClient) {
  const api = new BaseApi('stores/capabilities', { client, basePath: '', cache: 'no-store' });
  return {
    capabilities: {
      read: (signal?: AbortSignal) => api.request<StoreCapabilities>('GET', `${api.baseUrl}/current`, { options: { signal } }),
      update: (data: StoreCapabilitiesUpdate) => api.request<StoreCapabilities>('PATCH', `${api.baseUrl}/current`, { data }),
    },
  };
}
