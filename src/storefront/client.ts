import type {
  DeliveryArea,
  DeliveryDistrict,
  DeliveryQuote,
  DeliveryQuoteInput,
} from "../delivery/types.js";
import { BaseApi } from "@classytic/arc-next/api";
import { createStorefrontBookings } from "../bookings/storefront.js";
import type {
  StorefrontCollection,
  StorefrontCollectionQuery,
  StorefrontCollectionPage,
  GuestCheckoutInput,
  GuestCheckoutOptions,
  GuestCheckoutResult,
  GuestOrderAccess,
  StorefrontCategory,
  StorefrontOrder,
  StorefrontProduct,
  StorefrontProductPage,
  StorefrontProductQuery,
  StorefrontProfile,
  StorefrontRequestOptions,
} from "./types.js";

import {
  createStorefrontTransport,
  type StorefrontClientOptions,
} from "../transport/storefront.js";
export type { StorefrontClientOptions } from "../transport/storefront.js";

function segment(value: string): string {
  if (!value || value === "." || value === "..")
    throw new Error("A nonempty resource identifier is required.");
  return encodeURIComponent(value);
}

/** Build an isolated guest client; never inherit dashboard credentials or global routing. */
export function createStorefrontClient(options: StorefrontClientOptions) {
  const store = options.store;
  const client = createStorefrontTransport(options);
  // The full mount belongs to apiUrl; an explicit empty basePath prevents global overrides.
  const config = { client, basePath: "", readAuth: "omit" as const };
  const catalog = new BaseApi(`storefront/${segment(store)}`, config);
  const profiles = new BaseApi("stores", config);
  return {
    bookings: createStorefrontBookings(catalog),
    profile: (request: StorefrontRequestOptions = {}) =>
      profiles.invokeRoute<StorefrontProfile>({
        method: "GET",
        path: `/${segment(store)}`,
        options: request,
      }),
    products: (
      query: StorefrontProductQuery = {},
      request: StorefrontRequestOptions = {},
    ) =>
      catalog.invokeRoute<StorefrontProductPage>({
        method: "GET",
        path: "/products",
        params: { ...query },
        options: request,
      }),
    product: (slug: string, request: StorefrontRequestOptions = {}) =>
      catalog.invokeRoute<StorefrontProduct>({
        method: "GET",
        path: `/products/${segment(slug)}`,
        options: request,
      }),
    collections: (
      query: StorefrontCollectionQuery = {},
      request: StorefrontRequestOptions = {},
    ) =>
      catalog.invokeRoute<StorefrontCollectionPage>({
        method: "GET",
        path: "/collections",
        params: { ...query },
        options: request,
      }),
    collection: (slug: string, request: StorefrontRequestOptions = {}) =>
      catalog.invokeRoute<StorefrontCollection>({
        method: "GET",
        path: `/collections/${segment(slug)}`,
        options: request,
      }),
    categories: async (request: StorefrontRequestOptions = {}) => {
      const result = await catalog.invokeRoute<{ data: StorefrontCategory[] }>({
        method: "GET",
        path: "/categories",
        options: request,
      });
      return result.data;
    },
    deliveryDistricts: (request: StorefrontRequestOptions = {}) =>
      catalog.invokeRoute<{ requiresArea: boolean; data: DeliveryDistrict[] }>({
        method: "GET",
        path: "/delivery/districts",
        options: { cache: "no-store", ...request },
      }),
    deliveryAreas: (district: string, request: StorefrontRequestOptions = {}) =>
      catalog.invokeRoute<{ data: DeliveryArea[] }>({
        method: "GET",
        path: "/delivery/areas",
        params: { district },
        options: { cache: "no-store", ...request },
      }),
    quoteDelivery: (
      input: DeliveryQuoteInput,
      request: StorefrontRequestOptions = {},
    ) =>
      catalog.invokeRoute<DeliveryQuote>({
        method: "POST",
        path: "/orders/quote",
        data: input,
        options: { signal: request.signal, cache: "no-store" },
      }),
    checkout: (input: GuestCheckoutInput, request: GuestCheckoutOptions) => {
      if (!request?.idempotencyKey?.trim())
        throw new Error("idempotencyKey is required; preserve it for retries.");
      return catalog.invokeRoute<GuestCheckoutResult>({
        method: "POST",
        path: "/orders",
        data: input,
        options: {
          signal: request.signal,
          cache: "no-store",
          headerOptions: { "Idempotency-Key": request.idempotencyKey },
        },
      });
    },
    orderStatus: (
      access: GuestOrderAccess,
      request: StorefrontRequestOptions = {},
    ) =>
      catalog.invokeRoute<StorefrontOrder>({
        method: "GET",
        path: `/orders/${segment(access.orderNumber)}/status`,
        options: {
          signal: request.signal,
          cache: "no-store",
          headerOptions: { "x-order-access": access.accessToken },
        },
      }),
  };
}

export type StorefrontClient = ReturnType<typeof createStorefrontClient>;
