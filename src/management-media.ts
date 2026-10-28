import { BaseApi } from '@classytic/arc-next/api';
import type { ArcClient, ArcClientConfig } from '@classytic/arc-next/client';
import type { MediaTransformPolicy } from '@classytic/media-transform/policy';
import type { CompressImageSetResult } from '@classytic/media-transform/image/compressImageSet';
import type { MerchantMedia } from './management-types.js';

interface UploadTarget { key: string; uploadUrl: string; headers?: Record<string, string> }
type StartWrite = { kind: 'dedup'; media: MerchantMedia } | {
  kind: 'presigned'; upload: UploadTarget;
  derivativeUploads?: Array<{ name: string; upload: UploadTarget }>;
} | { kind: 'multipart' | 'resumable' };

export function createMerchantMedia(client: ArcClient, fetcher?: ArcClientConfig['fetch']) {
  const media = new BaseApi<MerchantMedia>('media', { client, basePath: '', cache: 'no-store' });
  async function put(target: UploadTarget, blob: Blob) {
    const headers = new Headers(target.headers);
    if (!headers.has('content-type')) headers.set('content-type', blob.type);
    const response = await (fetcher ?? fetch)(target.uploadUrl, { method: 'PUT', credentials: 'omit', headers, signal: AbortSignal.timeout(60_000), body: blob });
    if (!response.ok) throw new Error('Image upload failed. Please retry.');
  }
  async function upload(file: File, folder: 'products' | 'categories' | 'collections' | 'content', processed?: CompressImageSetResult, originalFilename?: string): Promise<MerchantMedia> {
    const derivatives = processed?.derivatives ?? [];
    const started = await media.request<StartWrite>('POST', `${media.baseUrl}/start-write`, { data: {
      filename: file.name, contentType: file.type, size: file.size, folder,
      ...(derivatives.length ? { derivatives: derivatives.map((item) => ({ name: item.name, contentType: item.blob.type, size: item.bytes })) } : {}),
    } });
    if (started.kind === 'dedup') return started.media;
    if (started.kind !== 'presigned') throw new Error('Choose a smaller product image for direct upload.');
    const targets = derivatives.map((derivative) => {
      const target = started.derivativeUploads?.find((item) => item.name === derivative.name)?.upload;
      if (!target) throw new Error('The server did not provide every requested image size. Please retry.');
      return { derivative, target };
    });
    await put(started.upload, file);
    await Promise.all(targets.map(({ derivative, target }) => put(target, derivative.blob)));
    const hints = processed ? (await import('@classytic/media-transform/image/uploadHints')).toUploadHints(processed) : {};
    return media.request<MerchantMedia>('POST', `${media.baseUrl}/complete-write`, { data: {
      key: started.upload.key, filename: file.name, mimeType: file.type, size: file.size,
      ...(originalFilename ? { originalFilename } : {}), ...hints,
      ...(targets.length ? { variants: targets.map(({ derivative, target }) => ({ name: derivative.name, key: target.key, mimeType: derivative.blob.type, size: derivative.bytes, width: derivative.width, height: derivative.height })) } : {}),
    } });
  }
  return {
    list: media.getAll.bind(media),
    remove: media.delete.bind(media),
    upload: (file: File, folder: 'products' | 'categories' | 'collections' | 'content' = 'products') => upload(file, folder),
    async uploadImage(file: File, folder: 'products' | 'categories' | 'collections' | 'content' = 'products'): Promise<MerchantMedia> {
      const policy = await media.request<MediaTransformPolicy>('GET', `${media.baseUrl}/transform-policy`);
      const { resolveTransformPlan, isTransformableImage } = await import('@classytic/media-transform/policy');
      if (!isTransformableImage(file.type)) throw new Error('Choose a JPEG, PNG, WebP, AVIF or BMP image that your browser can open.');
      const plan = resolveTransformPlan({ folder, mimeType: file.type, bytes: file.size }, policy);
      if (!plan.transform) {
        if (plan.outcome === 'preserve') return upload(file, folder);
        throw new Error('The image processing policy is unsupported. Refresh the dashboard before uploading.');
      }
      const [{ createBrowserImageAdapter }, { compressImageSet }, { storedFilename }] = await Promise.all([
        import('@classytic/media-transform/image/BrowserImageAdapter'),
        import('@classytic/media-transform/image/compressImageSet'),
        import('@classytic/media-transform/image/uploadHints'),
      ]);
      const adapter = await createBrowserImageAdapter();
      const result = await compressImageSet(adapter, file, plan.options).catch(() => {
        throw new Error('Your browser could not process this image. Try a JPEG or PNG copy.');
      });
      const output = new File([result.blob], storedFilename(file.name, result.format), { type: result.blob.type });
      return upload(output, folder, result, file.name);
    },
  };
}
