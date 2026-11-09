import { createEntityQueries } from "@classytic/arc-next/query-options";
import type { MerchantClient } from "../merchant/client.js";
import type {
  MerchantProduct,
  ProductInput,
  MerchantCategory,
  CategoryInput,
  CategoryUpdate,
  MerchantCollection,
  CollectionInput,
  CollectionUpdate,
  MerchantOrder,
} from "../merchant/types.js";
import type { createMerchantContentClient } from "../content/client.js";
import type {
  ContentEntry,
  ContentInput,
  ContentTemplate,
} from "../content/types.js";

function entity(scope: string, resource: string) {
  if (!scope.trim())
    throw new Error("Provide a non-secret session cache scope.");
  return `merchant:${scope}:${resource}`;
}

/** Optional query factories; Arc Next owns identity partitions, abort signals and mutation invalidation. */
export function createMerchantQueries(client: MerchantClient, scope: string) {
  return {
    products: createEntityQueries<
      MerchantProduct,
      ProductInput,
      Partial<ProductInput>
    >(client.products, entity(scope, "products")),
    categories: createEntityQueries<
      MerchantCategory,
      CategoryInput,
      CategoryUpdate
    >(client.categories, entity(scope, "categories")),
    collections: createEntityQueries<
      MerchantCollection,
      CollectionInput,
      CollectionUpdate
    >(client.collections, entity(scope, "collections")),
    orders: createEntityQueries<MerchantOrder>(
      client.orders,
      entity(scope, "orders"),
    ),
  };
}

export function createContentQueries(
  client: ReturnType<typeof createMerchantContentClient>,
  scope: string,
) {
  const entries = createEntityQueries<
    ContentEntry,
    ContentInput,
    Partial<Pick<ContentInput, "title" | "content">>
  >(client.entries, entity(scope, "content"));
  const templates = createEntityQueries<ContentEntry>(
    client.entries,
    entity(scope, "content-templates"),
  );
  return {
    entries,
    templates: () =>
      templates.route<{ data: ContentTemplate[] }>("/templates", {
        staleTime: 60_000,
      }),
  };
}
