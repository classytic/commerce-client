import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "query-options": "src/query/merchant.ts",
    "storefront/query-options": "src/query/storefront.ts",
    index: "src/storefront/client.ts",
    types: "src/storefront/types.ts",
    management: "src/merchant/client.ts",
    "management-types": "src/merchant/types.ts",
    "delivery-types": "src/delivery/types.ts",
    "category-tree": "src/catalog/category-tree.ts",
    "booking-types": "src/bookings/types.ts",
    "merchant-bookings": "src/bookings/merchant.ts",
    content: "src/content/client.ts",
    platform: "src/platform/client.ts",
  },
  format: "esm",
  dts: true,
  clean: true,
  publint: true,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  deps: { neverBundle: true, onlyBundle: [] },
});
