import type { RequestOptions } from '@classytic/arc-next/api';
import { BaseApi } from '@classytic/arc-next/api';
import { createClient } from '@classytic/arc-next/client';
import {
  createMerchantTransport,
  type MerchantClientOptions,
} from './merchant-transport.js';

export interface ScalarContentField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'image';
  required?: boolean;
  maxLength?: number;
}
export interface ReferenceContentField {
  key: string;
  label: string;
  type: 'references';
  resource: 'categories' | 'collections';
  required?: boolean;
  maxItems: number;
}
export type SectionContentField = ScalarContentField | ReferenceContentField;
export interface SectionTemplate {
  key: string;
  label: string;
  fields: readonly SectionContentField[];
}
export interface SectionsContentField {
  key: 'sections';
  label: string;
  type: 'sections';
  maxItems: number;
  sections: readonly SectionTemplate[];
}
export type ContentField = SectionContentField | SectionsContentField;
export interface ContentTemplate {
  key: string;
  label: string;
  version: number;
  fields: readonly ContentField[];
}
export interface ContentImage {
  url: string;
  alt?: string;
}
type Section<T extends string, D> = {
  id: string;
  type: T;
  hidden?: boolean;
  data: D;
};
export type PageSection =
  | Section<
      'hero',
      {
        heading: string;
        description?: string;
        image?: ContentImage | null;
        buttonLabel?: string;
        buttonHref?: string;
      }
    >
  | Section<
      'banner',
      { heading: string; image?: ContentImage | null; href?: string }
    >
  | Section<'text', { heading: string; body: string }>
  | Section<'category-grid', { heading: string; categorySlugs: string[] }>
  | Section<'collection', { heading: string; collectionSlugs: string[] }>;
export interface StorefrontPageContent {
  sections: PageSection[];
}
export type ContentReadOptions = Pick<
  RequestOptions,
  'signal' | 'cache' | 'next'
>;
export interface ContentInput {
  contentTypeKey: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
}
export interface ContentEntry extends ContentInput {
  _id: string;
  __v: number;
  status: 'draft' | 'published' | 'archived';
  publishedVersion?: number;
  publishedAt?: string;
  updatedAt: string;
}
export interface PublishedContent<T = Record<string, unknown>> {
  id: string;
  type: string;
  slug: string;
  title: string;
  content: T;
  publishedAt: string;
}
function segment(value: string, maxLength = 128) {
  if (value.length > maxLength || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
    throw new Error('Use a lowercase identifier with hyphens.');
  return encodeURIComponent(value);
}
/** Optional CMS surface: importing the regular commerce client loads no CMS code. */
export function createMerchantContentClient(options: MerchantClientOptions) {
  const api = new BaseApi<
    ContentEntry,
    ContentInput,
    Partial<Pick<ContentInput, 'title' | 'content'>>
  >('content-items', {
    client: createMerchantTransport(options),
    basePath: '',
    cache: 'no-store',
  });
  return {
    entries: api,
    templates: (signal?: AbortSignal) =>
      api.request<{ data: ContentTemplate[] }>(
        'GET',
        `${api.baseUrl}/templates`,
        { options: { signal } },
      ),
    refresh: (id: string, signal?: AbortSignal) => api.request<{ refreshed: true }>(
      'POST', `${api.baseUrl}/${encodeURIComponent(id)}/action`,
      { data: { action: 'refresh-storefront' }, options: { signal } },
    ),
    action: (
      entry: Pick<ContentEntry, '_id' | '__v'>,
      action: 'publish' | 'unpublish' | 'archive' | 'unarchive',
      signal?: AbortSignal,
    ) =>
      api.request<ContentEntry>(
        'POST',
        `${api.baseUrl}/${encodeURIComponent(entry._id)}/action`,
        { data: { action, expectedVersion: entry.__v }, options: { signal } },
      ),
  };
}
export function createContentClient(options: {
  apiUrl: string;
  store: string;
  fetch?: MerchantClientOptions['fetch'];
}) {
  const url = new URL(options.apiUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  )
    throw new Error('Use an HTTP(S) API mount without credentials.');
  const api = new BaseApi(`storefront/${segment(options.store, 200)}/content`, {
    client: createClient({
      baseUrl: url.href.replace(/\/+$/, ''),
      getToken: () => null,
      getOrgId: () => null,
      credentials: 'omit',
      timeoutMs: 15000,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    }),
    basePath: '',
  });
  const optionsStore = options.store;
  function get<T = Record<string, unknown>>(
    type: string,
    slug: string,
    options: ContentReadOptions = {},
  ) {
    const pageTag = `content:${optionsStore}:${type}:${slug}`;
    const tag = pageTag.length <= 256 ? pageTag : `content:${optionsStore}`;
    const next =
      options.cache === 'no-store' && !options.next
        ? undefined
        : {
            revalidate: 60,
            ...options.next,
            tags: [
              ...new Set([
                tag,
                ...(options.next?.tags ?? []),
              ]),
            ],
          };
    return api.request<PublishedContent<T>>(
      'GET',
      `${api.baseUrl}/${segment(type, 64)}/${segment(slug)}`,
      {
        options: { ...options, ...(next ? { next } : {}) },
      },
    );
  }
  return {
    get,
    page: (slug: string, options?: ContentReadOptions) =>
      get<StorefrontPageContent>('store-page', slug, options),
  };
}
