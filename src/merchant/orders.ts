import { createCrudApi } from "@classytic/arc-next/api";
import type { ArcClient } from "@classytic/arc-next/client";
import type { MerchantOrder, OrderCommand } from "./types.js";

function orderKey(value: string): string {
  if (!value || value === "." || value === "..")
    throw new Error("An order number is required.");
  return encodeURIComponent(value);
}

export function createMerchantOrders(client: ArcClient) {
  const orders = createCrudApi<MerchantOrder>("orders", {
    client,
    basePath: "",
    cache: "no-store",
  });
  return {
    orders: Object.assign(orders, {
      collect(id: string, amount: number, idempotencyKey: string) {
        if (!idempotencyKey.trim())
          throw new Error(
            "Preserve an explicit idempotencyKey for collection retries.",
          );
        return orders.dispatchAction<{
          outstanding: number;
          settled: boolean;
          transactionId?: string;
        }>({
          id: orderKey(id),
          action: "collect_payment",
          data: { amount },
          options: { headerOptions: { "Idempotency-Key": idempotencyKey } },
        });
      },
      list: orders.getAll.bind(orders),
      detail: (orderNumber: string, options: { signal?: AbortSignal } = {}) =>
        orders.getById({ id: orderKey(orderNumber), options }),
      command(id: string, command: OrderCommand, idempotencyKey: string) {
        if (!idempotencyKey.trim())
          throw new Error(
            "Preserve an explicit idempotencyKey for command retries.",
          );
        const { action, ...data } = command;
        return orders.dispatchAction<MerchantOrder>({
          id: orderKey(id),
          action,
          data,
          options: { headerOptions: { "Idempotency-Key": idempotencyKey } },
        });
      },
    }),
  };
}
