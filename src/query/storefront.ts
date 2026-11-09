import { BaseApi } from "@classytic/arc-next/api";
import { createEntityQueries } from "@classytic/arc-next/query-options";
import {
  createStorefrontTransport,
  type StorefrontClientOptions,
} from "../transport/storefront.js";
import type {
  StorefrontProduct,
  StorefrontProductPage,
  StorefrontProductQuery,
} from "../storefront/types.js";

/** Public catalog cache keys include the store; private guest-order reads stay outside this factory. */
export function createStorefrontQueries(options: StorefrontClientOptions) {
  const api = new BaseApi(`storefront/${encodeURIComponent(options.store)}`, {
    client: createStorefrontTransport(options),
    basePath: "",
    readAuth: "omit",
  });
  const queries = createEntityQueries(api, `storefront:${options.store}`);
  return {
    products: (params: StorefrontProductQuery = {}) =>
      queries.route<StorefrontProductPage>("/products", {
        params: { ...params },
      }),
    product: (slug: string) => {
      if (!slug || slug === "." || slug === "..")
        throw new Error("A product slug is required.");
      return queries.route<StorefrontProduct>(
        `/products/${encodeURIComponent(slug)}`,
      );
    },
  };
}
