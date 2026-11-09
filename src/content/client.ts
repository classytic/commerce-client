import { BaseApi } from "@classytic/arc-next/api";
import { createClient } from "@classytic/arc-next/client";
import {
  createMerchantTransport,
  type MerchantClientOptions,
} from "../transport/merchant.js";

import type {
  ScalarContentField,
  ReferenceContentField,
  SectionContentField,
  SectionTemplate,
  SectionsContentField,
  ContentField,
  ContentTemplate,
  ContentImage,
  PageSection,
  StorefrontPageContent,
  ContentReadOptions,
  ContentInput,
  ContentEntry,
  PublishedContent,
} from "./types.js";
export type {
  ScalarContentField,
  ReferenceContentField,
  SectionContentField,
  SectionTemplate,
  SectionsContentField,
  ContentField,
  ContentTemplate,
  ContentImage,
  PageSection,
  StorefrontPageContent,
  ContentReadOptions,
  ContentInput,
  ContentEntry,
  PublishedContent,
} from "./types.js";

function segment(value: string, maxLength = 128) {
  if (value.length > maxLength || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
    throw new Error("Use a lowercase identifier with hyphens.");
  return encodeURIComponent(value);
}
/** Optional CMS surface: importing the regular commerce client loads no CMS code. */
export function createMerchantContentClient(options: MerchantClientOptions) {
  const api = new BaseApi<
    ContentEntry,
    ContentInput,
    Partial<Pick<ContentInput, "title" | "content">>
  >("content-items", {
    client: createMerchantTransport(options),
    basePath: "",
    cache: "no-store",
  });
  return {
    entries: api,
    templates: (signal?: AbortSignal) =>
      api.invokeRoute<{ data: ContentTemplate[] }>({
        method: "GET",
        path: "/templates",
        options: { signal },
      }),
    refresh: (id: string, signal?: AbortSignal) =>
      api.invokeRoute<{ refreshed: true }>({
        method: "POST",
        path: `/${encodeURIComponent(id)}/action`,
        data: { action: "refresh-storefront" },
        options: { signal },
      }),
    action: (
      entry: Pick<ContentEntry, "_id" | "__v">,
      action: "publish" | "unpublish" | "archive" | "unarchive",
      signal?: AbortSignal,
    ) =>
      api.invokeRoute<ContentEntry>({
        method: "POST",
        path: `/${encodeURIComponent(entry._id)}/action`,
        data: { action, expectedVersion: entry.__v },
        options: { signal },
      }),
  };
}
export function createContentClient(options: {
  apiUrl: string;
  store: string;
  fetch?: MerchantClientOptions["fetch"];
}) {
  const url = new URL(options.apiUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  )
    throw new Error("Use an HTTP(S) API mount without credentials.");
  const api = new BaseApi(`storefront/${segment(options.store, 200)}/content`, {
    client: createClient({
      baseUrl: url.href.replace(/\/+$/, ""),
      getToken: () => null,
      getOrgId: () => null,
      authMode: "bearer",
      credentials: "omit",
      timeoutMs: 15000,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    }),
    basePath: "",
    readAuth: "omit",
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
      options.cache === "no-store" && !options.next
        ? undefined
        : {
            revalidate: 60,
            ...options.next,
            tags: [...new Set([tag, ...(options.next?.tags ?? [])])],
          };
    return api.invokeRoute<PublishedContent<T>>({
      method: "GET",
      path: `/${segment(type, 64)}/${segment(slug)}`,
      options: { ...options, ...(next ? { next } : {}) },
    });
  }
  return {
    get,
    page: (slug: string, options?: ContentReadOptions) =>
      get<StorefrontPageContent>("store-page", slug, options),
  };
}
