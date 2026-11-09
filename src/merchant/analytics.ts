import type { BaseApi } from "@classytic/arc-next/api";
import type {
  AnalyticsWindow,
  MerchantOverview,
  MerchantOrder,
} from "./types.js";

export function createMerchantAnalytics(orders: BaseApi<MerchantOrder>) {
  return {
    analytics: {
      async overview(
        window: AnalyticsWindow,
        options: { signal?: AbortSignal } = {},
      ): Promise<MerchantOverview> {
        const from = new Date(window.from);
        const to = new Date(window.to);
        if (
          !Number.isFinite(from.getTime()) ||
          !Number.isFinite(to.getTime()) ||
          to <= from ||
          to.getTime() - from.getTime() > 92 * 86_400_000
        )
          throw new Error(
            "Choose a valid analytics window of at most 92 days.",
          );
        const result = await orders.invokeRoute<{
          rows: Array<{ status: string; count: number; revenue: number }>;
        }>({
          method: "GET",
          path: "/aggregations/revenueByStatus",
          params: {
            "createdAt[gte]": from.toISOString(),
            "createdAt[lt]": to.toISOString(),
          },
          options,
        });
        const statuses = result.rows.map(({ status, count, revenue }) => ({
          status,
          count,
          orderValue: revenue,
        }));
        const summary = {
          totalOrders: 0,
          totalOrderValue: 0,
          fulfilledOrders: 0,
          fulfilledOrderValue: 0,
          canceledOrders: 0,
          canceledOrderValue: 0,
          averageOrderValue: 0,
        };
        for (const row of statuses) {
          summary.totalOrders += row.count;
          summary.totalOrderValue += row.orderValue;
          if (row.status === "fulfilled" || row.status === "completed") {
            summary.fulfilledOrders += row.count;
            summary.fulfilledOrderValue += row.orderValue;
          }
          if (row.status === "canceled") {
            summary.canceledOrders += row.count;
            summary.canceledOrderValue += row.orderValue;
          }
        }
        summary.averageOrderValue = summary.totalOrders
          ? Math.round(summary.totalOrderValue / summary.totalOrders)
          : 0;
        return { summary, statuses };
      },
    },
  };
}
