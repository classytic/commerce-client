import { createCrudApi } from "@classytic/arc-next/api";
import type { ArcClient } from "@classytic/arc-next/client";
import type {
  MerchantProduct,
  ProductInput,
  MerchantCategory,
  CategoryInput,
  CategoryUpdate,
  MerchantCategoryTree,
  MerchantCollection,
  CollectionInput,
  CollectionUpdate,
} from "./types.js";

export function createMerchantCatalog(client: ArcClient) {
  const config = { client, basePath: "", cache: "no-store" as const };
  const categories = createCrudApi<
    MerchantCategory,
    CategoryInput,
    CategoryUpdate
  >("categories", config);
  return {
    products: createCrudApi<
      MerchantProduct,
      ProductInput,
      Partial<ProductInput>
    >("products", config),
    categories: Object.assign(categories, {
      tree: (options: { signal?: AbortSignal } = {}) =>
        categories.invokeRoute<MerchantCategoryTree[]>({
          path: "/tree",
          options,
        }),
    }),
    collections: createCrudApi<
      MerchantCollection,
      CollectionInput,
      CollectionUpdate
    >("collections", config),
  };
}
