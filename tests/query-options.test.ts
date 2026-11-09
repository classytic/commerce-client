import { QueryClient } from "@tanstack/react-query";
import { configureAuth, configureClient } from "@classytic/arc-next/client";
import { expect, it, vi } from "vitest";
import { createMerchantClient } from "../src/merchant/client.js";
import {
  createMerchantQueries,
  createContentQueries,
} from "../src/query/merchant.js";
import { createStorefrontQueries } from "../src/query/storefront.js";
import { createMerchantContentClient } from "../src/content/client.js";

it("partitions equal merchant reads by tenant and session without putting bearer secrets in keys", async () => {
  const fetch = vi.fn(async (_url: string, init: RequestInit) =>
    Response.json({
      method: "offset",
      data: [
        {
          _id: "same-id",
          name: new Headers(init.headers).get("x-organization-id"),
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
      hasNext: false,
      hasPrev: false,
    }),
  );
  const options = {
    apiUrl: "https://api.test/api/v1",
    token: "private-token",
    fetch,
  };
  const a = createMerchantQueries(
    createMerchantClient({ ...options, organizationId: "store-a" }),
    "session-one",
  );
  const b = createMerchantQueries(
    createMerchantClient({ ...options, organizationId: "store-b" }),
    "session-one",
  );
  const otherSession = createMerchantQueries(
    createMerchantClient({ ...options, organizationId: "store-a" }),
    "session-two",
  );
  const qa = a.products.list({ page: 1, limit: 20 });
  const qb = b.products.list({ page: 1, limit: 20 });
  expect(qa.queryKey).not.toEqual(qb.queryKey);
  expect(qa.queryKey).not.toEqual(
    otherSession.products.list({ page: 1, limit: 20 }).queryKey,
  );
  expect(JSON.stringify(qa.queryKey)).not.toContain("private-token");
  const cache = new QueryClient();
  const results = await Promise.all([cache.query(qa), cache.query(qb)]);
  expect(results.map((result) => result.data[0]?.name)).toEqual([
    "store-a",
    "store-b",
  ]);
  expect(
    fetch.mock.calls.every(([, init]) => init.signal instanceof AbortSignal),
  ).toBe(true);
  expect(() =>
    createMerchantQueries(
      createMerchantClient({ ...options, organizationId: "store-a" }),
      "",
    ),
  ).toThrow();
  cache.clear();
});

it("uses anonymous store-specific public keys even when the host configures cookie auth", async () => {
  configureClient({ baseUrl: "https://dashboard.test", authMode: "cookie" });
  configureAuth({
    getToken: () => "dashboard-secret",
    getOrgId: () => "dashboard-store",
  });
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({ data: [], next: null }),
  );
  const a = createStorefrontQueries({
    apiUrl: "https://api.test/api/v1",
    store: "shop-a",
    fetch,
  });
  const b = createStorefrontQueries({
    apiUrl: "https://api.test/api/v1",
    store: "shop-b",
    fetch,
  });
  expect(a.products().queryKey).not.toEqual(b.products().queryKey);
  const cache = new QueryClient();
  await cache.query(a.products());
  const [, init] = fetch.mock.calls[0]!;
  const headers = new Headers(init.headers);
  expect(headers.has("authorization")).toBe(false);
  expect(headers.has("x-organization-id")).toBe(false);
  expect(init.credentials).toBe("omit");
  expect(init.cache).not.toBe("no-store");
  cache.clear();
  configureAuth({ getToken: () => null, getOrgId: () => null });
  configureClient({ baseUrl: "https://dashboard.test", authMode: "bearer" });
});

it("keeps CMS templates cached across entry invalidations under the authenticated transport", async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({ data: [] }),
  );
  const client = createMerchantContentClient({
    apiUrl: "https://api.test/api/v1",
    token: "merchant",
    organizationId: "shop-a",
    fetch,
  });
  const queries = createContentQueries(client, "session-one");
  const cache = new QueryClient();
  await cache.query(queries.templates());
  expect(
    new Headers(fetch.mock.calls[0]![1].headers).get("x-organization-id"),
  ).toBe("shop-a");
  expect(queries.entries.partition()).toMatchObject({
    organizationId: "shop-a",
    auth: "inherit",
  });
  expect(queries.templates().queryKey[0]).not.toBe(queries.entries.keys.all[0]);
  await cache.invalidateQueries({ queryKey: queries.entries.keys.all });
  await cache.query(queries.templates());
  expect(fetch).toHaveBeenCalledTimes(1);
  cache.clear();
});
