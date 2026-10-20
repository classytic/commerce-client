import type { ArcClient } from '@classytic/arc-next/client';
import { BaseApi } from '@classytic/arc-next/api';
import type {
  ApiKeyInput,
  ApiKeyOptions,
  IntegrationProvider,
  IssuedApiKey,
  MerchantApiKey,
  MerchantIntegration,
  NotificationDelivery,
} from './management-types.js';

function key(value: string) {
  if (!value || value === '.' || value === '..')
    throw new Error('An identifier is required.');
  return encodeURIComponent(value);
}

export function createMerchantAccess(client: ArcClient) {
  const config = { client, basePath: '', cache: 'no-store' as const };
  const integrations = new BaseApi<MerchantIntegration>('integrations', config);
  const apiKeys = new BaseApi<MerchantApiKey>('auth/api-keys', config);
  const deliveries = new BaseApi<NotificationDelivery>(
    'notifications/delivery-log',
    config,
  );
  return {
    integrations: {
      catalog: (signal?: AbortSignal) =>
        integrations.request<IntegrationProvider[]>(
          'GET',
          `${integrations.baseUrl}/catalog`,
          { options: { signal } },
        ),
      list: (signal?: AbortSignal) =>
        integrations.request<MerchantIntegration[]>(
          'GET',
          integrations.baseUrl,
          { options: { signal } },
        ),
      connect: (data: {
        service: string;
        provider: string;
        label: string;
        credentials: Record<string, unknown>;
        enable: boolean;
      }) =>
        integrations.request<MerchantIntegration>(
          'POST',
          integrations.baseUrl,
          { data },
        ),
      command: (id: string, action: 'test' | 'enable' | 'disable') =>
        integrations.dispatchAction<MerchantIntegration>({
          id: key(id),
          action,
        }),
      remove: (id: string) =>
        integrations.request<null>(
          'DELETE',
          `${integrations.baseUrl}/${key(id)}`,
        ),
    },
    notifications: { list: deliveries.getAll.bind(deliveries) },
    apiKeys: {
      options: (signal?: AbortSignal) =>
        apiKeys.request<ApiKeyOptions>('GET', `${apiKeys.baseUrl}/options`, {
          options: { signal },
        }),
      list: (owner: 'me' | 'branch', signal?: AbortSignal) =>
        apiKeys.request<MerchantApiKey[]>('GET', apiKeys.baseUrl, {
          params: { owner },
          options: { signal },
        }),
      create: (data: ApiKeyInput) =>
        apiKeys.request<IssuedApiKey>('POST', apiKeys.baseUrl, { data }),
      rotate: (id: string) =>
        apiKeys.dispatchAction<IssuedApiKey>({ id: key(id), action: 'rotate' }),
      revoke: (id: string) =>
        apiKeys.dispatchAction<MerchantApiKey>({
          id: key(id),
          action: 'revoke',
        }),
    },
  };
}
