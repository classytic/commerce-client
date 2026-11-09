import { BaseApi } from "@classytic/arc-next/api";
import type { ArcClient } from "@classytic/arc-next/client";
import type { StoreSettings } from "./types.js";

export function createMerchantSettings(client: ArcClient) {
  const stores = new BaseApi("stores", {
    client,
    basePath: "",
    cache: "no-store",
  });
  return {
    settings: {
      get: () =>
        stores.request<StoreSettings>(
          "GET",
          `${stores.baseUrl}/settings/current`,
        ),
      update: (data: {
        expectedVersion: number | null;
        deliveryChargeMinor: number;
      }) =>
        stores.invokeRoute<StoreSettings>({
          method: "PATCH",
          path: "/settings/current",
          data,
        }),
    },
  };
}
