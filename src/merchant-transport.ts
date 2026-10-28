import { createClient, type ArcClientConfig } from '@classytic/arc-next/client';

export interface MerchantClientOptions {
  apiUrl: string;
  token: string;
  organizationId: string;
  fetch?: ArcClientConfig['fetch'];
}

export function createMerchantTransport(options: MerchantClientOptions) {
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
  return client;
}
