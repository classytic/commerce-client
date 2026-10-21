import { BaseApi } from '@classytic/arc-next/api';
import { createClient } from '@classytic/arc-next/client';

export type OrganizationStatus = 'pending' | 'active' | 'rejected' | 'suspended';
export type OrganizationAction = 'approve' | 'reject' | 'suspend' | 'reactivate';
export interface PlatformOrganization {
  _id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt?: string;
  statusHistory?: Array<{ status: OrganizationStatus; occurredAt: string; by?: string; note?: string }>;
}

/** Platform administration uses a bearer identity without selecting a merchant organization. */
export function createPlatformClient({ apiUrl, token }: { apiUrl: string; token: string }) {
  if (!token.trim()) throw new Error('A platform bearer token is required.');
  const url = new URL(apiUrl);
  if (url.username || url.password || url.search || url.hash) throw new Error('Use a plain API URL.');
  const client = createClient({ baseUrl: url.href.replace(/\/+$/, ''), getToken: () => token,
    credentials: 'omit', autoIdempotency: false, timeoutMs: 15000 });
  const organizations = new BaseApi<PlatformOrganization>('admin/organizations', { client, basePath: '', cache: 'no-store' });
  return {
    organizations: {
      list: organizations.getAll.bind(organizations),
      decide(id: string, data: { action: OrganizationAction; expectedStatus: OrganizationStatus; note: string }) {
        return organizations.request<PlatformOrganization>('POST', `${organizations.baseUrl}/${encodeURIComponent(id)}/action`, { data });
      },
    },
  };
}
