import type { ArcClient } from "@classytic/arc-next/client";
import { BaseApi } from "@classytic/arc-next/api";
import type { StoreCapabilities, StoreCapabilitiesUpdate } from "./types.js";

export function createMerchantCapabilities(client: ArcClient) {
  const api = new BaseApi("stores/capabilities", {
    client,
    basePath: "",
    cache: "no-store",
  });
  return {
    capabilities: {
      read: (signal?: AbortSignal) =>
        api.invokeRoute<StoreCapabilities>({
          method: "GET",
          path: "/current",
          options: { signal },
        }),
      update: (data: StoreCapabilitiesUpdate) =>
        api.invokeRoute<StoreCapabilities>({
          method: "PATCH",
          path: "/current",
          data,
        }),
    },
  };
}
