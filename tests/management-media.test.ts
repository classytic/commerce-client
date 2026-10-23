import { expect, it, vi } from 'vitest';
import { createMerchantClient } from '../src/management.js';

vi.mock('@classytic/media-transform/image/BrowserImageAdapter', () => ({ createBrowserImageAdapter: async () => ({}) }));
vi.mock('@classytic/media-transform/image/compressImageSet', () => ({ compressImageSet: async () => ({
  blob: new Blob(['primary'], { type: 'image/webp' }), format: 'webp', width: 1200, height: 1200, bytes: 7,
  derivatives: [{ name: 'medium', blob: new Blob(['medium'], { type: 'image/webp' }), format: 'webp', width: 800, height: 800, bytes: 6 }], skipped: [],
}) }));

it.each(['products', 'categories', 'collections'] as const)('uploads policy-derived WebP sizes to %s without forwarding merchant credentials to storage', async folder => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({}));
  fetch.mockResolvedValueOnce(Response.json({ version: 1, rules: [], fallback: { preset: 'ecom', derivatives: [{ name: 'medium', maxEdge: 800 }] } }));
  fetch.mockResolvedValueOnce(Response.json({ kind: 'presigned', upload: { key: 'a/photo.webp', uploadUrl: 'https://storage.test/primary' }, derivativeUploads: [{ name: 'medium', upload: { key: 'a/photo__medium.webp', uploadUrl: 'https://storage.test/medium' } }] }));
  fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
  fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
  fetch.mockResolvedValueOnce(Response.json({ _id: 'media-1', url: 'https://storage.test/primary', filename: 'photo.webp' }));
  const client = createMerchantClient({ apiUrl: 'https://api.test/api/v1', token: 'secret', organizationId: 'store-a', fetch });
  const result = await client.media.uploadImage(new File(['png-bytes'], 'photo.png', { type: 'image/png' }), folder);
  expect(result.filename).toBe('photo.webp');
  expect(JSON.parse(String(fetch.mock.calls[1]![1].body))).toMatchObject({ folder, filename: 'photo.webp', contentType: 'image/webp', derivatives: [{ name: 'medium', contentType: 'image/webp', size: 6 }] });
  for (const [, init] of fetch.mock.calls.slice(2, 4)) {
    expect(new Headers(init.headers).has('authorization')).toBe(false);
    expect(new Headers(init.headers).has('x-organization-id')).toBe(false);
    expect(new Headers(init.headers).get('content-type')).toBe('image/webp');
  }
  expect(JSON.parse(String(fetch.mock.calls[4]![1].body))).toMatchObject({ filename: 'photo.webp', originalFilename: 'photo.png', width: 1200, height: 1200, variants: [{ name: 'medium', key: 'a/photo__medium.webp', mimeType: 'image/webp', width: 800, height: 800 }] });
});

it('refuses unknown transform policies before starting an upload', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ version: 999, rules: [], fallback: { preset: 'ecom' } }));
  const client = createMerchantClient({ apiUrl: 'https://api.test/api/v1', token: 'secret', organizationId: 'store-a', fetch });
  await expect(client.media.uploadImage(new File(['png'], 'photo.png', { type: 'image/png' }))).rejects.toThrow('unsupported');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('deletes media under the captured tenant and preserves an in-use refusal', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ code: 'media.in_use', message: 'This image is used by a live product.' }, { status: 409 }));
  const client = createMerchantClient({ apiUrl: 'https://api.test/api/v1', token: 'secret', organizationId: 'store-a', fetch });
  await expect(client.media.remove({ id: 'media-1' })).rejects.toMatchObject({ status: 409 });
  const [url, init] = fetch.mock.calls[0]!;
  expect(String(url)).toBe('https://api.test/api/v1/media/media-1');
  expect(init.method).toBe('DELETE');
  expect(new Headers(init.headers).get('x-organization-id')).toBe('store-a');
  expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret');
});
