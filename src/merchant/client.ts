import {
  createMerchantTransport,
  type MerchantClientOptions,
} from "../transport/merchant.js";
export type { MerchantClientOptions } from "../transport/merchant.js";
import { createMerchantCatalog } from "./catalog.js";
import { createMerchantOrders } from "./orders.js";
import { createMerchantAnalytics } from "./analytics.js";
import { createMerchantSettings } from "./settings.js";
import { createMerchantStock } from "./stock.js";
import { createMerchantCapabilities } from "./capabilities.js";
import { createMerchantDelivery } from "../delivery/merchant.js";
import { createMerchantAccess } from "./access.js";
import { createMerchantMedia } from "../media/merchant.js";

/** Capture one authenticated store; create a new instance when switching stores. */
export function createMerchantClient(options: MerchantClientOptions) {
  const client = createMerchantTransport(options);
  const { orders } = createMerchantOrders(client);
  return {
    ...createMerchantCatalog(client),
    ...createMerchantAccess(client),
    ...createMerchantStock(client),
    ...createMerchantCapabilities(client),
    ...createMerchantDelivery(client),
    ...createMerchantAnalytics(orders),
    ...createMerchantSettings(client),
    orders,
    media: createMerchantMedia(client, options.fetch),
  };
}
export type MerchantClient = ReturnType<typeof createMerchantClient>;
