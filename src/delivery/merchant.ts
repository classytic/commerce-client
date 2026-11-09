import type { ArcClient } from "@classytic/arc-next/client";
import { BaseApi } from "@classytic/arc-next/api";
import type {
  DeliveryDistrict,
  DeliverySettings,
  DeliverySettingsUpdate,
} from "./types.js";

export function createMerchantDelivery(client: ArcClient) {
  const api = new BaseApi("stores/delivery", {
    client,
    basePath: "",
    cache: "no-store",
  });
  return {
    delivery: {
      read: (signal?: AbortSignal) =>
        api.invokeRoute<DeliverySettings>({
          method: "GET",
          path: "/current",
          options: { signal },
        }),
      update: (data: DeliverySettingsUpdate) =>
        api.invokeRoute<DeliverySettings>({
          method: "PATCH",
          path: "/current",
          data,
        }),
      async districts(signal?: AbortSignal) {
        const result = await api.invokeRoute<{ data: DeliveryDistrict[] }>({
          method: "GET",
          path: "/districts",
          options: { signal },
        });
        return result.data;
      },
    },
  };
}
